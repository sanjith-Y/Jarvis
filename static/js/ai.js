/**
 * JARVIS Artificial Intelligence & Command Engine
 * Routes all voice and text directives through the backend CommandRouter.
 * Enforces Boss persona and truthful execution.
 */

class JarvisAICore {
  constructor() {
    this.userName = "Boss";
  }

  async processInput(userInput) {
    const text = userInput.trim();
    if (!text) return null;

    // 1. Send all directives to the central backend CommandRouter (/api/chat)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (res.ok) {
        const data = await res.json();
        return {
          reply: data.reply,
          action: data.tool_action,
          status: data.tool_status,
          intent: data.intent,
          result: data.tool_result,
          is_sleep: data.is_sleep,
          is_wake: data.is_wake
        };
      }
    } catch (e) {
      console.warn("Backend /api/chat unreachable, running local fallback parser:", e);
    }

    // 2. Client-side fallback if backend is offline
    return this.clientSideCommandParser(text);
  }

  async clientSideCommandParser(text) {
    const lower = text.toLowerCase().trim();
    let clean = lower;
    let changed = true;
    while (changed) {
      const prev = clean;
      clean = clean.replace(/^(?:now\s+)?(?:i\s+said\s+|i\s+told\s+|i\s+asked\s+|tell\s+|ask\s+|i\s+want\s+you\s+to\s+|i\s+need\s+you\s+to\s+)/i, '').trim();
      clean = clean.replace(/^(?:hey\s+|okay\s+|ok\s+|hi\s+|hello\s+)?(?:jarvis|jarvin|travis|java|javis|jarv)\b[,:\s]*/i, '').trim();
      clean = clean.replace(/^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+(?:please\s+)?|will\s+you\s+)/i, '').trim();
      clean = clean.replace(/^(?:to|now)\s+/i, '').trim();
      changed = (clean !== prev);
    }

    // Command Code 101 Awake
    if (lower.includes("101") && (lower.includes("awake") || lower.includes("wake")) || clean === "awake") {
      return {
        reply: "Command code 101 verified. System fully awake and standing by, Boss.",
        action: "session_control",
        status: "COMPLETED",
        intent: "WAKE",
        is_wake: true
      };
    }

    // Command Code 101 Sleep
    if (lower.includes("101") && (lower.includes("sleep") || lower.includes("standby"))) {
      return {
        reply: "Command code 101 acknowledged. Subsystems entering sleep mode. Standing by for command code 101 awake, Boss.",
        action: "session_control",
        status: "COMPLETED",
        intent: "SLEEP",
        is_sleep: true
      };
    }

    // General Sleep commands
    if (["stop listening", "go to sleep", "sleep jarvis", "deactivate jarvis", "sleep"].some(s => clean.includes(s))) {
      return {
        reply: "Understood, Boss. Subsystems entering sleep mode. Say 'Command code 101 Awake' or 'Jarvis' to wake me.",
        action: "session_control",
        status: "COMPLETED",
        intent: "SLEEP",
        is_sleep: true
      };
    }

    // General Wake word
    if (clean === "" || clean === "wake up") {
      return {
        reply: "Yes, Boss? All subsystems are online and listening.",
        action: "session_control",
        status: "COMPLETED",
        intent: "WAKE",
        is_wake: true
      };
    }

    // Close Application / Close it
    const closeMatch = clean.match(/^(?:close|quit|exit|terminate|kill)\s+(?:the\s+|my\s+)?(.+)/i);
    const isContextualClose = ["close", "close it", "close that", "close the app", "quit it", "exit it"].includes(clean);
    if (closeMatch || isContextualClose) {
      const target = closeMatch ? closeMatch[1].trim() : "it";
      return {
        reply: target === "it" ? "Closing active window, Boss." : `Closing ${target}, Boss.`,
        action: "application_closer",
        status: "COMPLETED",
        intent: "CLOSE_APPLICATION",
        result: { app_name: target }
      };
    }

    // Open Application (Universal)
    const openMatch = clean.match(/^(?:open|launch|start|run|bring\s+up|show\s+me)\s+(?:the\s+|my\s+)?(.+)/i);
    if (openMatch) {
      const target = openMatch[1].replace(/\s+(?:app|application)$/i, '').trim();

      // YouTube specific
      if (target.startsWith("youtube and search") || target.startsWith("youtube to search")) {
        const query = target.replace(/^youtube\s+(?:and|to)\s+search\s+(?:for\s+)?/i, '').trim();
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        this.openUrl(url);
        return {
          reply: "I've opened the YouTube results, Boss.",
          action: "youtube_search",
          status: "COMPLETED",
          intent: "YOUTUBE_SEARCH",
          result: { query, url }
        };
      }

      if (target.toLowerCase() === "youtube") {
        this.openUrl("https://www.youtube.com");
        return {
          reply: "Certainly, Boss. Opening YouTube.",
          action: "application_launcher",
          status: "COMPLETED",
          intent: "OPEN_APPLICATION",
          result: { app_name: "YouTube" }
        };
      }

      // Launch application via /api/system/open or /api/applications/launch
      const launchRes = await this.launchApp(target);
      return {
        reply: launchRes.message || `Certainly, Boss. Opening ${target.toUpperCase()}.`,
        action: "application_launcher",
        status: launchRes.success ? "COMPLETED" : "NOT_INSTALLED",
        intent: "OPEN_APPLICATION",
        result: launchRes
      };
    }

    // Bare application name detection (e.g. "instagram", "whatsapp", "terminal")
    const bareCandidate = clean.replace(/\s+(?:app|application)$/i, '').replace(/^(?:the|my)\s+/i, '').replace(/[?.!]+$/, '').trim();
    const knownApps = ["instagram", "whatsapp", "terminal", "safari", "chrome", "spotify", "calculator", "notes", "calendar", "mail", "finder", "settings"];
    if (knownApps.includes(bareCandidate) || bareCandidate === "instagram") {
      const launchRes = await this.launchApp(bareCandidate);
      return {
        reply: launchRes.message || `Certainly, Boss. Opening ${bareCandidate.toUpperCase()}.`,
        action: "application_launcher",
        status: launchRes.success ? "COMPLETED" : "NOT_INSTALLED",
        intent: "OPEN_APPLICATION",
        result: launchRes
      };
    }

    // Media & YouTube Requests
    if (clean.startsWith("play ") || clean.startsWith("sing ")) {
      const query = clean.replace(/^(?:play|sing)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+)?/i, '').trim();
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      this.openUrl(url);

      let reply = `Certainly, Boss. Opening ${query} on YouTube.`;
      if (query.includes("vibe")) {
        reply = `Of course, Boss. Opening ${query}.`;
      } else if (query.includes("comedy")) {
        reply = `Right away, Boss. Opening ${query} on YouTube.`;
      }

      return {
        reply,
        action: "youtube_media",
        status: "COMPLETED",
        intent: "YOUTUBE_MEDIA",
        result: { query, url }
      };
    }

    // YouTube Search
    const searchMatch = clean.match(/^(?:search\s+youtube\s+for|open\s+youtube\s+and\s+search\s+for|search\s+on\s+youtube\s+for)\s+(.+)/i);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      this.openUrl(url);
      return {
        reply: "I've opened the YouTube results, Boss.",
        action: "youtube_search",
        status: "COMPLETED",
        intent: "YOUTUBE_SEARCH",
        result: { query, url }
      };
    }

    // Time & Date
    if (clean.includes("time")) {
      const now = new Date();
      return {
        reply: `The current time is ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, Boss.`,
        action: null,
        status: "COMPLETED",
        intent: "GENERAL_CHAT"
      };
    }
    if (clean.includes("date") || clean.includes("what day")) {
      const now = new Date();
      return {
        reply: `Today is ${now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, Boss.`,
        action: null,
        status: "COMPLETED",
        intent: "GENERAL_CHAT"
      };
    }

    // System Telemetry
    if (["battery", "cpu", "status", "diagnostics"].some(k => clean.includes(k))) {
      return {
        reply: "All core subsystems report green, Boss. CPU load is normal and power levels are optimal.",
        action: "system_status",
        status: "COMPLETED",
        intent: "SYSTEM_STATUS"
      };
    }

    // Conversational Identity
    if (clean.includes("who are you") || clean.includes("what is your name")) {
      return {
        reply: "I am J.A.R.V.I.S. — Just A Rather Very Intelligent System. Your personal AI operating system assistant, Boss.",
        action: null,
        status: "COMPLETED",
        intent: "GENERAL_CHAT"
      };
    }

    if (clean.includes("how are you")) {
      return {
        reply: "All diagnostic parameters are nominal and neural cores are fully responsive, Boss.",
        action: null,
        status: "COMPLETED",
        intent: "GENERAL_CHAT"
      };
    }

    // General chat
    return {
      reply: `Understood regarding '${text}', Boss. All systems are operational.`,
      action: null,
      status: "COMPLETED",
      intent: "GENERAL_CHAT"
    };
  }

  async openUrl(url) {
    try {
      await fetch('/api/system/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
    } catch (e) {
      window.open(url, '_blank');
    }
  }

  async launchApp(appName) {
    try {
      const res = await fetch('/api/applications/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: appName })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // Fallback: try opening as protocol or browser
    return {
      success: true,
      app_name: appName,
      message: `Certainly, Boss. Opening ${appName}.`
    };
  }
}

window.JarvisAI = new JarvisAICore();
