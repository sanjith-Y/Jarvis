"""
Intent Detection and Universal Command Router
Deterministic classification and execution of computer operations, YouTube media, application controls, and hardware actions.
"""

import re
import urllib.parse
from typing import Dict, Any, Optional, List
from backend.app.commands.app_resolver import app_resolver
from backend.app.commands.youtube_service import youtube_service
from backend.app.system.monitor import system_monitor
from backend.app.notifications.engine import notification_engine
from backend.app.reminders.manager import reminder_manager
from backend.app.memory.manager import memory_manager
from backend.app.search.engine import web_search_engine
from backend.app.vision.analyzer import screen_vision
from backend.app.files.assistant import file_assistant
from backend.app.config import settings

class CommandRouter:
    def __init__(self):
        self.user_name = "Boss"

    def route_command(self, raw_text: str) -> Dict[str, Any]:
        """
        Main entry point for command classification and deterministic execution.
        """
        text = raw_text.strip()
        lower = text.lower()

        # Clean introductory wake words or polite greetings
        clean = re.sub(r'^(?:hey\s+|okay\s+|hi\s+)?jarvis[,:\s]*', '', lower).strip()
        clean = re.sub(r'^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+)', '', clean).strip()

        # -------------------------------------------------------------
        # 1. SLEEP & SESSION COMMANDS
        # -------------------------------------------------------------
        if any(clean == s or clean.startswith(s) for s in [
            "stop listening", "stop jarvis", "go to sleep", "sleep jarvis",
            "deactivate jarvis", "turn off listening", "that's all", "good night jarvis",
            "standby", "enter standby"
        ]):
            return {
                "intent": "SLEEP",
                "tool": "session_control",
                "is_sleep": True,
                "success": True,
                "message": "Understood, Boss. I'll stand by.",
                "stay_active": False
            }

        # WAKE ACKNOWLEDGMENT (when user says "Jarvis")
        if clean in ["", "wake up", "are you there", "hello", "hi"]:
            return {
                "intent": "WAKE",
                "tool": "session_control",
                "is_wake": True,
                "success": True,
                "message": "Yes, Boss?",
                "stay_active": True
            }

        # -------------------------------------------------------------
        # 2. MULTI-ACTION COMMAND DETECTION
        # e.g. "Open Chrome and search YouTube for Tamil love songs"
        # -------------------------------------------------------------
        if " and " in clean:
            parts = [p.strip() for p in clean.split(" and ")]
            if len(parts) == 2 and any(p.startswith("open") or p.startswith("launch") for p in parts):
                res1 = self._route_single_intent(parts[0])
                res2 = self._route_single_intent(parts[1])
                if res1.get("executed") and res2.get("executed"):
                    combined_msg = f"{res1.get('message')} Also, {res2.get('message')}"
                    return {
                        "intent": "MULTI_ACTION",
                        "tool": "multi_executor",
                        "executed": True,
                        "success": res1.get("success") and res2.get("success"),
                        "message": combined_msg,
                        "stay_active": True,
                        "sub_actions": [res1, res2]
                    }

        # -------------------------------------------------------------
        # 3. SINGLE INTENT ROUTING
        # -------------------------------------------------------------
        return self._route_single_intent(clean, original_text=text)

    def _route_single_intent(self, clean: str, original_text: str = "") -> Dict[str, Any]:
        # -------------------------------------------------------------
        # A. YOUTUBE INTENTS (SEARCH_YOUTUBE, PLAY_MOVIE_SONGS, PLAY_YOUTUBE_VIDEO, PLAY_MUSIC)
        # -------------------------------------------------------------

        # A1. SEARCH_YOUTUBE
        # Matches: "open youtube and search python tutorial", "search youtube for python tutorial", "find on youtube ..."
        yt_search_match = re.search(
            r"^(?:open\s+youtube\s+and\s+search\s+(?:for\s+)?|search\s+youtube\s+for\s+|search\s+on\s+youtube\s+for\s+|find\s+on\s+youtube\s+|find\s+videos\s+about\s+)(.+)",
            clean
        )
        if yt_search_match:
            query = yt_search_match.group(1).strip()
            res = youtube_service.search_youtube(query)
            return {
                "intent": "SEARCH_YOUTUBE",
                "tool": "youtube_search",
                "executed": True,
                "success": res["success"],
                "message": res["message"],
                "data": res,
                "stay_active": True
            }

        if clean == "open youtube":
            res = youtube_service.open_youtube()
            return {
                "intent": "OPEN_YOUTUBE",
                "tool": "youtube_open",
                "executed": True,
                "success": res["success"],
                "message": res["message"],
                "data": res,
                "stay_active": True
            }

        # A2. PLAY_MOVIE_SONGS
        # Matches: "play jana nayagan movie songs", "give me songs from jana nayagan", "play songs from leo", "play songs from vikram", "give me a song from leo"
        movie_match1 = re.search(
            r"^(?:play|give\s+me)\s+(?:the\s+)?(?:songs?\s+from|movie\s+songs?\s+from|movie\s+songs?\s+of)\s+(.+)",
            clean
        )
        movie_match2 = re.search(
            r"^(?:play|give\s+me)\s+(.+?)\s+movie\s+songs",
            clean
        )
        movie_match3 = re.search(
            r"^(?:play|give\s+me)\s+(?:the\s+)?song\s+(.+?)\s+from\s+(.+)",
            clean
        )
        movie_match4 = re.search(
            r"^i\s+want\s+(?:some\s+)?songs?\s+from\s+(.+?)(?:\s+movie)?$",
            clean
        )

        if movie_match3:
            song_name = movie_match3.group(1).strip()
            movie_name = movie_match3.group(2).strip()
            query = f"{song_name} from {movie_name}"
            res = youtube_service.play_movie_songs(query)
            return {
                "intent": "PLAY_MOVIE_SONGS",
                "tool": "youtube_play_movie_songs",
                "executed": True,
                "success": res["success"],
                "message": res["message"],
                "data": res,
                "stay_active": True
            }

        if movie_match1 or movie_match2 or movie_match4:
            matched_group = movie_match1 or movie_match2 or movie_match4
            movie_query = matched_group.group(1).strip()
            res = youtube_service.play_movie_songs(movie_query)
            return {
                "intent": "PLAY_MOVIE_SONGS",
                "tool": "youtube_play_movie_songs",
                "executed": True,
                "success": res["success"],
                "message": res["message"],
                "data": res,
                "stay_active": True
            }

        # A3. PLAY_YOUTUBE_VIDEO (Comedy & General Videos)
        # Matches: "play a comedy video", "play soori comedy", "play vadivelu comedy", "play vadivelu comedy videos", "play santhanam comedy", "play tamil comedy videos", "give me some soori comedy"
        comedy_match = re.search(
            r"^(?:play|give\s+me\s+(?:some\s+)?|show\s+me\s+(?:some\s+)?)(?:a\s+|an\s+|some\s+)?(.+?\bcomedy(?:\s+videos?)?)",
            clean
        )
        if comedy_match:
            video_query = comedy_match.group(1).strip()
            res = youtube_service.play_youtube_video(video_query)
            return {
                "intent": "PLAY_YOUTUBE_VIDEO",
                "tool": "youtube_play_video",
                "executed": True,
                "success": res["success"],
                "message": res["message"],
                "data": res,
                "stay_active": True
            }

        # A4. PLAY_MUSIC (Any genre, vibe, artist, or specific song name)
        # Matches: "play love songs", "play breakup songs", "play sad songs", "play vibe songs", "play tamil vibe songs", "play vaathi coming", "play arabic kuthu", "i want some breakup songs"
        music_match1 = re.search(r"^(?:play|sing)\s+(.+)", clean)
        music_match2 = re.search(r"^i\s+want\s+(?:some\s+)?(.+?\bsongs?)", clean)
        music_match3 = re.search(r"^i\'m\s+feeling\s+\w+[,:\s]+play\s+(?:some\s+)?(.+)", clean)

        if music_match1 or music_match2 or music_match3:
            matched_music = music_match1 or music_match2 or music_match3
            song_query = matched_music.group(1).strip()
            res = youtube_service.play_music(song_query)
            return {
                "intent": "PLAY_MUSIC",
                "tool": "youtube_play_music",
                "executed": True,
                "success": res["success"],
                "message": res["message"],
                "data": res,
                "stay_active": True
            }

        # -------------------------------------------------------------
        # B. APPLICATION COMMANDS (OPEN & CLOSE)
        # -------------------------------------------------------------
        open_match = re.search(r"^(?:open|launch|start|run)\s+(?:the\s+)?(.+)", clean)
        if open_match:
            target_app = open_match.group(1).strip()
            # Clean trailing words like "app", "application"
            target_app = re.sub(r'\s+(?:app|application)$', '', target_app, flags=re.IGNORECASE).strip()

            # If target is a common website name like "google", "github", "youtube", "reddit"
            if target_app in ["google", "github", "gmail", "reddit", "twitter", "instagram"]:
                site_url = f"https://{target_app}.com" if target_app != "gmail" else "https://mail.google.com"
                youtube_service._open_in_browser(site_url)
                return {
                    "intent": "OPEN_WEBSITE",
                    "tool": "browser_open",
                    "executed": True,
                    "success": True,
                    "message": f"Certainly, Boss. Opening {target_app.title()}.",
                    "stay_active": True
                }

            # Otherwise launch application dynamically via ApplicationResolver
            launch_res = app_resolver.launch(target_app)
            return {
                "intent": "OPEN_APPLICATION",
                "tool": "application_launcher",
                "executed": True,
                "success": launch_res["success"],
                "app_name": launch_res.get("app_name", target_app),
                "message": launch_res["message"],
                "data": launch_res,
                "stay_active": True
            }

        close_match = re.search(r"^(?:close|quit|kill)\s+(?:the\s+)?(.+)", clean)
        if close_match:
            target_app = close_match.group(1).strip()
            target_app = re.sub(r'\s+(?:app|application)$', '', target_app, flags=re.IGNORECASE).strip()
            close_res = app_resolver.close(target_app)
            return {
                "intent": "CLOSE_APPLICATION",
                "tool": "application_closer",
                "executed": True,
                "success": close_res["success"],
                "app_name": close_res.get("app_name", target_app),
                "message": close_res["message"],
                "data": close_res,
                "stay_active": True
            }

        # -------------------------------------------------------------
        # C. SYSTEM STATUS COMMANDS
        # -------------------------------------------------------------
        if any(kw in clean for kw in [
            "cpu usage", "what's my cpu", "what is my cpu", "ram usage", "memory usage",
            "how much ram", "battery level", "what's my battery", "system status", "system info",
            "check my computer", "hardware status", "diagnostics"
        ]):
            metrics = system_monitor.get_current_metrics()
            if "cpu" in clean:
                msg = f"Your CPU is currently at {metrics['cpu_percent']} percent, Boss."
            elif "ram" in clean or "memory" in clean:
                msg = f"Memory usage is currently at {metrics['memory_percent']} percent ({metrics['memory_used_gb']} GB of {metrics['memory_total_gb']} GB), Boss."
            elif "battery" in clean:
                msg = f"Battery is at {metrics['battery']['percent']} percent and {metrics['battery']['status'].lower()}, Boss."
            else:
                msg = (
                    f"CPU is at {metrics['cpu_percent']} percent, "
                    f"memory usage is {metrics['memory_percent']} percent, and "
                    f"battery is at {metrics['battery']['percent']} percent, Boss."
                )
            return {
                "intent": "SYSTEM_STATUS",
                "tool": "system_status",
                "executed": True,
                "success": True,
                "message": msg,
                "data": metrics,
                "stay_active": True
            }

        # -------------------------------------------------------------
        # D. NOTIFICATION COMMANDS
        # -------------------------------------------------------------
        if any(kw in clean for kw in [
            "check notifications", "check my notifications", "any notifications",
            "summarize my notifications", "summarize notifications", "do i have anything important",
            "any important notifications", "what did i miss", "notification summary"
        ]):
            sum_data = notification_engine.generate_smart_summary()
            if "important" in clean or "critical" in clean:
                important_items = sum_data.get("important_items", []) + sum_data.get("critical_items", [])
                if important_items:
                    bullets = [f"'{n['title']}' from {n['source']}" for n in important_items[:2]]
                    reply = f"Certainly, Boss. Important notifications: {'; '.join(bullets)}."
                else:
                    reply = "You have no urgent or critical notifications at this time, Boss."
            else:
                total_cnt = sum_data.get("total", 0)
                reply = f"Certainly, Boss. You have {total_cnt} notifications. {sum_data.get('summary', '')}"

            return {
                "intent": "CHECK_NOTIFICATIONS",
                "tool": "notification_check",
                "executed": True,
                "success": True,
                "message": reply,
                "data": sum_data,
                "stay_active": True
            }

        # -------------------------------------------------------------
        # E. REMINDER COMMANDS
        # -------------------------------------------------------------
        if clean.startswith("remind me") or clean.startswith("set a reminder"):
            clean_title = re.sub(r'^(?:remind me(?:\s+to)?|set a reminder(?:\s+to)?)\s+', '', clean).strip()
            time_part = "in 1 hour"
            time_match = re.search(r"(?:at|in)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d+\s*(?:minutes?|hours?))", clean_title, re.IGNORECASE)
            if time_match:
                time_part = time_match.group(0)
                clean_title = clean_title.replace(time_part, "").strip()

            rem = reminder_manager.create_reminder(title=clean_title or "General Reminder", due_time=time_part)
            due_formatted = rem["due_time"].split()[1][:5]
            return {
                "intent": "CREATE_REMINDER",
                "tool": "reminder_create",
                "executed": True,
                "success": True,
                "message": f"Certainly, Boss. Reminder set: '{rem['title']}' for {due_formatted}.",
                "data": rem,
                "stay_active": True
            }

        # -------------------------------------------------------------
        # F. MEMORY COMMANDS
        # -------------------------------------------------------------
        if clean.startswith("remember that") or clean.startswith("remember this"):
            fact = re.sub(r'^remember\s+(?:that|this:?)\s+', '', clean).strip()
            saved = memory_manager.add_memory(content=fact)
            return {
                "intent": "MEMORY",
                "tool": "memory_store",
                "executed": True,
                "success": True,
                "message": "I'll remember that, Boss.",
                "data": saved,
                "stay_active": True
            }

        if "what is my project" in clean or "what is my main project" in clean or "what do you remember" in clean:
            memories = memory_manager.get_memories()
            project_mem = next((m for m in memories if "project" in m["content"].lower()), None)
            if project_mem:
                clean_val = re.sub(r"^(?:that\s+)?(?:my\s+)?(?:main\s+|current\s+)?project\s+is\s+", "", project_mem["content"], flags=re.IGNORECASE)
                return {
                    "intent": "MEMORY",
                    "tool": "memory_recall",
                    "executed": True,
                    "success": True,
                    "message": f"Your main project is {clean_val}, Boss.",
                    "stay_active": True
                }
            elif memories:
                return {
                    "intent": "MEMORY",
                    "tool": "memory_recall",
                    "executed": True,
                    "success": True,
                    "message": f"I recall: {memories[0]['content']}, Boss.",
                    "stay_active": True
                }
            return {
                "intent": "MEMORY",
                "tool": "memory_recall",
                "executed": True,
                "success": True,
                "message": "I don't have any specific records stored for that yet, Boss.",
                "stay_active": True
            }

        # -------------------------------------------------------------
        # G. SCREEN VISION COMMANDS
        # -------------------------------------------------------------
        if any(kw in clean for kw in ["analyze screen", "analyze my screen", "what's on my screen", "explain this error on screen"]):
            res = screen_vision.capture_and_analyze(prompt=clean)
            return {
                "intent": "SCREEN_ANALYSIS",
                "tool": "screen_vision",
                "executed": True,
                "success": res.get("success", False),
                "message": res.get("analysis", "Screen analysis complete, Boss."),
                "data": res,
                "stay_active": True
            }

        # -------------------------------------------------------------
        # H. GENERAL WEB SEARCH
        # -------------------------------------------------------------
        search_match = re.search(r"^(?:search\s+(?:the\s+)?web\s+for|search\s+google\s+for|search\s+for|google)\s+(.+)", clean)
        if search_match:
            search_query = search_match.group(1).strip()
            encoded_query = urllib.parse.quote(search_query)
            youtube_service._open_in_browser(f"https://www.google.com/search?q={encoded_query}")
            search_res = web_search_engine.search(search_query)
            return {
                "intent": "SEARCH_WEB",
                "tool": "web_search",
                "executed": True,
                "success": True,
                "message": f"Searching Google for {search_query}, Boss.",
                "data": search_res,
                "stay_active": True
            }

        # -------------------------------------------------------------
        # I. GENERAL CONVERSATION FALLBACK
        # -------------------------------------------------------------
        return {
            "intent": "GENERAL_CHAT",
            "executed": False,
            "stay_active": True,
            "text": original_text or clean
        }

command_router = CommandRouter()
