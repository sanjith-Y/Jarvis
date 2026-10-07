"""
Universal Command Executor Service
Executes validated applications, YouTube media/search, system operations, and AI chat.
"""

import subprocess
import platform
import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
from backend.app.config import settings, DATA_DIR
from backend.app.database import get_db
from backend.app.commands.security import classify_command, SecurityLevel
from backend.app.commands.app_resolver import app_resolver
from backend.app.commands.youtube_service import youtube_service
from backend.app.system.monitor import system_monitor
from backend.app.ai.knowledge_engine import knowledge_engine

SCREENSHOTS_DIR = DATA_DIR / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

class CommandExecutor:
    def __init__(self):
        self.os_type = platform.system()

    def record_command(self, command: str, action_type: str, security_level: str, status: str, result: str):
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO command_history (command, action_type, security_level, status, result) VALUES (?, ?, ?, ?, ?)",
                (command, action_type, security_level, status, result)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            pass

    def executeOpenApplication(self, target: str) -> Dict[str, Any]:
        """
        Executes launching of any validated application on macOS.
        Uses ApplicationResolver for dynamic discovery.
        """
        res = app_resolver.launch(target)
        status = "COMPLETED" if res["success"] else ("NOT_INSTALLED" if res.get("not_installed") else "FAILED")
        self.record_command(f"Open {target}", "open_app", SecurityLevel.SAFE, status, res["message"])
        return {
            "success": res["success"],
            "not_installed": res.get("not_installed", False),
            "app_name": res.get("app_name", target),
            "path": res.get("path"),
            "message": res["message"]
        }

    def executeYouTubeSearch(self, query: str) -> Dict[str, Any]:
        """Executes a YouTube search query."""
        res = youtube_service.search(query)
        status = "COMPLETED" if res["success"] else "FAILED"
        self.record_command(f"YouTube Search: {query}", "youtube_search", SecurityLevel.SAFE, status, res["message"])
        return {
            "success": res["success"],
            "query": res["query"],
            "url": res["url"],
            "message": res["message"]
        }

    def executeYouTubeMedia(self, query: str, mediaType: str = "MUSIC") -> Dict[str, Any]:
        """Executes YouTube media playback for songs, movie songs, comedy, or videos."""
        res = youtube_service.play(query, media_type=mediaType)
        status = "COMPLETED" if res["success"] else "FAILED"
        self.record_command(f"YouTube Media ({mediaType}): {query}", "youtube_media", SecurityLevel.SAFE, status, res["message"])
        return {
            "success": res["success"],
            "query": res["query"],
            "url": res["url"],
            "mediaType": mediaType,
            "message": res["message"]
        }

    def executeSystemCommand(self, cmd_type: str) -> Dict[str, Any]:
        """Executes safe system status or diagnostics."""
        metrics = system_monitor.get_current_metrics()
        if cmd_type == "cpu":
            msg = f"Your CPU is currently at {metrics['cpu_percent']} percent, Boss."
        elif cmd_type == "battery":
            msg = f"Battery is at {metrics['battery']['percent']} percent and {metrics['battery']['status'].lower()}, Boss."
        elif cmd_type == "ram" or cmd_type == "memory":
            msg = f"Memory usage is {metrics['memory_percent']} percent ({metrics['memory_used_gb']} GB of {metrics['memory_total_gb']} GB), Boss."
        else:
            msg = (
                f"CPU is at {metrics['cpu_percent']} percent, "
                f"memory usage is {metrics['memory_percent']} percent, and "
                f"battery is at {metrics['battery']['percent']} percent, Boss."
            )
        return {
            "success": True,
            "metrics": metrics,
            "message": msg
        }

    def executeGeneralChat(self, prompt: str) -> Dict[str, Any]:
        """Dynamic intelligence response for general conversation or technical explanations."""
        ans = knowledge_engine.answer_query(prompt)
        return {
            "success": True,
            "prompt": prompt,
            "message": ans
        }

    # Backward compatibility helpers
    def open_app(self, app_name: str) -> Dict[str, Any]:
        return self.executeOpenApplication(app_name)

    def close_app(self, app_name: str) -> Dict[str, Any]:
        return app_resolver.close(app_name)

    def open_url(self, url: str) -> Dict[str, Any]:
        opened = youtube_service._open_in_browser(url)
        return {"success": opened, "message": f"Opened {url}." if opened else "Failed to open URL."}

    def capture_screen(self) -> Dict[str, Any]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshot_{timestamp}.png"
        filepath = SCREENSHOTS_DIR / filename
        try:
            if self.os_type == "Darwin":
                subprocess.run(["screencapture", "-x", str(filepath)], check=True)
            elif self.os_type == "Linux":
                subprocess.run(["scrot", str(filepath)], check=True)
            else:
                return {"success": False, "message": "Screen capture not supported on this OS."}
            return {"success": True, "filepath": str(filepath), "filename": filename, "message": "Screen captured, Boss."}
        except Exception as e:
            return {"success": False, "message": f"Screen capture failed: {str(e)}"}

    def execute_shell(self, command: str, confirmed: bool = False) -> Dict[str, Any]:
        sec_level, reason = classify_command(command, "shell")
        if sec_level == SecurityLevel.BLOCKED:
            self.record_command(command, "shell", sec_level, "BLOCKED", reason)
            return {"success": False, "security": sec_level, "message": f"Blocked: {reason}"}
        if sec_level == SecurityLevel.CONFIRMATION_REQUIRED and not confirmed:
            return {"success": False, "security": sec_level, "message": reason, "confirmation_required": True}
        try:
            res = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=10)
            output = res.stdout if res.returncode == 0 else res.stderr
            status = "COMPLETED" if res.returncode == 0 else "FAILED"
            self.record_command(command, "shell", sec_level, status, output[:200])
            return {"success": res.returncode == 0, "security": sec_level, "output": output.strip(), "message": "Command executed, Boss."}
        except Exception as e:
            self.record_command(command, "shell", sec_level, "FAILED", str(e))
            return {"success": False, "security": sec_level, "message": f"Execution error: {str(e)}"}

command_executor = CommandExecutor()
