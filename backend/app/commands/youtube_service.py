"""
Universal YouTube & Media Service
Constructs safe YouTube queries and launches media in the default browser.
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
        Plays any song, vibe, melody, genre, or specific song on YouTube.
        """
        clean = query.strip()
        clean = re.sub(r'\s+(?:for\s+me|for\s+us|please)$', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'^(?:can\s+you\s+|please\s+)?(?:play|sing)\s+(?:me\s+)?(?:a\s+|an\s+|any\s+|some\s+)?', '', clean, flags=re.IGNORECASE).strip()
        clean = re.sub(r'^(?:i\s+want\s+(?:some\s+)?|i\'m\s+feeling\s+\w+,\s*play\s+(?:some\s+)?|give\s+me\s+(?:some\s+)?)', '', clean, flags=re.IGNORECASE).strip()

        if not clean or clean.lower() in ["music", "song", "songs"]:
            clean = "top hits songs"

        encoded = urllib.parse.quote(clean)
        youtube_url = f"https://www.youtube.com/results?search_query={encoded}"

        opened = self._open_in_browser(youtube_url)
        if not opened:
            return {
                "success": False,
                "intent": "PLAY_MUSIC",
                "tool": "play_music",
                "query": clean,
                "service": "YouTube",
                "message": "Sorry, Boss. I couldn't open YouTube."
            }

        # Format natural butler response addressing Boss
        if "vibe" in clean.lower():
            reply = f"Of course, Boss. I'll find some {clean} for you."
        elif "love" in clean.lower():
            reply = f"Certainly, Boss. Playing {clean} on YouTube."
        elif "breakup" in clean.lower():
            reply = f"Sure, Boss. Playing {clean}."
        elif "song" in clean.lower():
            reply = f"Of course, Boss. I'll find {clean} for you."
        else:
            reply = f"Certainly, Boss. Playing {clean} on YouTube."

        return {
            "success": True,
            "intent": "PLAY_MUSIC",
            "tool": "play_music",
            "query": clean,
            "service": "YouTube",
            "url": youtube_url,
            "message": reply
        }

    def play_movie_songs(self, query: str) -> Dict[str, Any]:
        """
        Plays songs from any specified movie (e.g. Jana Nayagan, Leo, Vikram).
        """
        clean = query.strip()
        clean = re.sub(r'\s+(?:for\s+me|for\s+us|please)$', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'^(?:can\s+you\s+|please\s+)?(?:play|give\s+me)\s+(?:songs?\s+from\s+|the\s+songs?\s+from\s+|movie\s+songs?\s+from\s+)', '', clean, flags=re.IGNORECASE).strip()
        clean = re.sub(r'^(?:i\s+want\s+songs?\s+from\s+)', '', clean, flags=re.IGNORECASE).strip()

        # If user said "Jana Nayagan movie songs", preserve or append "songs"
        if not re.search(r'\bsongs?\b', clean, re.IGNORECASE):
            clean_search = f"{clean} songs"
        else:
            clean_search = clean

        encoded = urllib.parse.quote(clean_search)
        youtube_url = f"https://www.youtube.com/results?search_query={encoded}"

        opened = self._open_in_browser(youtube_url)
        if not opened:
            return {
                "success": False,
                "intent": "PLAY_MOVIE_SONGS",
                "tool": "play_movie_songs",
                "query": clean_search,
                "service": "YouTube",
                "message": "Sorry, Boss. I couldn't open YouTube."
            }

        return {
            "success": True,
            "intent": "PLAY_MOVIE_SONGS",
            "tool": "play_movie_songs",
            "query": clean_search,
            "service": "YouTube",
            "url": youtube_url,
            "message": f"Certainly, Boss. Opening {clean_search} on YouTube."
        }

    def play_youtube_video(self, query: str) -> Dict[str, Any]:
        """
        Plays comedy videos or general non-song videos (e.g. Soori comedy, Vadivelu comedy).
        """
        clean = query.strip()
        clean = re.sub(r'\s+(?:for\s+me|for\s+us|please)$', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'^(?:can\s+you\s+|please\s+)?(?:play|give\s+me\s+some|show\s+me)\s+(?:a\s+|an\s+|some\s+)?', '', clean, flags=re.IGNORECASE).strip()

        encoded = urllib.parse.quote(clean)
        youtube_url = f"https://www.youtube.com/results?search_query={encoded}"

        opened = self._open_in_browser(youtube_url)
        if not opened:
            return {
                "success": False,
                "intent": "PLAY_YOUTUBE_VIDEO",
                "tool": "play_youtube_video",
                "query": clean,
                "service": "YouTube",
                "message": "Sorry, Boss. I couldn't open YouTube."
            }

        return {
            "success": True,
            "intent": "PLAY_YOUTUBE_VIDEO",
            "tool": "play_youtube_video",
            "query": clean,
            "service": "YouTube",
            "url": youtube_url,
            "message": f"Certainly, Boss. Opening {clean} on YouTube."
        }

    def search_youtube(self, query: str) -> Dict[str, Any]:
        """
        Direct search for tutorials, educational content, topics on YouTube.
        """
        clean = query.strip()
        clean = re.sub(r'^(?:open\s+youtube\s+and\s+search\s+for|open\s+youtube\s+and\s+search|search\s+youtube\s+for|search\s+on\s+youtube\s+for|find\s+on\s+youtube|find\s+videos\s+about)\s+', '', clean, flags=re.IGNORECASE).strip()

        encoded = urllib.parse.quote(clean)
        youtube_url = f"https://www.youtube.com/results?search_query={encoded}"

        opened = self._open_in_browser(youtube_url)
        if not opened:
            return {
                "success": False,
                "intent": "SEARCH_YOUTUBE",
                "tool": "search_youtube",
                "query": clean,
                "service": "YouTube",
                "message": "Sorry, Boss. I couldn't open YouTube."
            }

        return {
            "success": True,
            "intent": "SEARCH_YOUTUBE",
            "tool": "search_youtube",
            "query": clean,
            "service": "YouTube",
            "url": youtube_url,
            "message": f"I've opened YouTube with your search for {clean}, Boss."
        }

    def open_youtube(self) -> Dict[str, Any]:
        youtube_url = "https://www.youtube.com"
        opened = self._open_in_browser(youtube_url)
        return {
            "success": opened,
            "intent": "OPEN_YOUTUBE",
            "tool": "open_youtube",
            "service": "YouTube",
            "message": "Certainly, Boss. Opening YouTube." if opened else "Sorry, Boss. I couldn't open YouTube."
        }

youtube_service = YouTubeService()
