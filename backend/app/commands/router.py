"""
Universal Command Router
Routes user voice and text directives to structured intents and invokes CommandExecutor.
Enforces intent priorities:
1. OPEN_APPLICATION
2. CLOSE_APPLICATION
3. YOUTUBE_MEDIA
4. YOUTUBE_SEARCH
5. OPEN_WEBSITE
6. SYSTEM_COMMAND
7. OTHER REAL ACTIONS
8. GENERAL_CHAT (always last fallback)
"""

import re
from typing import Dict, Any, Optional
from backend.app.commands.media_parser import media_intent_parser
from backend.app.commands.app_resolver import app_resolver
from backend.app.commands.executor import command_executor
from backend.app.commands.youtube_service import youtube_service
from backend.app.commands.context import assistant_context
from backend.app.notifications.engine import notification_engine
from backend.app.reminders.manager import reminder_manager
from backend.app.memory.manager import memory_manager
from backend.app.search.engine import web_search_engine
from backend.app.vision.analyzer import screen_vision
from backend.app.ai.knowledge_engine import knowledge_engine

class CommandRouter:
    def __init__(self):
        self.user_name = "Boss"

    def _dispatch_result(self, raw_text: str, text: str, clean: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Logs telemetry to assistant_context and returns result."""
        assistant_context.lastCommand = clean
        assistant_context.log_debug_entry({
            "voice_received": raw_text,
            "transcript": text,
            "normalized": clean,
            "intent": result.get("intent"),
            "target": result.get("target") or result.get("query"),
            "action": result.get("tool"),
            "action_result": "SUCCESS" if result.get("success") else ("NOT_RUNNING" if result.get("not_running") else ("NOT_INSTALLED" if result.get("not_installed") else "FAILED")),
            "response": result.get("message")
        })
        return result

    def route(self, raw_text: str) -> Dict[str, Any]:
        """
        Receives raw transcript or text input.
        Normalizes, classifies intent, updates context, and executes via CommandExecutor.
        """
        text = raw_text.strip()
        lower = text.lower()

        # Normalize text: iteratively strip conversational speech preambles, wake words, politeness, and prepositions
        clean = lower
        changed = True
        while changed:
            prev = clean
            clean = re.sub(r'^(?:now\s+)?(?:i\s+said\s+|i\s+told\s+|i\s+asked\s+|tell\s+|ask\s+|i\s+want\s+you\s+to\s+|i\s+need\s+you\s+to\s+)', '', clean).strip()
            clean = re.sub(r'^(?:hey\s+|okay\s+|ok\s+|hi\s+|hello\s+)?(?:jarvis|jarvin|travis|java|javis|jarv)\b[,:\s]*', '', clean).strip()
            clean = re.sub(r'^(?:hey|okay|ok|hi|hello)\s+', '', clean).strip()
            clean = re.sub(r'^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+(?:please\s+)?|will\s+you\s+)', '', clean).strip()
            clean = re.sub(r'^(?:to|now)\s+', '', clean).strip()
            changed = (clean != prev)

        # -------------------------------------------------------------
        # 0A. COMMAND CODE 101 AWAKE / PROTOCOL 101 AWAKE
        # e.g. "Command code 101 awake", "Code 101 awake", "101 awake", "Command code 101 wake up"
        # -------------------------------------------------------------
        is_code_101_wake = (
            bool(re.search(r'\b(?:command\s+)?code\s+(?:101|one\s+zero\s+one|one\s+hundred\s+(?:and\s+)?one|one\s+oh\s+one)\s+(?:awake|wake(?:\s+up)?)\b', lower)) or
            bool(re.search(r'\b(?:command\s+)?code\s+(?:101|one\s+zero\s+one|one\s+hundred\s+(?:and\s+)?one|one\s+oh\s+one)\s+(?:awake|wake(?:\s+up)?)\b', clean)) or
            ("101" in lower and ("awake" in lower or "wake" in lower)) or
            clean in ["command code 101 awake", "code 101 awake", "command code 101 wake", "command code 101 wake up", "code 101 wake up", "101 awake"]
        )

        # -------------------------------------------------------------
        # 0B. COMMAND CODE 101 SLEEP / PROTOCOL 101 SLEEP
        # e.g. "Command code 101 sleep", "Code 101 sleep", "Command code 101 go to sleep"
        # -------------------------------------------------------------
        is_code_101_sleep = (
            bool(re.search(r'\b(?:command\s+)?code\s+(?:101|one\s+zero\s+one|one\s+hundred\s+(?:and\s+)?one|one\s+oh\s+one)\s+(?:sleep|go\s+to\s+sleep|standby)\b', lower)) or
            bool(re.search(r'\b(?:command\s+)?code\s+(?:101|one\s+zero\s+one|one\s+hundred\s+(?:and\s+)?one|one\s+oh\s+one)\s+(?:sleep|go\s+to\s+sleep|standby)\b', clean)) or
            ("101" in lower and ("sleep" in lower or "standby" in lower)) or
            clean in ["command code 101 sleep", "code 101 sleep", "command code 101 go to sleep", "101 sleep", "code 101 standby"]
        )

        if is_code_101_wake:
            assistant_context.set_active(True)
            return self._dispatch_result(raw_text, text, clean, {
                "intent": "WAKE",
                "tool": "session_control",
                "is_wake": True,
                "success": True,
                "message": "Command code 101 verified. System fully awake and standing by, Boss.",
                "stay_active": True
            })

        if is_code_101_sleep:
            assistant_context.set_active(False)
            return self._dispatch_result(raw_text, text, clean, {
                "intent": "SLEEP",
                "tool": "session_control",
                "is_sleep": True,
                "success": True,
                "message": "Command code 101 acknowledged. Subsystems entering sleep mode. Standing by for command code 101 awake, Boss.",
                "stay_active": False
            })

        # -------------------------------------------------------------
        # 1. GENERAL SLEEP & DEACTIVATE COMMANDS
        # -------------------------------------------------------------
        sleep_triggers = [
            "sleep", "go to sleep", "stop listening", "stop jarvis", "sleep jarvis",
            "deactivate jarvis", "deactivate", "turn off listening", "turn off",
            "that's all", "that will be all", "good night jarvis", "good night",
            "standby", "enter standby", "shut down", "stop"
        ]
        if any(clean == s or clean.startswith(s) for s in sleep_triggers):
            assistant_context.set_active(False)
            return self._dispatch_result(raw_text, text, clean, {
                "intent": "SLEEP",
                "tool": "session_control",
                "is_sleep": True,
                "success": True,
                "message": "Understood, Boss. Subsystems entering sleep mode. Say 'Command code 101 Awake' or 'Jarvis' to wake me.",
                "stay_active": False
            })

        # -------------------------------------------------------------
        # 2. GENERAL WAKE WORD ACKNOWLEDGMENT ("Jarvis", "Hey Jarvis", "Awake")
        # -------------------------------------------------------------
        if clean in ["", "wake up", "awake", "are you awake", "are you there", "hello", "hi"]:
            assistant_context.set_active(True)
            return self._dispatch_result(raw_text, text, clean, {
                "intent": "WAKE",
                "tool": "session_control",
                "is_wake": True,
                "success": True,
                "message": "Yes, Boss? All subsystems are online and listening.",
                "stay_active": True
            })

        # -------------------------------------------------------------
        # 3. CLOSE APPLICATION & CONTEXTUAL CLOSE COMMANDS
        # e.g. "Close WhatsApp", "Close Chrome", "Close YouTube", "Close it", "Close the app", "Quit it", "Close"
        # -------------------------------------------------------------
        close_patterns = [
            r'^(?:close|quit|exit|terminate|kill|shut(?:\s+down)?)\s+(?:the\s+|my\s+)?(.+)',
            r'^(?:can\s+you\s+)?(?:please\s+)?(?:close|quit|exit|terminate|kill)\s+(?:the\s+|my\s+)?(.+)',
        ]
        close_match = None
        for cp in close_patterns:
            m = re.search(cp, clean)
            if m:
                close_match = m
                break

        contextual_close = clean in [
            "close", "close it", "close this", "close that", "close now",
            "close the app", "close app", "close current", "close window", "close current app",
            "quit", "quit it", "quit this", "quit that", "quit the app", "quit app",
            "exit", "exit it", "exit the app", "terminate it", "kill it"
        ] or (clean.startswith("close ") and clean.endswith("it"))

        if close_match or contextual_close:
            raw_target = close_match.group(1).strip() if close_match else ""
            target = re.sub(r'\s+(?:app|application|window)$', '', raw_target, flags=re.IGNORECASE).strip()
            target = re.sub(r'\s+(?:for\s+me|please)[?.!]*$', '', target, flags=re.IGNORECASE).strip()
            target = re.sub(r'[?.!]+$', '', target).strip()

            # Contextual resolution if user said "close it", "close", "close the app", etc.
            if contextual_close or target in ["", "it", "this", "the app", "that", "app", "window", "current", "now", "it now", "it please"]:
                candidate = assistant_context.get_close_candidate()
                if candidate:
                    target = candidate
                else:
                    return self._dispatch_result(raw_text, text, clean, {
                        "intent": "CLOSE_APPLICATION",
                        "tool": "application_closer",
                        "target": None,
                        "executed": True,
                        "success": False,
                        "message": "There is no active application to close, Boss.",
                        "stay_active": True
                    })
            else:
                clean_sub = re.split(r'\b(?:jarvis|jarvin|travis|java|javis|close|quit|exit|i\s+said|open)\b', target, flags=re.IGNORECASE)
                if clean_sub and clean_sub[0].strip():
                    target = clean_sub[0].strip()

            # Check if user specifically requested closing YouTube
            if target.lower() == "youtube":
                exec_res = command_executor.executeCloseYouTube()
                assistant_context.record_closed_target("YouTube")
                return self._dispatch_result(raw_text, text, clean, {
                    "intent": "CLOSE_APPLICATION",
                    "tool": "youtube_closer",
                    "target": "YouTube",
                    "executed": True,
                    "success": exec_res["success"],
                    "message": exec_res["message"],
                    "data": exec_res,
                    "stay_active": True
                })

            # Close application by resolved name
            exec_res = command_executor.executeCloseApplication(target)
            if exec_res["success"]:
                assistant_context.record_closed_target(exec_res.get("app_name", target))

            return self._dispatch_result(raw_text, text, clean, {
                "intent": "CLOSE_APPLICATION",
                "tool": "application_closer",
                "target": exec_res.get("app_name", target.title()),
                "executed": True,
                "success": exec_res["success"],
                "not_running": exec_res.get("not_running", False),
                "message": exec_res["message"],
                "data": exec_res,
                "stay_active": True
            })

        # -------------------------------------------------------------
        # 4. YOUTUBE HOME COMMAND (Requirement 8)
        # "Open YouTube" -> opens YouTube home page, no search
        # -------------------------------------------------------------
        if clean in ["open youtube", "launch youtube", "start youtube", "open you tube", "launch you tube"]:
            exec_res = youtube_service.open_youtube()
            assistant_context.record_youtube_target()
            return self._dispatch_result(raw_text, text, clean, {
                "intent": "OPEN_APPLICATION",
                "tool": "youtube_launcher",
                "target": "YouTube",
                "executed": True,
                "success": exec_res["success"],
                "message": "Of course, Boss. Opening YouTube.",
                "data": exec_res,
                "stay_active": True
            })

        # -------------------------------------------------------------
        # 5. APPLICATION COMMANDS (OPEN & LAUNCH)
        # -------------------------------------------------------------
        open_app_match = re.search(r"^(?:open|launch|start|run|bring\s+up|show\s+me)\s+(?:the\s+|my\s+)?(.+)", clean)
        if open_app_match:
            raw_target = open_app_match.group(1).strip()
            # Clean trailing words like "app", "application", "for me", "please"
            target = re.sub(r'\s+(?:app|application)$', '', raw_target, flags=re.IGNORECASE).strip()
            target = re.sub(r'\s+(?:for\s+me|please)[?.!]*$', '', target, flags=re.IGNORECASE).strip()
            target = re.sub(r'[?.!]+$', '', target).strip()
            clean_sub = re.split(r'\b(?:jarvis|jarvin|travis|java|javis|open|launch|start|run|i\s+said|close)\b', target, flags=re.IGNORECASE)
            if clean_sub and clean_sub[0].strip():
                target = clean_sub[0].strip()

            # First: check if it's an explicit YouTube search command
            if target.startswith("youtube and search") or target.startswith("youtube to search"):
                search_query = re.sub(r'^youtube\s+(?:and|to)\s+search\s+(?:for\s+)?', '', target).strip()
                exec_res = command_executor.executeYouTubeSearch(search_query)
                assistant_context.record_youtube_target(search_query)
                return self._dispatch_result(raw_text, text, clean, {
                    "intent": "YOUTUBE_SEARCH",
                    "tool": "youtube_search",
                    "query": search_query,
                    "executed": True,
                    "success": exec_res["success"],
                    "message": exec_res["message"],
                    "data": exec_res,
                    "stay_active": True
                })

            if target.lower() in ["youtube", "you tube"]:
                exec_res = youtube_service.open_youtube()
                assistant_context.record_youtube_target()
                return self._dispatch_result(raw_text, text, clean, {
                    "intent": "OPEN_APPLICATION",
                    "target": "YouTube",
                    "executed": True,
                    "success": exec_res["success"],
                    "message": "Of course, Boss. Opening YouTube.",
                    "data": exec_res,
                    "stay_active": True
                })

            # Attempt universal application resolution
            exec_res = command_executor.executeOpenApplication(target)
            if exec_res["success"]:
                assistant_context.record_opened_app(exec_res.get("app_name", target))

            return self._dispatch_result(raw_text, text, clean, {
                "intent": "OPEN_APPLICATION",
                "tool": "application_launcher",
                "target": exec_res.get("app_name", target.title()),
                "executed": True,
                "success": exec_res["success"],
                "not_installed": exec_res.get("not_installed", False),
                "message": exec_res["message"],
                "data": exec_res,
                "stay_active": True
            })

        # 5B. DIRECT / BARE APPLICATION NAME (e.g. "instagram", "whatsapp", "terminal", "calculator")
        bare_candidate = re.sub(r'\s+(?:app|application)$', '', clean).strip()
        bare_candidate = re.sub(r'^(?:the|my)\s+', '', bare_candidate).strip()
        bare_candidate = re.sub(r'[?.!]+$', '', bare_candidate).strip()

        skip_words = {
            "who", "what", "where", "when", "why", "how", "tell", "explain", "describe",
            "calculate", "system", "status", "cpu", "ram", "battery", "memory", "play", "sing",
            "search", "google", "youtube", "check", "screen", "wake", "sleep", "stop", "exit",
            "good", "hello", "hi", "hey", "yes", "no", "ok", "okay", "thanks", "thank"
        }

        if bare_candidate and not any(bare_candidate.startswith(sw) for sw in skip_words):
            found_app = app_resolver.find_application(bare_candidate)
            if found_app:
                exec_res = command_executor.executeOpenApplication(bare_candidate)
                if exec_res["success"]:
                    assistant_context.record_opened_app(exec_res.get("app_name", bare_candidate))

                return self._dispatch_result(raw_text, text, clean, {
                    "intent": "OPEN_APPLICATION",
                    "tool": "application_launcher",
                    "target": exec_res.get("app_name", bare_candidate.title()),
                    "executed": True,
                    "success": exec_res["success"],
                    "not_installed": exec_res.get("not_installed", False),
                    "message": exec_res["message"],
                    "data": exec_res,
                    "stay_active": True
                })

        # -------------------------------------------------------------
        # 6. MEDIA INTENT PARSER (MUSIC, MOVIE_SONGS, COMEDY, VIDEO, YOUTUBE_SEARCH)
        # -------------------------------------------------------------
        media_intent = media_intent_parser.parse(clean)
        if media_intent:
            media_type = media_intent["mediaType"]
            query = media_intent.get("query", "").strip()

            if media_type == "YOUTUBE_SEARCH":
                if media_intent.get("isOpenOnly"):
                    exec_res = youtube_service.open_youtube()
                    assistant_context.record_youtube_target()
                    return self._dispatch_result(raw_text, text, clean, {
                        "intent": "OPEN_APPLICATION",
                        "target": "YouTube",
                        "executed": True,
                        "success": exec_res["success"],
                        "message": "Of course, Boss. Opening YouTube.",
                        "data": exec_res,
                        "stay_active": True
                    })
                else:
                    exec_res = command_executor.executeYouTubeSearch(query)
                    assistant_context.record_youtube_target(query)
                    return self._dispatch_result(raw_text, text, clean, {
                        "intent": "YOUTUBE_SEARCH",
                        "tool": "youtube_search",
                        "query": query,
                        "executed": True,
                        "success": exec_res["success"],
                        "message": exec_res["message"],
                        "data": exec_res,
                        "stay_active": True
                    })
            else:
                # MUSIC, MOVIE_SONGS, COMEDY, VIDEO
                exec_res = command_executor.executeYouTubeMedia(query, mediaType=media_type)
                assistant_context.record_youtube_target(query)
                return self._dispatch_result(raw_text, text, clean, {
                    "intent": "YOUTUBE_MEDIA",
                    "tool": "youtube_media",
                    "query": query,
                    "mediaType": media_type,
                    "executed": True,
                    "success": exec_res["success"],
                    "message": exec_res["message"],
                    "data": exec_res,
                    "stay_active": True
                })

        # -------------------------------------------------------------
        # 7. HARDWARE & SYSTEM STATUS COMMANDS
        # -------------------------------------------------------------
        if any(kw in clean for kw in [
            "cpu usage", "what's my cpu", "what is my cpu", "ram usage", "memory usage",
            "how much ram", "battery level", "what's my battery", "system status", "system info",
            "check my computer", "hardware status", "diagnostics"
        ]):
            cmd_type = "cpu" if "cpu" in clean else ("battery" if "battery" in clean else ("ram" if "ram" in clean or "memory" in clean else "all"))
            exec_res = command_executor.executeSystemCommand(cmd_type)
            return self._dispatch_result(raw_text, text, clean, {
                "intent": "SYSTEM_STATUS",
                "tool": "system_status",
                "executed": True,
                "success": True,
                "message": exec_res["message"],
                "data": exec_res.get("metrics"),
                "stay_active": True
            })

        # -------------------------------------------------------------
        # 8. NOTIFICATION COMMANDS
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

            return self._dispatch_result(raw_text, text, clean, {
                "intent": "CHECK_NOTIFICATIONS",
                "tool": "notification_check",
                "executed": True,
                "success": True,
                "message": reply,
                "data": sum_data,
                "stay_active": True
            })

        # -------------------------------------------------------------
        # 9. SCREEN ANALYSIS COMMANDS
        # -------------------------------------------------------------
        if any(kw in clean for kw in ["analyze screen", "analyze my screen", "what's on my screen", "read my screen", "look at my screen"]):
            screen_res = screen_vision.analyze_current_screen()
            return self._dispatch_result(raw_text, text, clean, {
                "intent": "SCREEN_ANALYSIS",
                "tool": "screen_vision",
                "executed": True,
                "success": screen_res["success"],
                "message": screen_res.get("analysis", "Screen analyzed, Boss."),
                "data": screen_res,
                "stay_active": True
            })

        # -------------------------------------------------------------
        # 10. WEB SEARCH COMMANDS
        # -------------------------------------------------------------
        web_search_match = re.search(r"^(?:search\s+the\s+web\s+for|search\s+web\s+for|google|look\s+up)\s+(.+)", clean)
        if web_search_match:
            search_query = web_search_match.group(1).strip()
            search_res = web_search_engine.search(search_query)
            return self._dispatch_result(raw_text, text, clean, {
                "intent": "SEARCH_WEB",
                "tool": "web_search",
                "query": search_query,
                "executed": True,
                "success": search_res["success"],
                "message": search_res.get("summary", f"Here is what I found for {search_query}, Boss."),
                "data": search_res,
                "stay_active": True
            })

        # -------------------------------------------------------------
        # 11. GENERAL CHAT / KNOWLEDGE QUESTIONS (Always the LAST fallback)
        # -------------------------------------------------------------
        answer = knowledge_engine.answer_query(text)
        return self._dispatch_result(raw_text, text, clean, {
            "intent": "GENERAL_CHAT",
            "tool": "chat_engine",
            "query": text,
            "executed": True,
            "success": True,
            "message": answer,
            "stay_active": True
        })

    def route_command(self, raw_text: str) -> Dict[str, Any]:
        """Alias for route."""
        return self.route(raw_text)

command_router = CommandRouter()
