"""
Application Resolver Service
Dynamic macOS application discovery, resolution, validation, and safe execution.
"""

import os
import subprocess
import platform
import re
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

# Common aliases for quick resolution
APP_ALIASES = {
    "whatsapp": "WhatsApp",
    "whatsapp desktop": "WhatsApp",
    "chrome": "Google Chrome",
    "google chrome": "Google Chrome",
    "vs code": "Visual Studio Code",
    "vscode": "Visual Studio Code",
    "visual studio code": "Visual Studio Code",
    "code": "Visual Studio Code",
    "spotify": "Spotify",
    "safari": "Safari",
    "telegram": "Telegram",
    "discord": "Discord",
    "slack": "Slack",
    "finder": "Finder",
    "terminal": "Terminal",
    "iterm": "iTerm",
    "iterm2": "iTerm",
    "calculator": "Calculator",
    "calendar": "Calendar",
    "notes": "Notes",
    "mail": "Mail",
    "apple mail": "Mail",
    "music": "Music",
    "apple music": "Music",
    "system settings": "System Settings",
    "settings": "System Settings",
    "preferences": "System Settings",
    "app store": "App Store",
    "photos": "Photos",
    "reminders": "Reminders",
    "messages": "Messages",
    "facetime": "FaceTime",
    "docker": "Docker",
    "claude": "Claude",
    "chatgpt": "ChatGPT",
    "antigravity": "Antigravity",
    "antigravity ide": "Antigravity IDE",
    "zoom": "zoom.us",
    "teams": "Microsoft Teams",
    "postman": "Postman",
    "xcode": "Xcode",
    "photoshop": "Adobe Photoshop",
    "premiere": "Adobe Premiere Pro",
    "premiere pro": "Adobe Premiere Pro",
    "android studio": "Android Studio",
    "instagram": "Instagram",
}

class ApplicationResolver:
    def __init__(self):
        self.os_type = platform.system()
        self._installed_cache: Dict[str, str] = {}
        self.refresh_cache()

    def refresh_cache(self) -> Dict[str, str]:
        """
        Dynamically scans macOS application directories.
        Discovers any new applications installed after JARVIS was started.
        """
        if self.os_type != "Darwin":
            return {}

        apps: Dict[str, str] = {}
        scan_dirs = [
            "/Applications",
            "/System/Applications",
            "/System/Applications/Utilities",
            os.path.expanduser("~/Applications"),
            os.path.expanduser("~/Applications/Chrome Apps.localized"),
            "/System/Library/CoreServices"
        ]

        for d in scan_dirs:
            if os.path.exists(d):
                try:
                    for entry in os.scandir(d):
                        if entry.name.endswith(".app"):
                            base_name = entry.name[:-4] # strip .app
                            apps[base_name.lower()] = entry.path
                except Exception:
                    pass

        self._installed_cache = apps
        return apps

    def resolveApplication(self, user_input: str) -> Optional[Tuple[str, str]]:
        """
        Resolves application name and path from user input:
        1. Normalizes text.
        2. Removes command words: open, launch, start, run, please, can you.
        3. Extracts target name.
        4. Searches dynamic installed application cache.
        5. Case-insensitive & multi-word matching.
        6. Spotlight mdfind search fallback for newly installed applications.
        7. Returns (display_name, full_path) or None.
        """
        # Always refresh cache to pick up newly installed applications
        self.refresh_cache()

        clean = user_input.strip().lower()
        changed = True
        while changed:
            prev = clean
            clean = re.sub(r'^(?:now\s+)?(?:i\s+said\s+|i\s+told\s+|i\s+asked\s+|tell\s+|ask\s+|i\s+want\s+you\s+to\s+|i\s+need\s+you\s+to\s+)', '', clean).strip()
            clean = re.sub(r'^(?:hey\s+|okay\s+|ok\s+|hi\s+|hello\s+)?(?:jarvis|jarvin|travis|java|javis|jarv)\b[,:\s]*', '', clean).strip()
            clean = re.sub(r'^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+(?:please\s+)?|will\s+you\s+)', '', clean).strip()
            clean = re.sub(r'^(?:open|launch|start|run|bring\s+up|show\s+me)\s+(?:the\s+|my\s+)?', '', clean).strip()
            clean = re.sub(r'^(?:the|my|to|now)\s+', '', clean).strip()
            clean = re.sub(r'\s+(?:for\s+me|please)[?.!]*$', '', clean).strip()
            clean = re.sub(r'\s+(?:app|application)$', '', clean).strip()
            clean = re.sub(r'[?.!]+$', '', clean).strip()
            changed = (clean != prev)

        if not clean:
            return None

        # Check alias
        resolved_name = APP_ALIASES.get(clean, clean)
        resolved_lower = resolved_name.lower()

        # 1. Exact match in cache
        if resolved_lower in self._installed_cache:
            path = self._installed_cache[resolved_lower]
            return Path(path).stem, path

        # 2. Match without spaces or symbols (e.g. "vscode" -> "visual studio code")
        clean_no_space = clean.replace(" ", "").replace("-", "")
        for app_key, app_path in self._installed_cache.items():
            if clean_no_space == app_key.replace(" ", "").replace("-", ""):
                return Path(app_path).stem, app_path

        # 3. Case-insensitive substring match
        for app_key, app_path in self._installed_cache.items():
            if resolved_lower == app_key or f" {resolved_lower} " in f" {app_key} ":
                return Path(app_path).stem, app_path

        # 4. Prefix match
        for app_key, app_path in self._installed_cache.items():
            if app_key.startswith(resolved_lower):
                return Path(app_path).stem, app_path

        # 5. Word boundary match
        for app_key, app_path in self._installed_cache.items():
            if resolved_lower in app_key:
                return Path(app_path).stem, app_path

        # 6. Dynamic Spotlight mdfind discovery on macOS
        if self.os_type == "Darwin":
            try:
                # Search by exact name
                cmd = f'mdfind \'kMDItemContentType == "com.apple.application-bundle" && kMDItemFSName == "*{resolved_name}*"c\''
                output = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
                lines = [l.strip() for l in output.splitlines() if l.strip().endswith(".app")]
                if lines:
                    best_match = lines[0]
                    return Path(best_match).stem, best_match
            except Exception:
                pass

        return None

    def find_application(self, query: str) -> Optional[Tuple[str, str]]:
        """Alias for resolveApplication."""
        return self.resolveApplication(query)

    def is_running(self, app_name: str) -> bool:
        """Checks if application process is currently running on macOS."""
        if self.os_type != "Darwin":
            return False
        clean = app_name.strip()
        script = f'''
        tell application "System Events"
            set isRunning to (name of every application process) contains "{clean}"
        end tell
        return isRunning
        '''
        try:
            res = subprocess.check_output(["osascript", "-e", script], text=True, stderr=subprocess.DEVNULL).strip()
            return res == "true"
        except Exception:
            pass

        # Fallback process check via exact name pgrep
        try:
            out = subprocess.check_output(["pgrep", "-x", clean], text=True, stderr=subprocess.DEVNULL)
            return bool(out.strip())
        except Exception:
            return False

    def launch(self, query: str) -> Dict[str, Any]:
        """
        Validates and safely launches an application on macOS without shell=True.
        Returns truthful execution status.
        """
        found = self.resolveApplication(query)

        if not found:
            raw = query.strip()
            clean_name = re.sub(r'^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+)', '', raw, flags=re.IGNORECASE).strip()
            clean_name = re.sub(r'^(?:open|launch|start|run)\s+(?:the\s+|my\s+)?', '', clean_name, flags=re.IGNORECASE).strip()
            clean_name = re.sub(r'^(?:the|my)\s+', '', clean_name, flags=re.IGNORECASE).strip()
            clean_name = re.sub(r'\s+(?:for\s+me|please)[?.!]*$', '', clean_name, flags=re.IGNORECASE).strip()
            clean_name = re.sub(r'\s+(?:app|application)$', '', clean_name, flags=re.IGNORECASE).strip()
            clean_name = re.sub(r'[?.!]+$', '', clean_name).strip()
            clean_target = APP_ALIASES.get(clean_name.lower(), clean_name)

            return {
                "success": False,
                "not_installed": True,
                "app_name": clean_target.title(),
                "message": f"Sorry, Boss. That application isn't installed on this system."
            }

        app_name, app_path = found
        try:
            if self.os_type == "Darwin":
                # Safe launch using macOS open command with absolute application path
                subprocess.Popen(["open", app_path])
            elif self.os_type == "Windows":
                os.startfile(app_path)
            else:
                subprocess.Popen([app_path])

            # Update central context tracking
            try:
                from backend.app.commands.context import assistant_context
                assistant_context.record_opened_app(app_name)
            except Exception:
                pass

            return {
                "success": True,
                "not_installed": False,
                "app_name": app_name,
                "path": app_path,
                "message": f"Certainly, Boss. Opening {app_name}."
            }
        except Exception as e:
            return {
                "success": False,
                "not_installed": False,
                "app_name": app_name,
                "path": app_path,
                "error": str(e),
                "message": f"Sorry, Boss. Failed to launch {app_name}."
            }

    def close(self, query: str) -> Dict[str, Any]:
        """Safely quits an application using osascript or killall with truthful verification."""
        clean_target = query.strip()
        # If user targeted YouTube specifically
        if clean_target.lower() == "youtube":
            try:
                from backend.app.commands.youtube_service import youtube_service
                return youtube_service.close_youtube()
            except Exception:
                pass

        # Guard: Never terminate JARVIS or Python assistant process
        if clean_target.lower() in ["jarvis", "jarvis ai", "python", "python3", "uvicorn", "assistant"]:
            return {
                "success": False,
                "is_assistant": True,
                "app_name": "JARVIS",
                "message": "Boss, I am your background assistant and remain active. To put me to sleep, say 'Jarvis, go to sleep'."
            }

        found = self.resolveApplication(query)
        app_name = found[0] if found else query.strip().title()

        if self.os_type == "Darwin":
            # 1. Check if the application is actually running
            if not self.is_running(app_name):
                return {
                    "success": False,
                    "not_running": True,
                    "app_name": app_name,
                    "message": f"Boss, {app_name} isn't currently running."
                }

            # 2. Graceful quit via AppleScript
            try:
                apple_script = f'tell application "{app_name}" to quit'
                subprocess.run(["osascript", "-e", apple_script], capture_output=True, timeout=3)
            except Exception:
                pass

            # 3. Verify if closed
            import time
            time.sleep(0.4)
            if not self.is_running(app_name):
                try:
                    from backend.app.commands.context import assistant_context
                    assistant_context.record_closed_target(app_name)
                except Exception:
                    pass
                return {
                    "success": True,
                    "app_name": app_name,
                    "message": f"Closed {app_name}, Boss."
                }

            # 4. Force kill fallback if graceful quit did not terminate
            try:
                subprocess.run(["killall", app_name], capture_output=True, timeout=3)
                time.sleep(0.3)
                if not self.is_running(app_name):
                    try:
                        from backend.app.commands.context import assistant_context
                        assistant_context.record_closed_target(app_name)
                    except Exception:
                        pass
                    return {
                        "success": True,
                        "app_name": app_name,
                        "message": f"Closed {app_name}, Boss."
                    }
            except Exception as e:
                return {
                    "success": False,
                    "app_name": app_name,
                    "error": str(e),
                    "message": f"Sorry, Boss. Failed to close {app_name}."
                }

            return {
                "success": False,
                "app_name": app_name,
                "message": f"Sorry, Boss. Could not terminate {app_name}."
            }

    def list_installed_apps(self) -> List[str]:
        self.refresh_cache()
        return sorted([Path(p).stem for p in self._installed_cache.values()])

app_resolver = ApplicationResolver()
