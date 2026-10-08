import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from contextlib import asynccontextmanager

from backend.app.config import settings, DATA_DIR
from backend.app.database import init_db
from backend.app.api.routes import router as api_router, ws_manager
from backend.app.system.monitor import system_monitor
from backend.app.notifications.engine import notification_engine
from backend.app.voice.service import voice_service

background_task = None

async def system_telemetry_loop():
    """Background loop broadcasting live real hardware stats over WebSockets."""
    while True:
        try:
            metrics = system_monitor.get_current_metrics()
            await ws_manager.broadcast({
                "type": "telemetry_update",
                "metrics": metrics
            })
            await asyncio.sleep(2)
        except asyncio.CancelledError:
            break
        except Exception as e:
            await asyncio.sleep(3)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("=" * 60)
    print("⚡ J.A.R.V.I.S. Neural Core Initializing...")
    init_db()
    print("✓ SQLite Database Connected & Migrations Synced")
    print(f"✓ Real Hardware Telemetry Active ({system_monitor.os_type})")
    print("✓ Command Execution Security Matrix Active")
    print("✓ Intelligent Notification Engine Active")
    print(f"⚡ J.A.R.V.I.S. ONLINE. Interface: http://{settings.HOST}:{settings.PORT}")
    print("=" * 60)

    # Start Native System-Wide Background Voice Listener
    from backend.app.voice.listener import native_voice_listener
    loop = asyncio.get_running_loop()

    def on_voice_cmd(data):
        asyncio.run_coroutine_threadsafe(
            ws_manager.broadcast({
                "type": "command_activity",
                "command": data.get("transcript"),
                "result": data.get("result")
            }),
            loop
        )

    def on_state_chg(state):
        asyncio.run_coroutine_threadsafe(
            ws_manager.broadcast({
                "type": "voice_state_update",
                "state": state
            }),
            loop
        )

    native_voice_listener.on_command_executed = on_voice_cmd
    native_voice_listener.on_state_change = on_state_chg
    native_voice_listener.start()

    # Initial boot greeting via speech if enabled
    # Initial boot greeting via speech if enabled
    if settings.ENABLE_VOICE:
        voice_service.speak("All systems are operational, Boss.")

    global background_task
    background_task = asyncio.create_task(system_telemetry_loop())

    yield

    # Shutdown
    native_voice_listener.stop()
    if background_task:
        background_task.cancel()
    print("J.A.R.V.I.S. Core Offline.")

app = FastAPI(
    title="J.A.R.V.I.S. Operating System",
    description="Your Personal AI. Your Digital Intelligence.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount screenshots directory
screenshots_dir = DATA_DIR / "screenshots"
screenshots_dir.mkdir(parents=True, exist_ok=True)
app.mount("/screenshots", StaticFiles(directory=str(screenshots_dir)), name="screenshots")

# Mount static HUD assets if present
static_dir = Path(__file__).resolve().parent.parent.parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Include API Router
app.include_router(api_router)

# HUD route
from fastapi.responses import FileResponse
@app.get("/hud")
async def get_hud():
    hud_file = Path(__file__).resolve().parent.parent.parent / "index.html"
    return FileResponse(str(hud_file))

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial metrics immediately on connect
        metrics = system_monitor.get_current_metrics()
        unread = notification_engine.get_notifications(unread_only=True)
        await websocket.send_json({
            "type": "initial_handshake",
            "status": "ONLINE",
            "metrics": metrics,
            "unread_notifications": len(unread)
        })

        while True:
            data = await websocket.receive_text()
            # Handle any incoming client ping or message
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {
            "system": settings.JARVIS_NAME,
            "status": "ONLINE",
            "tagline": "Your Personal AI. Your Digital Intelligence.",
            "user": settings.USER_NAME
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=False)
