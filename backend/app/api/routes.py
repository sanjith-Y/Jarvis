from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import asyncio
import json

from backend.app.ai.provider import jarvis_ai
from backend.app.system.monitor import system_monitor
from backend.app.commands.executor import command_executor
from backend.app.commands.security import classify_command, SecurityLevel
from backend.app.memory.manager import memory_manager
from backend.app.reminders.manager import reminder_manager
from backend.app.notifications.engine import notification_engine
from backend.app.search.engine import web_search_engine
from backend.app.vision.analyzer import screen_vision
from backend.app.files.assistant import file_assistant
from backend.app.voice.service import voice_service
from backend.app.automation.engine import automation_engine
from backend.app.database import get_db

from backend.app.commands.app_resolver import app_resolver
from backend.app.commands.youtube_service import youtube_service
from backend.app.commands.router import command_router
from backend.app.config import settings

router = APIRouter(prefix="/api")

# Models
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = "default"

class CommandRequest(BaseModel):
    command: str
    action_type: str = "shell"
    confirmed: bool = False

class JarvisCommandRequest(BaseModel):
    command: str

class AppLaunchRequest(BaseModel):
    name: str

class YouTubeRequest(BaseModel):
    query: str

class MemoryCreate(BaseModel):
    content: str
    category: str = "general"
    key: Optional[str] = None

class ReminderCreate(BaseModel):
    title: str
    due_time: str
    priority: str = "NORMAL"

class NotificationSimulate(BaseModel):
    source: str
    sender: str
    title: str
    content: str
    priority: Optional[str] = None

class AutomationCreate(BaseModel):
    name: str
    trigger_type: str
    trigger_value: str
    action_type: str
    action_value: str

# Central session tracking
jarvis_session = {
    "active": False,
    "state": "SLEEPING",
    "wakeWordEnabled": True,
    "continuousMode": True,
    "user_name": settings.USER_NAME
}

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                pass

ws_manager = ConnectionManager()

# --- JARVIS SESSION & COMMAND ROUTING ---
@router.post("/jarvis/activate")
async def activate_jarvis():
    from backend.app.voice.listener import native_voice_listener
    from backend.app.commands.context import assistant_context
    native_voice_listener.activate()
    jarvis_session["active"] = True
    jarvis_session["state"] = "LISTENING"
    msg = f"JARVIS is online. I'm listening, Boss."
    if settings.ENABLE_VOICE:
        voice_service.speak(msg)
    await ws_manager.broadcast({
        "type": "jarvis_session_update",
        "session": assistant_context.get_status()
    })
    return {"success": True, "active": True, "state": "LISTENING", "message": msg, "context": assistant_context.get_status()}

@router.post("/jarvis/deactivate")
async def deactivate_jarvis():
    from backend.app.voice.listener import native_voice_listener
    from backend.app.commands.context import assistant_context
    native_voice_listener.deactivate()
    jarvis_session["active"] = False
    jarvis_session["state"] = "SLEEPING"
    msg = f"Understood, Boss. I'll stand by."
    if settings.ENABLE_VOICE:
        voice_service.speak(msg)
    await ws_manager.broadcast({
        "type": "jarvis_session_update",
        "session": assistant_context.get_status()
    })
    return {"success": True, "active": False, "state": "SLEEPING", "message": msg, "context": assistant_context.get_status()}

@router.get("/jarvis/status")
async def get_jarvis_status():
    from backend.app.commands.context import assistant_context
    return assistant_context.get_status()

@router.post("/jarvis/command")
async def execute_jarvis_command(req: JarvisCommandRequest):
    result = command_router.route_command(req.command)
    if result.get("is_sleep"):
        jarvis_session["active"] = False
        jarvis_session["state"] = "SLEEPING"
    elif result.get("is_wake") or jarvis_session["active"]:
        jarvis_session["active"] = True
        jarvis_session["state"] = "LISTENING"

    if settings.ENABLE_VOICE and result.get("message"):
        voice_service.speak(result["message"])

    await ws_manager.broadcast({
        "type": "command_activity",
        "command": req.command,
        "result": result,
        "session": jarvis_session
    })
    return result

# --- APPLICATION LAUNCHER SERVICE ---
@router.post("/applications/launch")
async def launch_application(req: AppLaunchRequest):
    res = app_resolver.launch(req.name)
    return res

@router.get("/applications/installed")
async def get_installed_applications():
    apps = app_resolver.list_installed_apps()
    return {"total": len(apps), "applications": apps}

# --- YOUTUBE SERVICE ---
@router.post("/youtube/play")
async def play_youtube_music(req: YouTubeRequest):
    return youtube_service.play_music(req.query)

@router.post("/youtube/search")
async def search_youtube_endpoint(req: YouTubeRequest):
    return youtube_service.search_youtube(req.query)

# --- CHAT & AI ---
@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    result = await jarvis_ai.process_user_input(req.message)
    
    # Track session state transitions
    if result.get("is_sleep"):
        jarvis_session["active"] = False
        jarvis_session["state"] = "SLEEPING"
    elif result.get("is_wake") or jarvis_session["active"]:
        jarvis_session["active"] = True
        jarvis_session["state"] = "LISTENING"

    # Broadcast to WS
    await ws_manager.broadcast({
        "type": "chat_activity",
        "user_message": req.message,
        "jarvis_reply": result["reply"],
        "tool_action": result.get("tool_action"),
        "tool_status": result.get("tool_status"),
        "tool_result": result.get("tool_result"),
        "is_sleep": result.get("is_sleep", False),
        "is_wake": result.get("is_wake", False),
        "stay_active": result.get("stay_active", True),
        "session": jarvis_session
    })

    return result

# --- VOICE ---
@router.post("/voice/speak")
async def speak_endpoint(text: str = Body(..., embed=True), voice: Optional[str] = Body(None, embed=True)):
    return voice_service.speak(text, voice)

@router.post("/voice/stop")
async def stop_voice_endpoint():
    return {"stopped": voice_service.stop()}

# --- COMMANDS ---
@router.post("/command/execute")
async def execute_command(req: CommandRequest):
    sec_level, reason = classify_command(req.command, req.action_type)
    
    if sec_level == SecurityLevel.BLOCKED:
        raise HTTPException(status_code=403, detail=f"Blocked: {reason}")

    if sec_level == SecurityLevel.CONFIRMATION_REQUIRED and not req.confirmed:
        return {
            "status": "CONFIRMATION_REQUIRED",
            "message": f"Action requires confirmation: {reason}",
            "command": req.command
        }

    # Execute
    if req.action_type == "open_app":
        res = command_executor.open_app(req.command)
    elif req.action_type == "close_app":
        res = command_executor.close_app(req.command)
    elif req.action_type == "open_url":
        res = command_executor.open_url(req.command)
    elif req.action_type == "open_folder":
        res = command_executor.open_folder(req.command)
    elif req.action_type == "screenshot":
        res = command_executor.take_screenshot()
    else:
        res = {"success": True, "message": f"Executed: {req.command}"}

    return res

@router.get("/command/history")
async def get_command_history():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, command, action_type, security_level, status, result, timestamp FROM command_history ORDER BY id DESC LIMIT 30")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- SYSTEM MONITOR ---
@router.get("/system/status")
async def get_system_status():
    return system_monitor.get_current_metrics()

@router.get("/system/history")
async def get_system_history():
    return system_monitor.history

@router.get("/system/processes")
async def get_system_processes():
    return system_monitor.get_top_processes(8)

# --- SEARCH ---
@router.post("/search")
async def web_search(query: str = Body(..., embed=True)):
    return web_search_engine.search(query)

# --- VISION ---
@router.post("/screen/analyze")
async def screen_analyze(prompt: str = Body("Analyze visible content", embed=True)):
    return screen_vision.capture_and_analyze(prompt)

# --- MEMORY ---
@router.get("/memory")
async def get_memories(search: Optional[str] = None):
    return memory_manager.get_memories(search=search)

@router.post("/memory")
async def create_memory(mem: MemoryCreate):
    return memory_manager.add_memory(mem.content, mem.category, mem.key)

@router.delete("/memory/{mem_id}")
async def delete_memory(mem_id: int):
    return {"success": memory_manager.delete_memory(mem_id)}

# --- REMINDERS ---
@router.get("/reminders")
async def get_reminders(status: Optional[str] = None):
    return reminder_manager.get_reminders(status=status)

@router.post("/reminders")
async def create_reminder(rem: ReminderCreate):
    return reminder_manager.create_reminder(rem.title, rem.due_time, rem.priority)

@router.post("/reminders/{rem_id}/complete")
async def complete_reminder(rem_id: int):
    return {"success": reminder_manager.complete_reminder(rem_id)}

@router.delete("/reminders/{rem_id}")
async def delete_reminder(rem_id: int):
    return {"success": reminder_manager.delete_reminder(rem_id)}

# --- NOTIFICATIONS ---
@router.get("/notifications")
async def get_notifications(priority: Optional[str] = None, unread_only: bool = False):
    return notification_engine.get_notifications(filter_priority=priority, unread_only=unread_only)

@router.get("/notifications/unread")
async def get_unread_count():
    notifs = notification_engine.get_notifications(unread_only=True)
    return {"count": len(notifs), "items": notifs}

@router.post("/notifications/read/{notif_id}")
async def read_notification(notif_id: int):
    return {"success": notification_engine.mark_as_read(notif_id)}

@router.post("/notifications/read-all")
async def read_all_notifications():
    return {"success": notification_engine.mark_all_read()}

@router.post("/notifications/simulate")
async def simulate_notification(notif: NotificationSimulate):
    created = notification_engine.add_notification(
        source=notif.source,
        sender=notif.sender,
        title=notif.title,
        content=notif.content,
        is_simulated=True,
        force_priority=notif.priority
    )
    if created.get("should_speak") and created.get("proactive_message"):
        voice_service.speak(created["proactive_message"])

    await ws_manager.broadcast({
        "type": "notification_alert",
        "notification": created
    })
    return created

@router.get("/notifications/summary")
async def get_notification_summary():
    return notification_engine.generate_smart_summary()

# --- FILES ---
@router.get("/files/list")
async def list_files(path: str = ""):
    return file_assistant.list_files(path)

@router.get("/files/read")
async def read_file(path: str):
    return file_assistant.read_file(path)

@router.post("/files/create")
async def create_file(path: str = Body(..., embed=True), content: str = Body(..., embed=True)):
    return file_assistant.create_file(path, content)

# --- AUTOMATIONS ---
@router.get("/automations")
async def get_automations():
    return automation_engine.get_automations()

@router.post("/automations")
async def create_automation(auto: AutomationCreate):
    return automation_engine.add_automation(auto.name, auto.trigger_type, auto.trigger_value, auto.action_type, auto.action_value)

@router.post("/automations/{auto_id}/toggle")
async def toggle_automation(auto_id: int):
    return {"success": automation_engine.toggle_automation(auto_id)}

@router.delete("/automations/{auto_id}")
async def delete_automation(auto_id: int):
    return {"success": automation_engine.delete_automation(auto_id)}
