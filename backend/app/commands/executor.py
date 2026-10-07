import subprocess
import platform
import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any
from backend.app.config import settings, DATA_DIR
from backend.app.database import get_db
from backend.app.commands.security import classify_command, SecurityLevel

SCREENSHOTS_DIR = DATA_DIR / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

APP_MAP_MACOS = {
    "chrome": "Google Chrome",
    "google chrome": "Google Chrome",
    "vs code": "Visual Studio Code",
    "vscode": "Visual Studio Code",
    "visual studio code": "Visual Studio Code",
    "code": "Visual Studio Code",
    "safari": "Safari",
    "terminal": "Terminal",
    "iterm": "iTerm",
    "notes": "Notes",
    "calendar": "Calendar",
    "calculator": "Calculator",
    "spotify": "Spotify",
    "finder": "Finder",
    "mail": "Mail",
    "slack": "Slack",
    "discord": "Discord"
}

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
            print("Failed to record command in DB:", e)

    def open_app(self, app_name: str) -> Dict[str, Any]:
        clean_name = app_name.strip().lower()
        target = APP_MAP_MACOS.get(clean_name, app_name)
        
        sec_level, reason = classify_command(f"open app {target}", "open_app")
        if sec_level == SecurityLevel.BLOCKED:
            self.record_command(f"Open {target}", "open_app", sec_level, "BLOCKED", reason)
            return {"success": False, "security": sec_level, "message": reason}

        try:
            if self.os_type == "Darwin":
                subprocess.Popen(["open", "-a", target])
            elif self.os_type == "Windows":
                subprocess.Popen(["start", target], shell=True)
            else:
                subprocess.Popen([target])

            msg = f"Opening {target}."
            self.record_command(f"Open {target}", "open_app", sec_level, "COMPLETED", msg)
            return {"success": True, "security": sec_level, "message": msg, "app": target}
        except Exception as e:
            err = f"Could not open {target}: {str(e)}"
            self.record_command(f"Open {target}", "open_app", sec_level, "FAILED", err)
            return {"success": False, "security": sec_level, "message": err}

    def close_app(self, app_name: str) -> Dict[str, Any]:
        clean_name = app_name.strip().lower()
        target = APP_MAP_MACOS.get(clean_name, app_name)

        sec_level, reason = classify_command(f"close app {target}", "close_app")
        try:
            if self.os_type == "Darwin":
                subprocess.run(["osascript", "-e", f'quit app "{target}"'], check=True)
            elif self.os_type == "Windows":
                subprocess.run(["taskkill", "/IM", f"{target}.exe", "/F"], check=True)
            else:
                subprocess.run(["pkill", "-f", target], check=True)

            msg = f"Closed {target}."
            self.record_command(f"Close {target}", "close_app", sec_level, "COMPLETED", msg)
            return {"success": True, "message": msg}
        except Exception as e:
            err = f"Could not close {target}."
            self.record_command(f"Close {target}", "close_app", sec_level, "FAILED", str(e))
            return {"success": False, "message": err}

    def open_url(self, url: str) -> Dict[str, Any]:
        if not (url.startswith("http://") or url.startswith("https://")):
            url = "https://" + url

        sec_level, reason = classify_command(url, "open_url")
        try:
            if self.os_type == "Darwin":
                subprocess.Popen(["open", url])
            elif self.os_type == "Windows":
                os.startfile(url)
            else:
                subprocess.Popen(["xdg-open", url])

            msg = f"Opening {url}."
            self.record_command(f"Open URL {url}", "open_url", sec_level, "COMPLETED", msg)
            return {"success": True, "message": msg, "url": url}
        except Exception as e:
            err = f"Failed to open URL: {str(e)}"
            self.record_command(f"Open URL {url}", "open_url", sec_level, "FAILED", err)
            return {"success": False, "message": err}

    def open_folder(self, folder_path: str) -> Dict[str, Any]:
        path = Path(folder_path).expanduser().resolve()
        if not path.exists():
            return {"success": False, "message": f"Folder {folder_path} does not exist."}

        sec_level, reason = classify_command(str(path), "open_folder")
        try:
            if self.os_type == "Darwin":
                subprocess.Popen(["open", str(path)])
            elif self.os_type == "Windows":
                os.startfile(str(path))
            else:
                subprocess.Popen(["xdg-open", str(path)])

            msg = f"Opening folder {path.name}."
            self.record_command(f"Open folder {path}", "open_folder", sec_level, "COMPLETED", msg)
            return {"success": True, "message": msg}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def take_screenshot(self) -> Dict[str, Any]:
        filename = f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = SCREENSHOTS_DIR / filename
        
        try:
            if self.os_type == "Darwin":
                subprocess.run(["screencapture", "-x", str(filepath)], check=True)
            else:
                from PIL import ImageGrab
                img = ImageGrab.grab()
                img.save(str(filepath))

            msg = f"Screenshot captured successfully."
            self.record_command("Take screenshot", "screenshot", SecurityLevel.SAFE, "COMPLETED", msg)
            return {
                "success": True,
                "message": msg,
                "filepath": str(filepath),
                "filename": filename
            }
        except Exception as e:
            err = f"Screenshot capture failed: {str(e)}"
            self.record_command("Take screenshot", "screenshot", SecurityLevel.SAFE, "FAILED", err)
            return {"success": False, "message": err}

command_executor = CommandExecutor()
