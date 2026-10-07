"""
YouTube & Music Service
Constructs and opens YouTube music searches and video streams in the user's default browser.
"""

import urllib.parse
import subprocess
import platform
import re
from typing import Dict, Any

class YouTubeService:
    def __init__(self):
        self.os_type = platform.system()

    def _open_in_browser(self, url: str) -> bool:
        try:
            if self.os_type == "Darwin":
                subprocess.Popen(["open", url])
            elif self.os_type == "Windows":
                import os
                os.startfile(url)
            else:
                subprocess.Popen(["xdg-open", url])
            return True
        except Exception as e:
            print("Failed to open browser:", e)
            return False

    def play_music(self, query: str) -> Dict[str, Any]:
        """
        Interprets music requests (e.g. 'any love song', 'romantic songs', 'Tamil love songs')
        and launches YouTube in the browser.
        """
        clean = query.strip()
        # Clean phrases like "for me", "for us", "please"
        clean = re.sub(r'\s+(?:for\s+me|for\s+us|please)$', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'^(?:please\s+)?(?:play|sing)\s+(?:me\s+)?(?:a\s+|an\s+|any\s+|some\s+)?', '', clean, flags=re.IGNORECASE)

        if not clean or clean.lower() in ["music", "song", "songs"]:
            clean = "top hits songs"

        encoded = urllib.parse.quote(clean)
        youtube_url = f"https://www.youtube.com/results?search_query={encoded}"

        opened = self._open_in_browser(youtube_url)

        if not opened:
            return {
                "success": False,
                "tool": "play_music",
                "query": clean,
                "message": "Sorry, I couldn't open YouTube."
            }

        # Format pleasant natural voice response
        if "love" in clean.lower():
            reply = "Certainly. Playing a love song for you on YouTube."
        elif "song" in clean.lower() or "music" in clean.lower():
            reply = f"Certainly. Searching YouTube for {clean}."
        else:
            reply = f"Of course. Searching YouTube for {clean}."

        return {
            "success": True,
            "tool": "play_music",
            "query": clean,
            "url": youtube_url,
            "message": reply
        }

    def search_youtube(self, query: str) -> Dict[str, Any]:
        """Searches YouTube directly for tutorials, topics, or videos."""
        clean = re.sub(r'^(?:search\s+youtube\s+for|find\s+on\s+youtube|search\s+for)\s+', '', query, flags=re.IGNORECASE).strip()
        encoded = urllib.parse.quote(clean)
        youtube_url = f"https://www.youtube.com/results?search_query={encoded}"

        opened = self._open_in_browser(youtube_url)
        if not opened:
            return {
                "success": False,
                "tool": "youtube_search",
                "query": clean,
                "message": "Sorry, I couldn't open YouTube."
            }

        return {
            "success": True,
            "tool": "youtube_search",
            "query": clean,
            "url": youtube_url,
            "message": f"Searching YouTube for {clean}."
        }

    def open_youtube(self) -> Dict[str, Any]:
        youtube_url = "https://www.youtube.com"
        opened = self._open_in_browser(youtube_url)
        return {
            "success": opened,
            "tool": "open_youtube",
            "url": youtube_url,
            "message": "Opening YouTube." if opened else "Could not open YouTube."
        }

youtube_service = YouTubeService()
