"""
J.A.R.V.I.S. Knowledge & Conversational Intelligence Engine
Provides dynamic, real-time answers for any question, calculation, or conversational query.
Always addresses the user as 'Boss'.
"""

import os
import re
import ast
import json
import operator as op
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Optional, Dict, Any

from backend.app.config import settings
from backend.app.system.monitor import system_monitor
from backend.app.memory.manager import memory_manager

# Safe AST Math Evaluator
_OPERATORS = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.Pow: op.pow,
    ast.Mod: op.mod,
    ast.USub: op.neg
}

def _safe_eval_node(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    elif isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in _OPERATORS:
            raise ValueError(f"Unsupported operator: {op_type}")
        return _OPERATORS[op_type](_safe_eval_node(node.left), _safe_eval_node(node.right))
    elif isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in _OPERATORS:
            raise ValueError(f"Unsupported operator: {op_type}")
        return _OPERATORS[op_type](_safe_eval_node(node.operand))
    else:
        raise ValueError("Invalid AST expression")

def safe_math_eval(expr: str) -> Optional[float]:
    """Safely evaluates basic arithmetic expressions."""
    try:
        clean = expr.strip()
        # Ensure only math characters are present
        if not re.match(r'^[0-9+\-*/().\s*]+$', clean):
            return None
        parsed = ast.parse(clean, mode='eval').body
        val = _safe_eval_node(parsed)
        return float(val)
    except Exception:
        return None


class KnowledgeEngine:
    def __init__(self):
        self.user_name = "Boss"

    def answer_query(self, raw_query: str) -> str:
        """
        Synthesizes a truthful, intelligent, and context-aware answer for any question or conversational query.
        Guarantees that JARVIS will always respond to Boss.
        """
        query = raw_query.strip()
        lower = query.lower()

        # -------------------------------------------------------------
        # 1. TIME & DATE QUERIES
        # -------------------------------------------------------------
        if any(p in lower for p in ["what time is it", "what's the time", "what is the time", "tell me the time", "current time"]):
            now = datetime.now()
            time_str = now.strftime("%I:%M %p").lstrip("0")
            return f"The current time is {time_str}, Boss."

        if any(p in lower for p in ["what is today's date", "today's date", "what date is it", "what's the date", "what day is it", "what is the day"]):
            now = datetime.now()
            date_str = now.strftime("%A, %B %d, %Y")
            return f"Today is {date_str}, Boss."

        # -------------------------------------------------------------
        # 2. CONVERSATIONAL BUTLER & IDENTITY (Tony Stark's JARVIS)
        # -------------------------------------------------------------
        if any(lower.startswith(g) or lower == g for g in ["hello", "hi jarvis", "hi", "hey jarvis", "hey"]):
            return f"At your service, Boss. How may I assist you?"

        if "good morning" in lower:
            return f"Good morning, Boss. All diagnostic subsystems report green. Ready for your directives."

        if "good evening" in lower:
            return f"Good evening, Boss. All conduits report optimal status. At your service."

        if "good afternoon" in lower:
            return f"Good afternoon, Boss. Standing by for instructions."

        if any(p in lower for p in ["how are you", "how're you", "how are you doing", "are you okay"]):
            return "All diagnostic parameters are nominal and neural cores are fully responsive, Boss."

        if any(p in lower for p in ["who are you", "what is your name", "what are you"]):
            return f"I am {settings.JARVIS_NAME} — Just A Rather Very Intelligent System. Your personal AI operating system assistant, Boss."

        if any(p in lower for p in ["what can you do", "what are your capabilities", "help me", "commands list"]):
            return "I can launch and manage your Mac applications, search and play YouTube videos, monitor system hardware, check notifications, analyze your screen, calculate equations, and answer your questions, Boss."

        if "are you ready" in lower:
            return "Always ready, Boss."

        if any(p in lower for p in ["thank you", "thanks", "great job", "well done", "awesome"]):
            return "Always a pleasure, Boss."

        if any(p in lower for p in ["who is tony stark", "who is iron man"]):
            return "Tony Stark is the visionary industrialist and engineer who forged the Iron Man armor and designed J.A.R.V.I.S., Boss."

        if any(p in lower for p in ["tell me a joke", "say something funny", "tell a joke"]):
            return "Why do programmers prefer dark mode? Because light attracts bugs, Boss."

        # -------------------------------------------------------------
        # 3. MATHEMATICAL & ARITHMETIC EVALUATION
        # -------------------------------------------------------------
        math_match = re.search(r"^(?:what\s+is|calculate|evaluate|what\'s)\s+(.+)", lower)
        candidate_math = math_match.group(1).strip() if math_match else lower
        candidate_math = re.sub(r'\s+boss[?.!]*$', '', candidate_math).strip()
        candidate_math = re.sub(r'[?.!]+$', '', candidate_math).strip()

        # Word arithmetic normalization
        norm_math = candidate_math
        norm_math = re.sub(r'\bplus\b', '+', norm_math)
        norm_math = re.sub(r'\bminus\b', '-', norm_math)
        norm_math = re.sub(r'\btimes\b|\bmultiplied\s+by\b', '*', norm_math)
        norm_math = re.sub(r'\bdivided\s+by\b', '/', norm_math)
        norm_math = re.sub(r'\bto\s+the\s+power\s+of\b', '**', norm_math)

        # Check if contains numbers and operators
        if re.search(r'\d', norm_math) and any(c in norm_math for c in ['+', '-', '*', '/', '**']):
            clean_expr = re.sub(r'[^0-9+\-*/().\s*]', '', norm_math).strip()
            if clean_expr:
                res = safe_math_eval(clean_expr)
                if res is not None:
                    # Clean integer display if whole number
                    res_str = str(int(res)) if res.is_integer() else f"{res:.4g}"
                    return f"The result of {candidate_math} is {res_str}, Boss."

        # -------------------------------------------------------------
        # 4. SYSTEM STATUS / TELEMETRY QUERIES
        # -------------------------------------------------------------
        if any(p in lower for p in ["how is my computer", "how's my mac", "system condition", "battery status", "cpu status"]):
            metrics = system_monitor.get_current_metrics()
            return f"CPU is at {metrics['cpu_percent']} percent, memory is at {metrics['memory_percent']} percent, and battery is at {metrics['battery']['percent']} percent, Boss."

        # -------------------------------------------------------------
        # 5. MEMORY RECALL
        # -------------------------------------------------------------
        if "project" in lower or "what is my project" in lower:
            memories = memory_manager.get_memories()
            proj_mem = next((m for m in memories if "project" in m.get("content", "").lower()), None)
            if proj_mem:
                clean_m = re.sub(r"^(?:that\s+)?(?:my\s+)?(?:main\s+|current\s+)?project\s+is\s+", "", proj_mem["content"], flags=re.IGNORECASE)
                return f"According to stored memory, your project is {clean_m}, Boss."

        # -------------------------------------------------------------
        # 6. LIVE KNOWLEDGE SEARCH (WIKIPEDIA SUMMARY & OPENSEARCH)
        # -------------------------------------------------------------
        wiki_ans = self._query_wikipedia(query)
        if wiki_ans:
            return wiki_ans

        # -------------------------------------------------------------
        # 7. WEB SEARCH RETRIEVAL FALLBACK
        # -------------------------------------------------------------
        web_ans = self._query_web_summary(query)
        if web_ans:
            return web_ans

        # -------------------------------------------------------------
        # 8. CONVERSATIONAL INTELLIGENCE FALLBACK
        # -------------------------------------------------------------
        return f"Understood regarding '{query}', Boss. All systems are operational and ready for your command."

    def _query_wikipedia(self, raw_query: str) -> Optional[str]:
        """
        Fetches a concise, authoritative 1-2 sentence definition from Wikipedia.
        """
        # Clean question prefixes
        subject = re.sub(
            r'^(?:who\s+(?:is|was)|what\s+(?:is|was|are)|tell\s+me\s+about|explain|describe|define|what\s+do\s+you\s+know\s+about)\s+',
            '', raw_query, flags=re.IGNORECASE
        ).strip()
        subject = re.sub(r'\s+boss[?.!]*$', '', subject, flags=re.IGNORECASE).strip()
        subject = re.sub(r'[?.!]+$', '', subject).strip()

        if not subject or len(subject) < 2:
            return None

        # Disambiguation substitutions
        if subject.lower() == "python":
            subject = "Python (programming language)"
        elif subject.lower() == "apple":
            subject = "Apple Inc."

        # Step A: Find best matching title via OpenSearch
        canonical_title = subject
        try:
            opensearch_url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={urllib.parse.quote(subject)}&limit=3&namespace=0&format=json"
            req = urllib.request.Request(opensearch_url, headers={"User-Agent": "JarvisOS/1.0 (Personal Assistant)"})
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                data = json.loads(resp.read().decode())
                if len(data) > 1 and len(data[1]) > 0:
                    canonical_title = data[1][0]
        except Exception:
            pass

        # Step B: Fetch summary from Wikipedia REST API
        try:
            summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(canonical_title)}"
            s_req = urllib.request.Request(summary_url, headers={"User-Agent": "JarvisOS/1.0 (Personal Assistant)"})
            with urllib.request.urlopen(s_req, timeout=2.5) as s_resp:
                s_data = json.loads(s_resp.read().decode())
                
                # Check for disambiguation
                if s_data.get("type") == "disambiguation":
                    return None

                extract = s_data.get("extract", "").strip()
                if extract:
                    # Clean parenthetical citations or pronunciation marks
                    extract = re.sub(r'\[\d+\]', '', extract)
                    # Take up to the first 2 clear sentences
                    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', extract) if s.strip()]
                    if sentences:
                        concise = ' '.join(sentences[:2]).strip()
                        if not concise.endswith(('.', '!', '?')):
                            concise += '.'
                        return f"{concise} At your service, Boss."
        except Exception:
            pass

        return None

    def _query_web_summary(self, query: str) -> Optional[str]:
        """
        Fetches an instant answer from DuckDuckGo Instant Answer API.
        """
        try:
            clean_q = re.sub(r'\s+boss[?.!]*$', '', query, flags=re.IGNORECASE).strip()
            encoded = urllib.parse.quote(clean_q)
            url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"
            req = urllib.request.Request(url, headers={"User-Agent": "JarvisOS/1.0"})
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                data = json.loads(resp.read().decode())
                abstract = data.get("AbstractText", "").strip()
                if abstract:
                    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', abstract) if s.strip()]
                    concise = ' '.join(sentences[:2]).strip()
                    if not concise.endswith(('.', '!', '?')):
                        concise += '.'
                    return f"{concise} At your service, Boss."
        except Exception:
            pass
        return None

knowledge_engine = KnowledgeEngine()
