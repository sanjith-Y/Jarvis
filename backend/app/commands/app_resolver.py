"""
Application Resolver Service
Discovers, resolves, and safely launches installed applications on macOS.
"""

import os
import subprocess
import platform
import re
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

# Common application aliases
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
}

class ApplicationResolver:
    def __init__(self):
        self.os_type = platform.system()
        self._installed_cache: Dict[str, str] = {}
        self._cache_timestamp = 0
        self.refresh_cache()

    def refresh_cache(self) -> Dict[str, str]:
        """Scans standard application directories on macOS."""
        if self.os_type != "Darwin":
            return {}

        apps: Dict[str, str] = {}
        scan_dirs = [
            "/Applications",
            "/System/Applications",
            "/System/Applications/Utilities",
            os.path.expanduser("~/Applications"),
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

    def find_application(self, query: str) -> Optional[Tuple[str, str]]:
        """
        Returns (display_name, full_path) if found, else None.
        """
        clean = query.strip().lower()
        # Clean prefix "open", "launch", "start", "the"
        clean = re.sub(r'^(?:please\s+)?(?:open|launch|start|run)\s+(?:the\s+)?', '', clean).strip()
        clean = re.sub(r'\s+app$', '', clean).strip()

        # Check alias
        resolved_name = APP_ALIASES.get(clean, clean)
        resolved_lower = resolved_name.lower()

        # 1. Exact match in cache
        if resolved_lower in self._installed_cache:
            path = self._installed_cache[resolved_lower]
            return Path(path).stem, path

        # 2. Case-insensitive substring in cache
        for app_key, app_path in self._installed_cache.items():
            if resolved_lower == app_key or f" {resolved_lower} " in f" {app_key} ":
                return Path(app_path).stem, app_path

        # 3. Fuzzy prefix match in cache
        for app_key, app_path in self._installed_cache.items():
            if app_key.startswith(resolved_lower):
                return Path(app_path).stem, app_path

        # 4. Spotlight mdfind search fallback on macOS
        if self.os_type == "Darwin":
            try:
                cmd = f'mdfind \'kMDItemContentType == "com.apple.application-bundle" && kMDItemFSName == "*{resolved_name}*"c\''
                output = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
                lines = [l.strip() for l in output.splitlines() if l.strip().endswith(".app")]
                if lines:
                    best_match = lines[0]
                    return Path(best_match).stem, best_match
            except Exception:
                pass

        return None

    def launch(self, query: str) -> Dict[str, Any]:
        """
        Finds and launches the requested application.
        Returns a structured truthful result.
        """
        found = self.find_application(query)
        clean_target = APP_ALIASES.get(query.lower().strip(), query.strip())

        if not found:
            return {
                "success": False,
                "not_installed": True,
                "app_name": clean_target.title(),
                "message": f"Sorry, Boss. {clean_target.title()} isn't installed on this system."
            }

        app_name, app_path = found
        try:
            if self.os_type == "Darwin":
                subprocess.Popen(["open", app_path])
            elif self.os_type == "Windows":
                os.startfile(app_path)
            else:
                subprocess.Popen([app_path])

            return {
                "success": True,
                "not_installed": False,
                "app_name": app_name,
                "path": app_path,
                "message": f"Certainly, Boss. Opening {app_name}."
            }
        except Exception as e:
            print(f"Error launching {app_name}: {e}")
            return {
                "success": False,
                "not_installed": False,
                "app_name": app_name,
                "path": app_path,
                "error": str(e),
                "message": f"Sorry, Boss. I found {app_name}, but I couldn't open it."
            }

    def close(self, query: str) -> Dict[str, Any]:
        """Closes the specified application."""
        found = self.find_application(query)
        target_name = found[0] if found else query.strip()

        try:
            if self.os_type == "Darwin":
                subprocess.run(["osascript", "-e", f'quit app "{target_name}"'], check=True, stderr=subprocess.DEVNULL)
            elif self.os_type == "Windows":
                subprocess.run(["taskkill", "/IM", f"{target_name}.exe", "/F"], check=True)
            else:
                subprocess.run(["pkill", "-f", target_name], check=True)

            return {
                "success": True,
                "app_name": target_name,
                "message": f"Closing {target_name}."
            }
        except Exception as e:
            return {
                "success": False,
                "app_name": target_name,
                "message": f"Could not close {target_name}. It may not be currently running."
            }

    def list_installed_apps(self) -> List[Dict[str, str]]:
        """Returns sorted list of installed applications."""
        if not self._installed_cache:
            self.refresh_cache()
        unique_apps = {}
        for app_key, app_path in self._installed_cache.items():
            name = Path(app_path).stem
            if name not in unique_apps:
                unique_apps[name] = app_path
        return [{"name": name, "path": path} for name, path in sorted(unique_apps.items())]

app_resolver = ApplicationResolver()
