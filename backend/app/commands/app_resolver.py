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
        # Remove polite introductory words
        clean = re.sub(r'^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+)', '', clean).strip()
        # Remove command words: open, launch, start, run
        clean = re.sub(r'^(?:open|launch|start|run)\s+(?:the\s+)?', '', clean).strip()
        # Remove trailing words: "for me", "app", "application"
        clean = re.sub(r'\s+(?:for\s+me|please)$', '', clean).strip()
        clean = re.sub(r'\s+(?:app|application)$', '', clean).strip()

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

    def launch(self, query: str) -> Dict[str, Any]:
        """
        Validates and safely launches an application on macOS without shell=True.
        Returns truthful execution status.
        """
        found = self.resolveApplication(query)
        clean_target = APP_ALIASES.get(query.lower().strip(), query.strip())

        if not found:
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
        """Safely quits an application using osascript or killall."""
        found = self.resolveApplication(query)
        app_name = found[0] if found else query.strip().title()

        if self.os_type == "Darwin":
            try:
                # Graceful quit via AppleScript
                apple_script = f'tell application "{app_name}" to quit'
                subprocess.run(["osascript", "-e", apple_script], capture_output=True, timeout=5)
                return {
                    "success": True,
                    "app_name": app_name,
                    "message": f"Closing {app_name}, Boss."
                }
            except Exception:
                # Force kill if needed
                try:
                    subprocess.run(["killall", app_name], capture_output=True, timeout=5)
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
                        "message": f"Failed to close {app_name}, Boss."
                    }

        return {
            "success": False,
            "app_name": app_name,
            "message": f"Closing applications is only supported on macOS, Boss."
        }

    def list_installed_apps(self) -> List[str]:
        self.refresh_cache()
        return sorted([Path(p).stem for p in self._installed_cache.values()])

app_resolver = ApplicationResolver()
