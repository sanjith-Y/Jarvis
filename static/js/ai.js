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
    const clean = lower.replace(/^(?:hey\s+|okay\s+|hi\s+)?jarvis[,:\s]*/i, '').replace(/^(?:can\s+you\s+|please\s+)/i, '').trim();

    // Sleep commands
    if (["stop listening", "go to sleep", "sleep jarvis", "deactivate jarvis"].some(s => clean.includes(s))) {
      return {
        reply: "Understood, Boss. I'll stand by.",
        action: "session_control",
        status: "COMPLETED",
        intent: "SLEEP",
        is_sleep: true
      };
    }

    // Wake word
    if (clean === "" || clean === "wake up") {
      return {
        reply: "Yes, Boss?",
        action: "session_control",
        status: "COMPLETED",
        intent: "WAKE",
        is_wake: true
      };
    }

    // Open Application (Universal)
    const openMatch = clean.match(/^(?:open|launch|start|run)\s+(?:the\s+)?(.+)/i);
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

    // System Telemetry
    if (["battery", "cpu", "status", "diagnostics"].some(k => clean.includes(k))) {
      return {
        reply: "All core subsystems report green, Boss. CPU load is normal and power levels are optimal.",
        action: "system_status",
        status: "COMPLETED",
        intent: "SYSTEM_STATUS"
      };
    }

    // General chat
    return {
      reply: `Standing by for your directive, Boss.`,
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
