/**
 * JARVIS Main Application Coordinator
 * Connects Voice Engine, AI Command Engine, Diagnostic Logging, and State Management.
 */

class JarvisApplication {
  constructor() {
    this.statusElem = document.getElementById('statusText');
    this.statusDot = document.getElementById('statusDot');
    this.reactorWrapper = document.getElementById('reactorWrapper');
    this.reactorStatus = document.getElementById('reactorStatus');
    this.chatFeed = document.getElementById('chatFeed');
    this.chatInput = document.getElementById('chatInput');
    this.timeDisplay = document.getElementById('timeDisplay');
    this.btnVoice = document.getElementById('btnVoiceToggle');
    this.currentState = 'SLEEPING';
    this.isActive = false;
  }

  init() {
    this.bindEvents();
    this.startClock();
    this.fetchSystemTelemetry();
    this.renderDiagnosticPanel();

    // Canvas visualizer setup
    const canvas = document.getElementById('audioCanvas');
    if (canvas && window.JarvisAudio) {
      canvas.width = canvas.parentElement.clientWidth || 300;
      window.JarvisAudio.setupCanvasVisualizer(canvas);
    }

    // Connect voice callbacks
    if (window.JarvisVoice) {
      window.JarvisVoice.onCommandCallback = (cmd) => this.handleUserCommand(cmd);
      window.JarvisVoice.onStatusChangeCallback = (st) => this.updateState(st);
    }

    // Periodic telemetry refresh
    setInterval(() => this.fetchSystemTelemetry(), 10000);
  }

  bindEvents() {
    // Directive Submit (Text Input)
    const btnSend = document.getElementById('btnSend');
    if (btnSend) {
      btnSend.addEventListener('click', () => this.sendChatMessage());
    }
    if (this.chatInput) {
      this.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendChatMessage();
      });
    }

    // Quick Command Chips
    document.querySelectorAll('.command-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd') || chip.innerText.trim();
        this.handleUserCommand(cmd);
      });
    });

    // ACTIVATE JARVIS Button (Requirement 2 & 5)
    if (this.btnVoice) {
      this.btnVoice.addEventListener('click', () => this.toggleActivation());
    }

    // Push To Talk
    const btnPtt = document.getElementById('btnPushToTalk');
    if (btnPtt) {
      btnPtt.addEventListener('mousedown', async () => {
        if (window.JarvisVoice) {
          await window.JarvisVoice.requestMicrophonePermission();
          window.JarvisVoice.startListeningSession();
          this.updateState('listening');
          btnPtt.classList.add('active');
        }
      });
      btnPtt.addEventListener('mouseup', () => {
        if (window.JarvisVoice && !this.isActive) {
          window.JarvisVoice.stopListeningSession();
          this.updateState('idle');
        }
        btnPtt.classList.remove('active');
      });
    }

    // Sound FX Toggle
    const btnSoundToggle = document.getElementById('btnSoundToggle');
    if (btnSoundToggle) {
      btnSoundToggle.addEventListener('click', () => {
        const isMuted = btnSoundToggle.classList.toggle('muted');
        if (window.JarvisAudio) window.JarvisAudio.setSoundEnabled(!isMuted);
        btnSoundToggle.innerHTML = isMuted 
          ? '<i class="fas fa-volume-mute"></i> FX Muted' 
          : '<i class="fas fa-volume-up"></i> Sound FX';
      });
    }

    // Arc Reactor Click -> System status check
    if (this.reactorWrapper) {
      this.reactorWrapper.addEventListener('click', () => {
        this.handleUserCommand("system status");
      });
    }
  }

  async toggleActivation() {
    if (!window.JarvisVoice) return;

    if (this.isActive) {
      // Deactivate JARVIS
      this.isActive = false;
      try { fetch('/api/jarvis/deactivate', { method: 'POST' }); } catch (e) {}
      window.JarvisVoice.stopContinuous();
      this.updateState('sleeping');
      if (this.btnVoice) {
        this.btnVoice.classList.remove('active');
        this.btnVoice.innerHTML = '<i class="fas fa-microphone"></i> ACTIVATE JARVIS';
      }
      this.addMessage("jarvis", "Understood, Boss. I'll stand by.");
      window.JarvisVoice.speak("Understood, Boss. I'll stand by.");
    } else {
      // ACTIVATE JARVIS (Requirements 2, 5)
      this.isActive = true;
      try { fetch('/api/jarvis/activate', { method: 'POST' }); } catch (e) {}
      if (this.btnVoice) {
        this.btnVoice.classList.add('active');
        this.btnVoice.innerHTML = '<i class="fas fa-microphone-slash"></i> STOP LISTENING';
      }

      // 1. Request microphone permission
      await window.JarvisVoice.requestMicrophonePermission();

      // 2. Load voices and set state to LISTENING
      this.updateState('listening');

      // 3. Spoken greeting: "JARVIS online. I'm listening, Boss."
      const greeting = "JARVIS online. I'm listening, Boss.";
      this.addMessage("jarvis", greeting);

      // 4. Start continuous listening mode after speech completes
      window.JarvisVoice.continuousMode = true;
      window.JarvisVoice.speak(greeting, () => {
        if (this.isActive) {
          this.updateState('listening');
          window.JarvisVoice.startListeningSession();
        }
      });
    }
  }

  updateState(state) {
    this.currentState = state;
    if (!this.statusElem || !this.statusDot || !this.reactorWrapper) return;

    this.reactorWrapper.classList.remove('listening', 'speaking');
    this.statusDot.classList.remove('busy', 'listening', 'offline');

    switch (state) {
      case 'listening':
        this.statusElem.innerText = "ONLINE // LISTENING";
        this.statusDot.classList.add('listening');
        this.reactorWrapper.classList.add('listening');
        if (this.reactorStatus) this.reactorStatus.innerText = "● MICROPHONE ACTIVE // LISTENING";
        break;

      case 'processing':
        this.statusElem.innerText = "PROCESSING...";
        this.statusDot.classList.add('busy');
        if (this.reactorStatus) this.reactorStatus.innerText = "EVALUATING COMMAND MATRIX";
        break;

      case 'executing':
        this.statusElem.innerText = "EXECUTING DIRECTIVE...";
        this.statusDot.classList.add('busy');
        if (this.reactorStatus) this.reactorStatus.innerText = "EXECUTING SYSTEM ACTION";
        break;

      case 'speaking':
        this.statusElem.innerText = "TRANSMITTING...";
        this.statusDot.classList.add('busy');
        this.reactorWrapper.classList.add('speaking');
        if (this.reactorStatus) this.reactorStatus.innerText = "SYNTHESIZING SPEECH AUDIO";
        break;

      case 'sleeping':
      case 'idle':
        this.statusElem.innerText = this.isActive ? "ONLINE // LISTENING" : "STANDBY // SLEEPING";
        if (this.reactorStatus) this.reactorStatus.innerText = this.isActive ? "JARVIS ONLINE // READY" : "JARVIS SLEEPING // SAY 'JARVIS' TO WAKE";
        break;

      case 'error':
        this.statusElem.innerText = "ERROR // RECOVERING";
        this.statusDot.classList.add('busy');
        if (this.reactorStatus) this.reactorStatus.innerText = "SUBSYSTEM ANOMALY DETECTED";
        break;
    }
  }

  async handleUserCommand(rawText) {
    if (!rawText || !rawText.trim()) return;
    const text = rawText.trim();

    // 1. Log User Voice/Text
    this.addMessage("user", text);

    // 2. Transition State: LISTENING -> PROCESSING
    this.updateState('processing');

    try {
      // 3. Route & Execute Command through Central Pipeline
      const response = await window.JarvisAI.processInput(text);

      if (response.is_sleep) {
        this.isActive = false;
        if (this.btnVoice) {
          this.btnVoice.classList.remove('active');
          this.btnVoice.innerHTML = '<i class="fas fa-microphone"></i> ACTIVATE JARVIS';
        }
      }

      // 4. Log Diagnostic Pipeline (Requirement 35)
      this.logDiagnosticEntry({
        transcript: text,
        intent: response.intent || response.action || "GENERAL_CHAT",
        target: response.result?.app_name || response.result?.query || response.result?.url || text,
        found: response.status === "NOT_INSTALLED" ? "NO" : "YES",
        result: response.status === "NOT_INSTALLED" ? "NOT_INSTALLED" : (response.status === "FAILED" ? "FAILURE" : "SUCCESS")
      });

      // 5. Update State: EXECUTING
      if (response.action) {
        this.updateState('executing');
      }

      // 6. Display JARVIS Response in Terminal
      this.addMessage("jarvis", response.reply, response);

      // 7. Transition: SPEAKING -> LISTENING
      if (window.JarvisVoice) {
        window.JarvisVoice.speak(response.reply, () => {
          if (this.isActive && !response.is_sleep) {
            this.updateState('listening');
            window.JarvisVoice.startListeningSession();
          } else {
            this.updateState('sleeping');
          }
        });
      }

    } catch (err) {
      console.error("Execution error:", err);
      const errMsg = "I encountered an anomaly processing that directive, Boss.";
      this.addMessage("jarvis", errMsg);
      this.updateState('error');
      if (window.JarvisVoice) {
        window.JarvisVoice.speak(errMsg, () => {
          if (this.isActive) this.updateState('listening');
        });
      }
    }
  }

  sendChatMessage() {
    if (!this.chatInput) return;
    const text = this.chatInput.value.trim();
    if (!text) return;
    this.chatInput.value = '';
    this.handleUserCommand(text);
  }

  addMessage(sender, text, meta = null) {
    if (!this.chatFeed) return;
    const card = document.createElement('div');
    card.className = `message-card ${sender}`;

    const senderHeader = document.createElement('div');
    senderHeader.className = 'message-sender';
    senderHeader.innerHTML = sender === 'user' 
      ? '<i class="fas fa-user-astronaut"></i> BOSS' 
      : '<i class="fas fa-robot"></i> J.A.R.V.I.S.';

    const textBody = document.createElement('div');
    textBody.className = 'message-text';
    textBody.innerText = text;

    card.appendChild(senderHeader);
    card.appendChild(textBody);

    if (meta && meta.intent) {
      const metaBadge = document.createElement('div');
      metaBadge.className = 'command-meta-badge';
      metaBadge.style.fontSize = '10px';
      metaBadge.style.color = '#00f0ff';
      metaBadge.style.marginTop = '6px';
      metaBadge.innerText = `[INTENT: ${meta.intent}] ${meta.status || 'COMPLETED'}`;
      card.appendChild(metaBadge);
    }

    this.chatFeed.appendChild(card);
    this.chatFeed.scrollTop = this.chatFeed.scrollHeight;
  }

  renderDiagnosticPanel() {
    // Append or locate diagnostic widget
    const container = document.querySelector('.system-widget-group');
    if (container && !document.getElementById('diagnosticWidget')) {
      const diagCard = document.createElement('div');
      diagCard.id = 'diagnosticWidget';
      diagCard.className = 'telemetry-card';
      diagCard.innerHTML = `
        <div class="card-title-row">
          <span class="card-title"><i class="fas fa-microchip"></i> COMMAND DIAGNOSTIC STREAM</span>
          <span class="card-val-badge" id="diagStatusBadge">LIVE</span>
        </div>
        <div id="diagnosticLogFeed" style="font-family: monospace; font-size: 11px; max-height: 120px; overflow-y: auto; color: #94a3b8; padding: 4px 0;">
          <div>[Awaiting voice or text directives]</div>
        </div>
      `;
      container.appendChild(diagCard);
    }
  }

  logDiagnosticEntry(entry) {
    const feed = document.getElementById('diagnosticLogFeed');
    if (!feed) return;

    const item = document.createElement('div');
    item.style.marginBottom = '6px';
    item.style.borderLeft = '2px solid #00f0ff';
    item.style.paddingLeft = '6px';

    const color = entry.result === 'SUCCESS' ? '#00ff88' : (entry.result === 'NOT_INSTALLED' ? '#f59e0b' : '#ff3366');

    item.innerHTML = `
      <div style="color: #38bdf8;">VOICE / DIRECTIVE RECEIVED</div>
      <div>TRANSCRIPT: <span style="color: #fff;">${entry.transcript}</span></div>
      <div>INTENT: <span style="color: #00f0ff;">${entry.intent}</span></div>
      <div>TARGET / QUERY: <span style="color: #cbd5e1;">${entry.target}</span></div>
      <div>APP FOUND: <span style="color: ${entry.found === 'YES' ? '#00ff88' : '#ff3366'}; font-weight: bold;">${entry.found}</span></div>
      <div>RESULT: <span style="color: ${color}; font-weight: bold;">${entry.result}</span></div>
    `;

    feed.prepend(item);
  }

  startClock() {
    const update = () => {
      const now = new Date();
      if (this.timeDisplay) {
        this.timeDisplay.innerText = now.toLocaleTimeString([], { hour12: false });
      }
      const utcElem = document.getElementById('utcTime');
      if (utcElem) {
        utcElem.innerText = now.toUTCString().slice(17, 25) + " UTC";
      }
    };
    update();
    setInterval(update, 1000);
  }

  async fetchSystemTelemetry() {
    try {
      const res = await fetch('/api/system');
      if (!res.ok) return;
      const data = await res.json();
      
      const battElem = document.getElementById('telemetryBattery');
      if (battElem) battElem.innerText = `${data.battery_pct}% (${data.battery})`;

      const battBar = document.getElementById('batteryBarFill');
      if (battBar) battBar.style.width = `${data.battery_pct}%`;

      const osElem = document.getElementById('telemetryOs');
      if (osElem) osElem.innerText = data.os;

      const hostElem = document.getElementById('telemetryHost');
      if (hostElem) hostElem.innerText = data.hostname;

      const uptimeElem = document.getElementById('telemetryUptime');
      if (uptimeElem) uptimeElem.innerText = data.uptime || 'Active';

      const cpuElem = document.getElementById('telemetryCpu');
      if (cpuElem && data.cpu_load) {
        cpuElem.innerText = `${data.cpu_load[0]} Load`;
        const cpuBar = document.getElementById('cpuBarFill');
        if (cpuBar) cpuBar.style.width = `${Math.min(100, data.cpu_load[0] * 30)}%`;
      }
    } catch (e) {}
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.JarvisApp = new JarvisApplication();
  window.JarvisApp.init();
});
