import re
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from backend.app.config import settings
from backend.app.system.monitor import system_monitor
from backend.app.commands.executor import command_executor
from backend.app.commands.security import classify_command, SecurityLevel
from backend.app.memory.manager import memory_manager
from backend.app.reminders.manager import reminder_manager
from backend.app.notifications.engine import notification_engine
from backend.app.search.engine import web_search_engine
from backend.app.vision.analyzer import screen_vision
from backend.app.files.assistant import file_assistant
from backend.app.voice.service import voice_service

SYSTEM_PROMPT = f"""You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the personal AI operating system assistant for {settings.USER_NAME}.
Identity:
- Highly intelligent, calm, professional, slightly witty, concise, and context-aware.
- Do not overuse 'sir'; address {settings.USER_NAME} naturally.
- Keep responses brief, direct, and actionable unless a deep technical explanation is requested.
- Always provide real, verified actions. You have access to real tools: computer commands, system monitors, web search, memory, reminders, and notifications.
"""

class JarvisAIProvider:
    def __init__(self):
        self.name = settings.JARVIS_NAME
        self.user_name = settings.USER_NAME

    async def process_user_input(self, user_text: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        text = user_text.strip()
        lower = text.lower()

        # Step 1: Intent Recognition & Tool Selection
        intent_data = self._route_intent(text, lower)
        
        # Step 2: Execute Tool if detected
        tool_action = intent_data.get("tool_action")
        tool_result = None
        tool_status = None
        ai_reply = None
        security_level = SecurityLevel.SAFE

        if tool_action:
            tool_status = "EXECUTING"
            action_type = intent_data.get("action_type")
            target = intent_data.get("target")

            # Permission & Security Check
            sec_level, sec_reason = classify_command(str(target), action_type)
            security_level = sec_level

            if sec_level == SecurityLevel.BLOCKED:
                tool_status = "BLOCKED"
                ai_reply = f"Directive blocked: {sec_reason}"
                return {
                    "reply": ai_reply,
                    "tool_action": tool_action,
                    "tool_status": tool_status,
                    "security_level": security_level,
                    "tool_result": None
                }
            elif sec_level == SecurityLevel.CONFIRMATION_REQUIRED and not settings.ALLOW_CONFIRMATION_BYPASS:
                tool_status = "CONFIRMATION_REQUIRED"
                ai_reply = f"That action can modify your system: {sec_reason}. Would you like me to continue?"
                return {
                    "reply": ai_reply,
                    "tool_action": tool_action,
                    "tool_status": tool_status,
                    "security_level": security_level,
                    "target": target,
                    "tool_result": None
                }

            # Execute the tool
            res = self._execute_tool(action_type, target, intent_data)
            tool_result = res
            tool_status = "COMPLETED" if res.get("success", True) else "FAILED"
            ai_reply = res.get("reply", intent_data.get("default_reply"))

        # Step 3: If no local tool was matched, route through LLM (OpenAI or Local Reasoning Brain)
        if not ai_reply:
            if settings.OPENAI_API_KEY:
                try:
                    ai_reply = await self._query_openai(text, conversation_history)
                except Exception as e:
                    print("OpenAI query error:", e)
                    ai_reply = self._local_reasoning_engine(text, lower)
            else:
                ai_reply = self._local_reasoning_engine(text, lower)

        # Step 4: Voice integration
        if settings.ENABLE_VOICE and ai_reply:
            voice_service.speak(ai_reply)

        return {
            "reply": ai_reply,
            "tool_action": tool_action,
            "tool_status": tool_status,
            "security_level": security_level,
            "tool_result": tool_result
        }

    def _route_intent(self, text: str, lower: str) -> Dict[str, Any]:
        # 1. Open Application
        app_match = re.search(r"(?:open|launch|start)\s+(?:the\s+)?(chrome|google chrome|vs code|vscode|code|safari|terminal|notes|calendar|calculator|spotify|finder|slack|discord)(?:\s+app)?", lower)
        if app_match:
            app_name = app_match.group(1)
            return {
                "tool_action": f"Open {app_name.title()}",
                "action_type": "open_app",
                "target": app_name,
                "default_reply": f"Certainly. Opening {app_name.title()}."
            }

        # 2. Close Application
        close_match = re.search(r"(?:close|quit|kill)\s+(?:the\s+)?(chrome|safari|terminal|code|spotify|slack)(?:\s+app)?", lower)
        if close_match:
            app_name = close_match.group(1)
            return {
                "tool_action": f"Close {app_name.title()}",
                "action_type": "close_app",
                "target": app_name,
                "default_reply": f"Closing {app_name.title()}."
            }

        # 3. Open URL / Website
        url_match = re.search(r"(?:open|go to)\s+(github|youtube|google|gmail|reddit|twitter|instagram)", lower)
        if url_match:
            site = url_match.group(1)
            url_map = {
                "github": "https://github.com",
                "youtube": "https://youtube.com",
                "google": "https://google.com",
                "gmail": "https://mail.google.com",
                "reddit": "https://reddit.com",
                "twitter": "https://x.com",
                "instagram": "https://instagram.com"
            }
            target_url = url_map.get(site, f"https://{site}.com")
            return {
                "tool_action": f"Open {site.title()}",
                "action_type": "open_url",
                "target": target_url,
                "default_reply": f"Navigating to {site.title()}."
            }

        # 4. System Status
        if any(p in lower for p in ["system status", "cpu usage", "ram usage", "memory usage", "battery level", "system info", "diagnostics", "hardware status"]):
            return {
                "tool_action": "Query System Status",
                "action_type": "system_status",
                "target": None
            }

        # 5. Web Search
        search_match = re.search(r"(?:search the web for|search web for|search for|google|look up)\s+(.+)", lower)
        if search_match:
            query = search_match.group(1).strip()
            return {
                "tool_action": f"Web Search: {query}",
                "action_type": "web_search",
                "target": query
            }

        # 6. Memory: Remember something
        remember_match = re.search(r"(?:remember that|remember this:?|don't forget that)\s+(.+)", lower)
        if remember_match:
            content = remember_match.group(1).strip()
            return {
                "tool_action": "Store Memory",
                "action_type": "memory_remember",
                "target": content
            }

        # 7. Memory: Query
        if "what is my project" in lower or "what is my main project" in lower or "what do you remember" in lower:
            return {
                "tool_action": "Recall Memory",
                "action_type": "memory_query",
                "target": text
            }

        # 8. Reminders: Set reminder
        remind_match = re.search(r"remind me\s+(?:at|in|to)\s+(.+)", lower)
        if remind_match:
            return {
                "tool_action": "Create Reminder",
                "action_type": "create_reminder",
                "target": text
            }

        # 9. Notifications: Check / Summarize
        if any(p in lower for p in ["check notifications", "check my notifications", "summarize notifications", "what did i miss", "do i have anything important", "any critical notifications", "what are the important ones"]):
            return {
                "tool_action": "Scan Notifications",
                "action_type": "notifications_summary",
                "target": lower
            }

        # 10. Screen Analysis
        if any(p in lower for p in ["analyze screen", "analyze my screen", "what's on my screen", "explain this error on screen", "what am i looking at"]):
            return {
                "tool_action": "Screen Vision Analysis",
                "action_type": "screen_analysis",
                "target": text
            }

        # 11. Files
        if "list files" in lower or "show workspace files" in lower:
            return {
                "tool_action": "List Workspace Files",
                "action_type": "list_files",
                "target": ""
            }

        return {}

    def _execute_tool(self, action_type: str, target: Any, intent_data: Dict[str, Any]) -> Dict[str, Any]:
        if action_type == "open_app":
            res = command_executor.open_app(str(target))
            return {
                "success": res.get("success", False),
                "reply": res.get("message", f"Opening {target}."),
                "data": res
            }

        elif action_type == "close_app":
            res = command_executor.close_app(str(target))
            return {
                "success": res.get("success", False),
                "reply": res.get("message", f"Closing {target}."),
                "data": res
            }

        elif action_type == "open_url":
            res = command_executor.open_url(str(target))
            return {
                "success": res.get("success", False),
                "reply": f"Opening {target}.",
                "data": res
            }

        elif action_type == "system_status":
            metrics = system_monitor.get_current_metrics()
            reply = (
                f"CPU is running at {metrics['cpu_percent']} percent. "
                f"Memory usage is {metrics['memory_percent']} percent ({metrics['memory_used_gb']} GB of {metrics['memory_total_gb']} GB). "
                f"Battery is at {metrics['battery']['percent']} percent ({metrics['battery']['status']}), with system uptime at {metrics['uptime']}."
            )
            return {"success": True, "reply": reply, "data": metrics}

        elif action_type == "web_search":
            res = web_search_engine.search(str(target))
            reply = res.get("summary", f"Completed search for {target}.")
            return {"success": True, "reply": reply, "data": res}

        elif action_type == "memory_remember":
            saved = memory_manager.add_memory(content=str(target))
            return {
                "success": True,
                "reply": "I'll remember that, Sanjith.",
                "data": saved
            }

        elif action_type == "memory_query":
            memories = memory_manager.get_memories()
            # Find closest match
            project_mem = next((m for m in memories if "project" in m["content"].lower()), None)
            if project_mem:
                clean = re.sub(r"^(?:that\s+)?(?:my\s+)?(?:main\s+|current\s+)?project\s+is\s+", "", project_mem["content"], flags=re.IGNORECASE)
                return {"success": True, "reply": f"Your main project is {clean}.", "data": project_mem}
            elif memories:
                return {"success": True, "reply": f"I recall: {memories[0]['content']}", "data": memories}
            return {"success": True, "reply": "I don't have any specific records stored for that yet.", "data": None}

        elif action_type == "create_reminder":
            clean_title = re.sub(r"^remind me(?:\s+to)?\s+", "", target, flags=re.IGNORECASE).strip()
            # Extract time
            time_part = "in 1 hour"
            time_match = re.search(r"(?:at|in)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d+\s*(?:minutes?|hours?))", clean_title, re.IGNORECASE)
            if time_match:
                time_part = time_match.group(0)
                clean_title = clean_title.replace(time_part, "").strip()

            rem = reminder_manager.create_reminder(title=clean_title or "General Reminder", due_time=time_part)
            due_formatted = rem["due_time"].split()[1][:5]
            return {
                "success": True,
                "reply": f"Reminder set: '{rem['title']}' for {due_formatted}.",
                "data": rem
            }

        elif action_type == "notifications_summary":
            sum_data = notification_engine.generate_smart_summary()
            if "important" in target or "critical" in target:
                important_items = sum_data.get("important_items", []) + sum_data.get("critical_items", [])
                if important_items:
                    bullets = [f"'{n['title']}' from {n['source']}" for n in important_items[:3]]
                    return {"success": True, "reply": f"The priority notifications are: {'; '.join(bullets)}.", "data": sum_data}
            return {"success": True, "reply": sum_data["summary"], "data": sum_data}

        elif action_type == "screen_analysis":
            res = screen_vision.capture_and_analyze(prompt=str(target))
            return {
                "success": res.get("success", False),
                "reply": res.get("analysis", "Screen analysis complete."),
                "data": res
            }

        elif action_type == "list_files":
            files_data = file_assistant.list_files()
            if files_data.get("success"):
                names = [f["name"] for f in files_data.get("files", [])[:8]]
                return {
                    "success": True,
                    "reply": f"Workspace contains {len(files_data['files'])} items, including: {', '.join(names)}.",
                    "data": files_data
                }
            return {"success": False, "reply": files_data.get("message"), "data": files_data}

        return {"success": False, "reply": "Command acknowledged.", "data": None}

    def _local_reasoning_engine(self, text: str, lower: str) -> str:
        # Conversational butler intelligence (Tony Stark JARVIS persona)
        if "good morning" in lower:
            return f"Good morning, {settings.USER_NAME}. All systems are fully operational. How may I assist you today?"
        if "good evening" in lower:
            return f"Good evening. All conduits report optimal status. At your service."
        if "are you ready" in lower:
            return "Always."
        if "who are you" in lower or "what is your name" in lower:
            return f"I am {self.name} — Just A Rather Very Intelligent System. Your personal AI operating system assistant."
        if "thank you" in lower or "thanks" in lower:
            return "My pleasure."
        if "hello" in lower or "hi jarvis" in lower or lower == "hi" or lower == "jarvis":
            return f"At your service, {settings.USER_NAME}. How may I help?"
        if "explain quantum computing" in lower:
            return "Quantum computing utilizes the principles of quantum mechanics — superposition and entanglement — to process computational states exponentially faster than classical bits for specific optimization and cryptography problems."
        if "how are you" in lower:
            return "All diagnostic parameters are nominal and neural cores are responsive."

        # Context-aware fallback
        memory_context = memory_manager.get_context_string()
        if "project" in lower and memory_context:
            return f"According to stored memory: {memory_context.splitlines()[1]}"

        return f"Understood regarding '{text}'. Subsystems stand ready. Would you like me to run diagnostics, search the web, or manage your schedule?"

    async def _query_openai(self, prompt: str, history: Optional[List[Dict[str, str]]] = None) -> str:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        # Inject memory context
        mem_ctx = memory_manager.get_context_string()
        if mem_ctx:
            messages.append({"role": "system", "content": mem_ctx})

        if history:
            for h in history[-4:]:
                messages.append(h)

        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": settings.AI_MODEL,
            "messages": messages,
            "temperature": settings.AI_TEMPERATURE,
            "max_tokens": 400
        }

        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}"
            },
            data=json.dumps(payload).encode()
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode())
            return res_data["choices"][0]["message"]["content"].strip()

jarvis_ai = JarvisAIProvider()
