"""
JARVIS Central Context and Session State Manager
Maintains persistent contextual tracking across system-wide voice and text commands.
Enforces truthful application tracking, last-opened targets, and debug logs.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime

class AssistantContextManager:
    def __init__(self):
        self.lastOpenedApplication: Optional[str] = None
        self.activeTargetApplication: Optional[str] = None
        self.lastYouTubeTarget: Optional[str] = None
        self.lastCommand: Optional[str] = None
        self.currentState: str = "SLEEPING" # IDLE, LISTENING, PROCESSING, EXECUTING, SPEAKING, SLEEPING, ERROR
        self.isActive: bool = False
        self.debug_logs: List[Dict[str, Any]] = []

    def set_active(self, active: bool):
        self.isActive = active
        self.currentState = "LISTENING" if active else "SLEEPING"

    def set_state(self, state: str):
        self.currentState = state

    def record_opened_app(self, app_name: str):
        self.lastOpenedApplication = app_name
        self.activeTargetApplication = app_name
        # Clear YouTube target if another application was opened
        self.lastYouTubeTarget = None

    def record_youtube_target(self, query: str = ""):
        self.lastYouTubeTarget = "YouTube"
        self.activeTargetApplication = "YouTube"

    def record_closed_target(self, target: str):
        if self.lastOpenedApplication and self.lastOpenedApplication.lower() == target.lower():
            self.lastOpenedApplication = None
        if self.activeTargetApplication and self.activeTargetApplication.lower() == target.lower():
            self.activeTargetApplication = None
        if target.lower() == "youtube":
            self.lastYouTubeTarget = None

    def get_close_candidate(self) -> Optional[str]:
        """
        Resolves the contextual target for 'close the app', 'close it', 'quit it', 'exit it'.
        Priority:
        1. If YouTube was the last targeted entity -> 'YouTube'
        2. If an application was last opened -> lastOpenedApplication
        3. activeTargetApplication
        """
        if self.lastYouTubeTarget == "YouTube":
            return "YouTube"
        if self.lastOpenedApplication:
            return self.lastOpenedApplication
        if self.activeTargetApplication:
            return self.activeTargetApplication
        return None

    def log_debug_entry(self, entry: Dict[str, Any]):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry["timestamp"] = timestamp
        self.debug_logs.insert(0, entry)
        if len(self.debug_logs) > 100:
            self.debug_logs.pop()

        # Terminal debug print per Requirement 23
        print("\n" + "=" * 50)
        print(f"[{timestamp}] JARVIS PIPELINE TELEMETRY:")
        for k, v in entry.items():
            if k != "timestamp":
                print(f"  {k.upper()}: {v}")
        print("=" * 50 + "\n")

    def get_status(self) -> Dict[str, Any]:
        return {
            "isActive": self.isActive,
            "currentState": self.currentState,
            "lastOpenedApplication": self.lastOpenedApplication,
            "activeTargetApplication": self.activeTargetApplication,
            "lastYouTubeTarget": self.lastYouTubeTarget,
            "lastCommand": self.lastCommand
        }

assistant_context = AssistantContextManager()
