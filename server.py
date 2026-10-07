#!/usr/bin/env python3
"""
JARVIS AI Assistant - Server Core
Handles system telemetry, command routing, application launching, YouTube execution, and static UI delivery.
"""

import http.server
import socketserver
import json
import os
import sys
import subprocess
import urllib.request
import urllib.error
import urllib.parse
import platform
import re
from pathlib import Path
from datetime import datetime

# Import universal Command Router, Application Resolver, and YouTube Service
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from backend.app.commands.router import command_router
from backend.app.commands.app_resolver import app_resolver
from backend.app.commands.youtube_service import youtube_service

PORT = int(os.environ.get("PORT", 8088))

def get_system_telemetry():
    telemetry = {
        "os": f"{platform.system()} {platform.release()}",
        "architecture": platform.machine(),
        "hostname": platform.node(),
        "python_version": platform.python_version(),
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "cpu": "Normal",
        "battery": "AC Power",
        "battery_pct": 100,
        "uptime": "N/A",
        "user_name": "Boss"
    }

    # macOS Battery check via pmset
    if platform.system() == "Darwin":
        try:
            batt = subprocess.check_output(["pmset", "-g", "batt"], text=True)
            pct_match = re.search(r"(\d+)%", batt)
            status_match = re.search(r";\s*(\w+);", batt)
            if pct_match:
                telemetry["battery_pct"] = int(pct_match.group(1))
            if status_match:
                telemetry["battery"] = status_match.group(1).capitalize()
            elif "AC Power" in batt:
                telemetry["battery"] = "Charging"
        except Exception:
            pass

        # macOS Uptime
        try:
            uptime_out = subprocess.check_output(["uptime"], text=True).strip()
            telemetry["uptime"] = uptime_out
        except Exception:
            pass

        # macOS Load Average
        try:
            load = os.getloadavg()
            telemetry["cpu_load"] = [round(x, 2) for x in load]
        except Exception:
            telemetry["cpu_load"] = [0.5, 0.4, 0.3]
    else:
        try:
            telemetry["cpu_load"] = [round(x, 2) for x in os.getloadavg()]
        except Exception:
            telemetry["cpu_load"] = [0.1, 0.1, 0.1]

    return telemetry

def fetch_instagram_oembed(url):
    try:
        oembed_url = f"https://www.instagram.com/oembed/?url={urllib.parse.quote(url)}"
        req = urllib.request.Request(
            oembed_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                return {
                    "success": True,
                    "title": data.get("title", ""),
                    "author_name": data.get("author_name", ""),
                    "author_url": data.get("author_url", ""),
                    "thumbnail_url": data.get("thumbnail_url", ""),
                    "html": data.get("html", "")
                }
    except Exception:
        pass

    reel_match = re.search(r"/reel/([A-Za-z0-9_-]+)", url)
    post_match = re.search(r"/p/([A-Za-z0-9_-]+)", url)
    shortcode = None
    media_type = "post"

    if reel_match:
        shortcode = reel_match.group(1)
        media_type = "reel"
    elif post_match:
        shortcode = post_match.group(1)
        media_type = "post"

    return {
        "success": shortcode is not None,
        "shortcode": shortcode,
        "media_type": media_type,
        "url": url,
        "embed_url": f"https://www.instagram.com/{media_type}/{shortcode}/embed/" if shortcode else "",
        "direct_url": url,
        "fallback": True
    }

class JarvisRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/system":
            self._send_json(get_system_telemetry())
            return
        elif parsed.path == "/api/applications/installed":
            apps = app_resolver.list_installed_apps()
            self._send_json({"total": len(apps), "applications": apps})
            return
        elif parsed.path == "/" or parsed.path == "/index.html":
            self.path = "/index.html"
            return super().do_GET()
        else:
            return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode() if content_length > 0 else "{}"
        
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        # 1. Chat & Universal Command Endpoint
        if parsed.path == "/api/chat" or parsed.path == "/api/jarvis/command":
            user_message = data.get("message") or data.get("command") or ""
            routed = command_router.route(user_message)

            if routed.get("executed") or routed.get("is_sleep") or routed.get("is_wake"):
                tool_status = "COMPLETED" if routed.get("success") else ("NOT_INSTALLED" if routed.get("not_installed") else "FAILED")
                self._send_json({
                    "reply": routed.get("message"),
                    "tool_action": routed.get("tool") or routed.get("intent"),
                    "tool_status": tool_status,
                    "tool_result": routed,
                    "intent": routed.get("intent"),
                    "is_sleep": routed.get("is_sleep", False),
                    "is_wake": routed.get("is_wake", False),
                    "stay_active": routed.get("stay_active", True)
                })
                return
            else:
                # General conversation
                clean_q = user_message.strip()
                if "explain" in clean_q.lower() or "what is" in clean_q.lower():
                    reply = f"Artificial intelligence refers to computational systems engineered to perform complex tasks requiring reasoning, perception, learning, and synthesis, Boss."
                else:
                    reply = f"Standing by for your directive, Boss."
                self._send_json({
                    "reply": reply,
                    "tool_action": None,
                    "tool_status": None,
                    "intent": "GENERAL_CHAT",
                    "stay_active": True
                })
                return

        # 2. Instagram Helper Info
        elif parsed.path == "/api/instagram/info":
            target_url = data.get("url", "").strip()
            res = fetch_instagram_oembed(target_url)
            self._send_json(res)
            return

        # 3. System Open (URL or Installed App)
        elif parsed.path == "/api/system/open":
            target = data.get("url") or data.get("target") or data.get("app") or ""
            target = target.strip()
            if target.startswith("https://") or target.startswith("http://"):
                opened = youtube_service._open_in_browser(target)
                self._send_json({"success": opened, "message": f"Opened {target}"})
            else:
                # Launch app via ApplicationResolver
                res = app_resolver.launch(target)
                self._send_json(res)
            return

        # 4. App Launch Endpoint
        elif parsed.path == "/api/applications/launch":
            name = data.get("name") or data.get("app") or ""
            res = app_resolver.launch(name)
            self._send_json(res)
            return

        # 5. YouTube Media Play
        elif parsed.path == "/api/youtube/play":
            query = data.get("query", "")
            media_type = data.get("mediaType", "MUSIC")
            res = youtube_service.play(query, media_type=media_type)
            self._send_json(res)
            return

        # 6. YouTube Search
        elif parsed.path == "/api/youtube/search":
            query = data.get("query", "")
            res = youtube_service.search(query)
            self._send_json(res)
            return

        # 7. Text-To-Speech (macOS say with single British Butler voice Daniel)
        elif parsed.path == "/api/system/say":
            text = data.get("text", "").strip()
            if text and platform.system() == "Darwin":
                try:
                    subprocess.Popen(["say", "-v", "Daniel", text])
                    self._send_json({"success": True})
                    return
                except Exception:
                    pass
            self._send_json({"success": False})
            return

        self.send_error(404, "Endpoint not found")

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

def find_available_port(start_port=8088, max_attempts=10):
    import socket
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
    return start_port

def run():
    target_port = int(os.environ.get("PORT", 8088))
    actual_port = find_available_port(target_port)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", actual_port), JarvisRequestHandler) as httpd:
        print("=" * 60)
        print("⚡ J.A.R.V.I.S. Core Online")
        print(f"📡 Interface: http://localhost:{actual_port}")
        print("🤖 Protocol: Online & Listening")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down J.A.R.V.I.S. Core...")
            httpd.shutdown()

if __name__ == "__main__":
    run()
