"""
Universal YouTube & Media Service
Constructs safe YouTube queries, opens YouTube search/videos, and manages media execution.
"""

import urllib.parse
import subprocess
import platform
import re
from typing import Dict, Any, Optional

class YouTubeService:
    def __init__(self):
        self.os_type = platform.system()

    def _open_in_browser(self, url: str) -> bool:
        """Safely opens a verified URL in the default macOS/system browser."""
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

    def openSearch(self, query: str) -> Dict[str, Any]:
        """Encodes query safely and opens YouTube search results."""
        clean = query.strip()
        encoded = urllib.parse.quote(clean)
        youtube_url = f"https://www.youtube.com/results?search_query={encoded}"
        opened = self._open_in_browser(youtube_url)

        if not opened:
            return {
                "success": False,
                "query": clean,
                "url": youtube_url,
                "message": "Sorry, Boss. I couldn't open YouTube."
            }

        return {
            "success": True,
            "query": clean,
            "url": youtube_url,
            "message": f"I've opened the YouTube results, Boss."
        }

    def openVideo(self, url: str) -> Dict[str, Any]:
        """Directly opens a specific YouTube video URL."""
        if not (url.startswith("https://www.youtube.com/") or url.startswith("https://youtu.be/")):
            return {
                "success": False,
                "url": url,
                "message": "Sorry, Boss. That is not a valid YouTube URL."
            }

        opened = self._open_in_browser(url)
        return {
            "success": opened,
            "url": url,
            "message": "Playing now, Boss." if opened else "Sorry, Boss. Failed to open video."
        }

    def search(self, query: str) -> Dict[str, Any]:
        """Executes a YouTube search for the given query."""
        clean = query.strip()
        clean = re.sub(r'^(?:open\s+youtube\s+and\s+search\s+for|open\s+youtube\s+and\s+search|search\s+youtube\s+for|search\s+on\s+youtube\s+for|find\s+on\s+youtube|find\s+videos\s+about)\s+', '', clean, flags=re.IGNORECASE).strip()
        return self.openSearch(clean)

    def play(self, query: str, media_type: str = "MUSIC") -> Dict[str, Any]:
        """
        Receives media query and opens YouTube search for playback.
        Returns truthful execution status.
        """
        clean = query.strip()
        clean = re.sub(r'\s+(?:for\s+me|for\s+us|please)$', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'^(?:can\s+you\s+|please\s+)?(?:play|sing)\s+(?:me\s+)?(?:a\s+|an\s+|any\s+|some\s+)?', '', clean, flags=re.IGNORECASE).strip()
        clean = re.sub(r'^(?:i\s+want\s+(?:some\s+)?|i\'m\s+feeling\s+\w+,\s*play\s+(?:some\s+)?|give\s+me\s+(?:some\s+)?)', '', clean, flags=re.IGNORECASE).strip()

        if not clean:
            clean = "top hits songs"

        # Generate custom natural butler response for Boss
        if media_type == "MOVIE_SONGS":
            reply = f"Certainly, Boss. Opening {clean} on YouTube."
        elif media_type == "COMEDY":
            reply = f"Right away, Boss. Opening {clean} on YouTube."
        elif media_type == "VIDEO":
            reply = f"Certainly, Boss. Opening {clean} on YouTube."
        elif "vibe" in clean.lower():
            reply = f"Of course, Boss. Opening {clean}."
        else:
            reply = f"Certainly, Boss. Opening {clean} on YouTube."

        res = self.openSearch(clean)
        if res["success"]:
            res["message"] = reply
        return res

    # Backwards compatibility helper methods
    def play_music(self, query: str) -> Dict[str, Any]:
        return self.play(query, media_type="MUSIC")

    def play_movie_songs(self, query: str) -> Dict[str, Any]:
        return self.play(query, media_type="MOVIE_SONGS")

    def play_youtube_video(self, query: str) -> Dict[str, Any]:
        return self.play(query, media_type="COMEDY" if "comedy" in query.lower() else "VIDEO")

    def search_youtube(self, query: str) -> Dict[str, Any]:
        return self.search(query)

    def open_youtube(self) -> Dict[str, Any]:
        opened = self._open_in_browser("https://www.youtube.com")
        return {
            "success": opened,
            "url": "https://www.youtube.com",
            "message": "Certainly, Boss. Opening YouTube." if opened else "Sorry, Boss. Could not open YouTube."
        }

youtube_service = YouTubeService()
