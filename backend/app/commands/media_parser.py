"""
Media Intent Detection Service
Deterministic classifier for music, movie songs, comedy, videos, and YouTube searches.
"""

import re
from typing import Dict, Any, Optional

class MediaIntentParser:
    """
    Parses user input into structured media intents:
    - MUSIC
    - MOVIE_SONGS
    - COMEDY
    - VIDEO
    - YOUTUBE_SEARCH
    """

    @staticmethod
    def parse(clean_text: str) -> Optional[Dict[str, Any]]:
        clean = clean_text.strip()
        lower = clean.lower()

        # 1. YOUTUBE_SEARCH (explicit YouTube request or search directive)
        # "open youtube and search python", "search youtube for python tutorial", "open youtube"
        if lower in ["open youtube", "launch youtube"]:
            return {
                "mediaType": "YOUTUBE_SEARCH",
                "query": "",
                "isOpenOnly": True
            }

        yt_search_match = re.search(
            r"^(?:open\s+youtube\s+and\s+search\s+(?:for\s+)?|search\s+youtube\s+for\s+|search\s+on\s+youtube\s+for\s+|find\s+on\s+youtube\s+|find\s+videos\s+about\s+)(.+)",
            clean,
            re.IGNORECASE
        )
        if yt_search_match:
            query = yt_search_match.group(1).strip()
            # If the user says "open youtube and search Soori comedy", it's a YouTube search for Soori comedy
            return {
                "mediaType": "YOUTUBE_SEARCH",
                "query": query,
                "isOpenOnly": False
            }

        # 2. MOVIE + PARTICULAR SONG OR MOVIE SONGS
        # "Play [song] from [movie]"
        movie_song_match = re.search(
            r"^(?:play|give\s+me|show\s+me)\s+(?:the\s+)?song\s+(.+?)\s+from\s+(.+)",
            clean,
            re.IGNORECASE
        )
        if movie_song_match:
            song = movie_song_match.group(1).strip()
            movie = movie_song_match.group(2).strip()
            query = f"{song} from {movie}"
            return {
                "mediaType": "MOVIE_SONGS",
                "query": query,
                "song": song,
                "movie": movie
            }

        # "Play songs from [movie]", "Play movie songs from [movie]", "Play the songs of [movie]"
        movie_from_match = re.search(
            r"^(?:play|give\s+me|show\s+me)\s+(?:the\s+)?(?:songs?\s+from|movie\s+songs?\s+from|songs?\s+of)\s+(.+)",
            clean,
            re.IGNORECASE
        )
        if movie_from_match:
            movie = movie_from_match.group(1).strip()
            # Clean trailing words like "movie" or "film"
            cleaned_movie = re.sub(r'\s+(?:movie|film)$', '', movie, flags=re.IGNORECASE).strip()
            query = f"{cleaned_movie} songs"
            return {
                "mediaType": "MOVIE_SONGS",
                "query": query,
                "movie": cleaned_movie
            }

        # "Play [movie] movie songs", "Play [movie] songs"
        # Example: "Play Jana Nayagan songs", "Play Leo movie songs", "Play Vikram songs"
        movie_songs_match = re.search(
            r"^(?:play|give\s+me|show\s+me)\s+(.+?)\s+(?:movie\s+songs|songs)$",
            clean,
            re.IGNORECASE
        )
        if movie_songs_match:
            subject = movie_songs_match.group(1).strip()
            # Avoid classifying generic genres like "sad", "love", "breakup", "vibe" as movies
            generic_genres = ["love", "breakup", "sad", "happy", "vibe", "tamil vibe", "gana", "kuthu", "melody", "english", "hindi", "malayalam", "trending", "old", "90s", "relaxing", "workout", "rock", "pop", "party"]
            if not any(subject.lower() == g or subject.lower() == f"tamil {g}" for g in generic_genres):
                query = f"{subject} songs"
                return {
                    "mediaType": "MOVIE_SONGS",
                    "query": query,
                    "movie": subject
                }

        # 3. COMEDY REQUESTS
        # "Play comedy videos", "Play Soori comedy", "Play Soori comedy videos", "Play Vadivelu comedy", "Play Santhanam comedy", "Play Tamil comedy"
        comedy_match = re.search(
            r"^(?:play|give\s+me\s+(?:some\s+)?|show\s+me\s+(?:some\s+)?)(?:a\s+|some\s+)?(.+?\bcomedy(?:\s+videos?)?)$",
            clean,
            re.IGNORECASE
        )
        if comedy_match:
            query = comedy_match.group(1).strip()
            return {
                "mediaType": "COMEDY",
                "query": query
            }

        # 4. VIDEO REQUESTS
        # "Play Python tutorial", "Play Java tutorial", "Play AI videos", "Play coding videos", "Play funny videos", "Play movie clips", "Play movie trailers", "Play cricket videos", "Play motivation videos", "Play [ANYTHING] videos"
        video_match = re.search(
            r"^(?:play|give\s+me|show\s+me)\s+(.+?\b(?:tutorial|videos?|clips?|trailers?|highlights?))",
            clean,
            re.IGNORECASE
        )
        if video_match:
            query = video_match.group(1).strip()
            return {
                "mediaType": "VIDEO",
                "query": query
            }

        # 5. MUSIC REQUESTS (ANY TYPE OF SONG, GENRE, OR SPECIFIC SONG)
        # "Play love songs", "Play breakup songs", "Play sad songs", "Play Tamil vibe songs", "Play Vaathi Coming", "Play Arabic Kuthu", "Play [ANY SONG]"
        music_match = re.search(
            r"^(?:play|sing)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+)?(.+)",
            clean,
            re.IGNORECASE
        )
        if music_match:
            query = music_match.group(1).strip()
            return {
                "mediaType": "MUSIC",
                "query": query
            }

        i_want_match = re.search(
            r"^(?:i\s+want\s+(?:to\s+listen\s+to|some\s+)?|i\'m\s+feeling\s+\w+[,:\s]+play\s+(?:some\s+)?)(.+)",
            clean,
            re.IGNORECASE
        )
        if i_want_match:
            query = i_want_match.group(1).strip()
            return {
                "mediaType": "MUSIC",
                "query": query
            }

        return None

media_intent_parser = MediaIntentParser()
