"""
Universal Command Router
Routes user voice and text directives to structured intents and invokes CommandExecutor.
"""

import re
from typing import Dict, Any, Optional
from backend.app.commands.media_parser import media_intent_parser
from backend.app.commands.app_resolver import app_resolver
from backend.app.commands.executor import command_executor
from backend.app.notifications.engine import notification_engine
from backend.app.reminders.manager import reminder_manager
from backend.app.memory.manager import memory_manager
from backend.app.search.engine import web_search_engine
from backend.app.vision.analyzer import screen_vision

class CommandRouter:
    def __init__(self):
        self.user_name = "Boss"

    def route(self, raw_text: str) -> Dict[str, Any]:
        """
        Receives raw transcript or text input.
        Normalizes, classifies intent, and executes via CommandExecutor.
        """
        text = raw_text.strip()
        lower = text.lower()

        # Normalize text: strip introductory wake words or polite greetings
        clean = re.sub(r'^(?:hey\s+|okay\s+|hi\s+)?jarvis[,:\s]*', '', lower).strip()
        clean = re.sub(r'^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+)', '', clean).strip()

        # -------------------------------------------------------------
        # 1. SLEEP & DEACTIVATE COMMANDS
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

        # -------------------------------------------------------------
        # 2. WAKE WORD ACKNOWLEDGMENT ("Jarvis", "Hey Jarvis")
        # -------------------------------------------------------------
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
        # 3. APPLICATION COMMANDS (OPEN & LAUNCH)
        # -------------------------------------------------------------
        open_app_match = re.search(r"^(?:open|launch|start|run)\s+(?:the\s+|my\s+)?(.+)", clean)
        if open_app_match:
            raw_target = open_app_match.group(1).strip()
            # Clean trailing words like "app", "application", "for me", "please"
            target = re.sub(r'\s+(?:app|application)$', '', raw_target, flags=re.IGNORECASE).strip()
            target = re.sub(r'\s+(?:for\s+me|please)[?.!]*$', '', target, flags=re.IGNORECASE).strip()
            target = re.sub(r'[?.!]+$', '', target).strip()

            # First: check if it's an explicit YouTube search command
            if target.startswith("youtube and search") or target.startswith("youtube to search"):
                search_query = re.sub(r'^youtube\s+(?:and|to)\s+search\s+(?:for\s+)?', '', target).strip()
                exec_res = command_executor.executeYouTubeSearch(search_query)
                return {
                    "intent": "YOUTUBE_SEARCH",
                    "tool": "youtube_search",
                    "query": search_query,
                    "executed": True,
                    "success": exec_res["success"],
                    "message": exec_res["message"],
                    "data": exec_res,
                    "stay_active": True
                }

            if target == "youtube":
                exec_res = command_executor.executeYouTubeMedia("", mediaType="VIDEO")
                return {
                    "intent": "OPEN_APPLICATION",
                    "target": "YouTube",
                    "executed": True,
                    "success": exec_res["success"],
                    "message": "Certainly, Boss. Opening YouTube.",
                    "data": exec_res,
                    "stay_active": True
                }

            # Attempt universal application resolution
            exec_res = command_executor.executeOpenApplication(target)
            return {
                "intent": "OPEN_APPLICATION",
                "tool": "application_launcher",
                "target": exec_res.get("app_name", target.title()),
                "executed": True,
                "success": exec_res["success"],
                "not_installed": exec_res.get("not_installed", False),
                "message": exec_res["message"],
                "data": exec_res,
                "stay_active": True
            }

        # -------------------------------------------------------------
        # 4. MEDIA INTENT PARSER (MUSIC, MOVIE_SONGS, COMEDY, VIDEO, YOUTUBE_SEARCH)
        # -------------------------------------------------------------
        media_intent = media_intent_parser.parse(clean)
        if media_intent:
            media_type = media_intent["mediaType"]
            query = media_intent.get("query", "").strip()

            if media_type == "YOUTUBE_SEARCH":
                if media_intent.get("isOpenOnly"):
                    exec_res = command_executor.executeYouTubeMedia("", mediaType="VIDEO")
                    return {
                        "intent": "OPEN_APPLICATION",
                        "target": "YouTube",
                        "executed": True,
                        "success": exec_res["success"],
                        "message": "Certainly, Boss. Opening YouTube.",
                        "data": exec_res,
                        "stay_active": True
                    }
                else:
                    exec_res = command_executor.executeYouTubeSearch(query)
                    return {
                        "intent": "YOUTUBE_SEARCH",
                        "tool": "youtube_search",
                        "query": query,
                        "executed": True,
                        "success": exec_res["success"],
                        "message": exec_res["message"],
                        "data": exec_res,
                        "stay_active": True
                    }
            else:
                # MUSIC, MOVIE_SONGS, COMEDY, VIDEO
                exec_res = command_executor.executeYouTubeMedia(query, mediaType=media_type)
                return {
                    "intent": "YOUTUBE_MEDIA",
                    "tool": "youtube_media",
                    "query": query,
                    "mediaType": media_type,
                    "executed": True,
                    "success": exec_res["success"],
                    "message": exec_res["message"],
                    "data": exec_res,
                    "stay_active": True
                }

        # -------------------------------------------------------------
        # 5. HARDWARE & SYSTEM STATUS COMMANDS
        # -------------------------------------------------------------
        if any(kw in clean for kw in [
            "cpu usage", "what's my cpu", "what is my cpu", "ram usage", "memory usage",
            "how much ram", "battery level", "what's my battery", "system status", "system info",
            "check my computer", "hardware status", "diagnostics"
        ]):
            cmd_type = "cpu" if "cpu" in clean else ("battery" if "battery" in clean else ("ram" if "ram" in clean or "memory" in clean else "all"))
            exec_res = command_executor.executeSystemCommand(cmd_type)
            return {
                "intent": "SYSTEM_STATUS",
                "tool": "system_status",
                "executed": True,
                "success": True,
                "message": exec_res["message"],
                "data": exec_res.get("metrics"),
                "stay_active": True
            }

        # -------------------------------------------------------------
        # 6. NOTIFICATION COMMANDS
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
        # 7. SCREEN ANALYSIS COMMANDS
        # -------------------------------------------------------------
        if any(kw in clean for kw in ["analyze screen", "analyze my screen", "what's on my screen", "read my screen", "look at my screen"]):
            screen_res = screen_vision.analyze_current_screen()
            return {
                "intent": "SCREEN_ANALYSIS",
                "tool": "screen_vision",
                "executed": True,
                "success": screen_res["success"],
                "message": screen_res.get("analysis", "Screen analyzed, Boss."),
                "data": screen_res,
                "stay_active": True
            }

        # -------------------------------------------------------------
        # 8. WEB SEARCH COMMANDS
        # -------------------------------------------------------------
        web_search_match = re.search(r"^(?:search\s+the\s+web\s+for|search\s+web\s+for|google|look\s+up)\s+(.+)", clean)
        if web_search_match:
            search_query = web_search_match.group(1).strip()
            search_res = web_search_engine.search(search_query)
            return {
                "intent": "SEARCH_WEB",
                "tool": "web_search",
                "query": search_query,
                "executed": True,
                "success": search_res["success"],
                "message": search_res.get("summary", f"Here is what I found for {search_query}, Boss."),
                "data": search_res,
                "stay_active": True
            }

        # -------------------------------------------------------------
        # 9. GENERAL CHAT / KNOWLEDGE QUESTIONS (e.g. "Explain artificial intelligence")
        # -------------------------------------------------------------
        return {
            "intent": "GENERAL_CHAT",
            "tool": "chat_engine",
            "query": text,
            "executed": False,
            "stay_active": True
        }

    def route_command(self, raw_text: str) -> Dict[str, Any]:
        """Alias for route."""
        return self.route(raw_text)

command_router = CommandRouter()
