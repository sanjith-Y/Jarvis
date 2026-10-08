import subprocess
import platform
import os
import re
from typing import Dict, Any, Optional
from backend.app.config import settings

class VoiceService:
    def __init__(self):
        self.os_type = platform.system()
        self.enabled = True
        self.voice_name = settings.VOICE_NAME or "Daniel"

    def speak(self, text: str, voice: Optional[str] = None) -> Dict[str, Any]:
        if not self.enabled or not text:
            return {"success": False, "message": "Voice disabled or empty text."}

        target_voice = voice or self.voice_name
        clean_text = re.sub(r'[*#_`]', '', text) # Strip markdown formatting
        clean_text = re.sub(r'\n+', ' ', clean_text).strip()

        try:
            if self.os_type == "Darwin":
                # Non-blocking voice execution via macOS native speech synthesizer
                subprocess.Popen(["say", "-v", target_voice, clean_text])
                return {"success": True, "method": "macos_say", "voice": target_voice, "text": clean_text}
            else:
                return {"success": True, "method": "browser_web_speech", "voice": target_voice, "text": clean_text}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def stop(self) -> bool:
        if self.os_type == "Darwin":
            try:
                subprocess.run(["pkill", "-9", "say"], check=False)
                return True
            except Exception:
                pass
        return False

voice_service = VoiceService()
