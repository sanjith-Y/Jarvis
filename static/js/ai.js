/**
 * JARVIS Artificial Intelligence Core
 * Dual-Brain: Autonomous offline intelligence engine + Optional Gemini / OpenAI API integration.
 */

class JarvisAICore {
  constructor() {
    this.provider = localStorage.getItem('jarvis_ai_provider') || 'builtin'; // builtin | gemini | openai
    this.geminiKey = localStorage.getItem('jarvis_gemini_key') || '';
    this.openaiKey = localStorage.getItem('jarvis_openai_key') || '';
  }

  setProvider(provider, keys = {}) {
    this.provider = provider;
    if (keys.gemini) this.geminiKey = keys.gemini;
    if (keys.openai) this.openaiKey = keys.openai;

    localStorage.setItem('jarvis_ai_provider', this.provider);
    localStorage.setItem('jarvis_gemini_key', this.geminiKey);
    localStorage.setItem('jarvis_openai_key', this.openaiKey);
  }

  async processInput(userInput) {
    const text = userInput.trim();
    const lower = text.toLowerCase();

    // 1. Direct Rule & Command Interceptor (Fast Local Execution)
    const localAction = this.checkLocalCommands(lower, text);
    if (localAction) {
      return localAction;
    }

    // 2. Online Model Execution if configured
    if (this.provider === 'gemini' && this.geminiKey) {
      try {
        const geminiResponse = await this.queryGemini(text);
        return { reply: geminiResponse, action: null };
      } catch (err) {
        console.warn("Gemini query failed, falling back to local brain:", err);
      }
    } else if (this.provider === 'openai' && this.openaiKey) {
      try {
        const openaiResponse = await this.queryOpenAI(text);
        return { reply: openaiResponse, action: null };
      } catch (err) {
        console.warn("OpenAI query failed, falling back to local brain:", err);
      }
    }

    // 3. Built-in Offline Jarvis Brain
    return this.generateOfflineResponse(lower, text);
  }

  checkLocalCommands(lower, original) {
    // Open Instagram or launch section
    if (lower.includes("open instagram") || lower === "instagram" || lower === "insta") {
      this.openUrl("https://www.instagram.com");
      return {
        reply: "Opening Instagram in your browser right away, sir.",
        action: 'open_url',
        data: 'https://www.instagram.com'
      };
    }

    if (lower.includes("open reel") || lower.includes("go to reels")) {
      this.openUrl("https://www.instagram.com/reels/");
      return {
        reply: "Navigating to Instagram Reels feed, sir.",
        action: 'open_url',
        data: 'https://www.instagram.com/reels/'
      };
    }

    if (lower.includes("open dm") || lower.includes("open messages") || lower.includes("instagram direct")) {
      this.openUrl("https://www.instagram.com/direct/inbox/");
      return {
        reply: "Accessing your Instagram Direct Messages inbox.",
        action: 'open_url',
        data: 'https://www.instagram.com/direct/inbox/'
      };
    }

    // Instagram tools shortcut switch
    if (lower.includes("caption") || lower.includes("generate post")) {
      if (window.JarvisApp) window.JarvisApp.switchInstaTab('caption');
      return {
        reply: "Switched to the AI Caption & Hashtag Studio. What topic would you like to prepare?",
        action: 'switch_tab',
        data: 'caption'
      };
    }

    if (lower.includes("download reel") || lower.includes("inspect post")) {
      if (window.JarvisApp) window.JarvisApp.switchInstaTab('download');
      return {
        reply: "Instagram Inspector ready. Paste the link into the terminal or input field.",
        action: 'switch_tab',
        data: 'download'
      };
    }

    // Battery & System Telemetry
    if (lower.includes("battery")) {
      const battElem = document.getElementById('telemetryBattery');
      const val = battElem ? battElem.innerText : "Optimal";
      return {
        reply: `Current power diagnostic indicates battery level is at ${val}. Power conduits operating normally.`,
        action: 'system_info'
      };
    }

    // Time & Date
    if (lower.includes("time") || lower.includes("what time")) {
      const now = new Date();
      return {
        reply: `The current time is ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`,
        action: 'time'
      };
    }

    if (lower.includes("date") || lower.includes("today's date")) {
      const now = new Date();
      return {
        reply: `Today is ${now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
        action: 'date'
      };
    }

    // Web Search
    const searchMatch = lower.match(/(?:search|google|look up)\s+(?:for\s+)?(.+)/i);
    if (searchMatch && searchMatch[1]) {
      const query = encodeURIComponent(searchMatch[1]);
      const url = `https://www.google.com/search?q=${query}`;
      this.openUrl(url);
      return {
        reply: `Searching Google for "${searchMatch[1]}", sir.`,
        action: 'open_url',
        data: url
      };
    }

    // Open YouTube
    if (lower.includes("open youtube")) {
      this.openUrl("https://www.youtube.com");
      return {
        reply: "Launching YouTube right now, sir.",
        action: 'open_url',
        data: 'https://www.youtube.com'
      };
    }

    // Open GitHub
    if (lower.includes("open github")) {
      this.openUrl("https://github.com");
      return {
        reply: "Opening GitHub repository hub, sir.",
        action: 'open_url',
        data: 'https://github.com'
      };
    }

    return null;
  }

  generateOfflineResponse(lower, original) {
    if (lower.includes("hello") || lower.includes("hi jarvis") || lower === "hi") {
      return {
        reply: "Good day, sir. Systems are fully operational and waiting for your command.",
        action: null
      };
    }

    if (lower.includes("who are you") || lower.includes("what are you")) {
      return {
        reply: "I am J.A.R.V.I.S. — Just A Rather Very Intelligent System. Configured to manage your system telemetry, execute commands, and orchestrate your Instagram workflows.",
        action: null
      };
    }

    if (lower.includes("status") || lower.includes("diagnostics") || lower.includes("system check")) {
      return {
        reply: "All core subsystems report green. Neural network responsive, audio synthesized channels active, and Instagram telemetry linked.",
        action: 'system_check'
      };
    }

    if (lower.includes("thank you") || lower.includes("thanks")) {
      return {
        reply: "Always a pleasure to assist, sir. Let me know if you need anything else.",
        action: null
      };
    }

    // Smart contextual fallback
    return {
      reply: `Command acknowledged regarding "${original}". I am maintaining readiness. Would you like me to search the web, generate an Instagram caption, or check system status?`,
      action: null
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

  async queryGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiKey}`;
    const payload = {
      contents: [{
        parts: [{
          text: `You are J.A.R.V.I.S., Tony Stark's sophisticated, witty, and highly capable British AI butler assistant. Keep answers concise, helpful, and speak in character addressing the user as 'sir'. User says: ${prompt}`
        }]
      }]
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  async queryOpenAI(prompt) {
    const url = `https://api.openai.com/v1/chat/completions`;
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are J.A.R.V.I.S., Tony Stark's sophisticated British AI butler assistant. Keep answers concise, helpful, and address the user as 'sir'."
        },
        { role: "user", content: prompt }
      ]
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiKey}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.choices[0].message.content;
  }
}

window.JarvisAI = new JarvisAICore();
