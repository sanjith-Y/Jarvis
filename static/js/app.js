/**
 * JARVIS Main Application Coordinator
 * Binds UI, Voice, Audio, System Telemetry, Weather, and Instagram Suite together.
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
  }

  init() {
    this.bindEvents();
    this.startClock();
    this.fetchSystemTelemetry();
    this.fetchWeather();
    this.renderQueue();

    // Init Audio visualizer canvas
    const canvas = document.getElementById('audioCanvas');
    if (canvas && window.JarvisAudio) {
      canvas.width = canvas.parentElement.clientWidth || 300;
      window.JarvisAudio.setupCanvasVisualizer(canvas);
    }

    // Set voice callbacks
    if (window.JarvisVoice) {
      window.JarvisVoice.onCommandCallback = (cmd) => this.handleUserCommand(cmd);
      window.JarvisVoice.onStatusChangeCallback = (st) => this.updateState(st);
    }

    // Welcome message
    setTimeout(() => {
      if (window.JarvisAudio) window.JarvisAudio.playBootSound();
      this.addMessage("jarvis", "Systems initialized. J.A.R.V.I.S. Mark VII is fully operational. How may I be of service, sir?");
      if (window.JarvisVoice) {
        window.JarvisVoice.speak("Systems initialized. Jarvis is online and listening.");
      }
    }, 600);

    // Refresh telemetry every 10 seconds
    setInterval(() => this.fetchSystemTelemetry(), 10000);
  }

  bindEvents() {
    // Chat Submit
    const btnSend = document.getElementById('btnSend');
    if (btnSend) {
      btnSend.addEventListener('click', () => this.sendChatMessage());
    }
    if (this.chatInput) {
      this.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendChatMessage();
      });
    }

    // Quick command chips
    document.querySelectorAll('.command-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd') || chip.innerText.trim();
        this.handleUserCommand(cmd);
      });
    });

    // Voice Action Button
    const btnVoice = document.getElementById('btnVoiceToggle');
    if (btnVoice) {
      btnVoice.addEventListener('click', () => {
        const isListening = window.JarvisVoice.toggleListening(true);
        btnVoice.classList.toggle('active', isListening);
        if (isListening) {
          btnVoice.innerHTML = '<i class="fas fa-microphone-slash"></i> Stop Listening';
        } else {
          btnVoice.innerHTML = '<i class="fas fa-microphone"></i> Hey Jarvis (Voice)';
        }
      });
    }

    // Push To Talk
    const btnPtt = document.getElementById('btnPushToTalk');
    if (btnPtt) {
      btnPtt.addEventListener('mousedown', () => {
        window.JarvisVoice.toggleListening(false);
        btnPtt.classList.add('active');
      });
      btnPtt.addEventListener('mouseup', () => {
        btnPtt.classList.remove('active');
      });
    }

    // Sound FX Toggle
    const btnSoundToggle = document.getElementById('btnSoundToggle');
    if (btnSoundToggle) {
      btnSoundToggle.addEventListener('click', () => {
        const isMuted = btnSoundToggle.classList.toggle('muted');
        window.JarvisAudio.setSoundEnabled(!isMuted);
        btnSoundToggle.innerHTML = isMuted 
          ? '<i class="fas fa-volume-mute"></i> FX Muted' 
          : '<i class="fas fa-volume-up"></i> Sound FX';
      });
    }

    // Arc Reactor Click -> Greeting
    if (this.reactorWrapper) {
      this.reactorWrapper.addEventListener('click', () => {
        if (window.JarvisAudio) window.JarvisAudio.playBeep(1200, 'sine', 0.1);
        this.handleUserCommand("status");
      });
    }

    // Instagram Tabs
    document.querySelectorAll('.insta-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabTarget = tab.getAttribute('data-tab');
        this.switchInstaTab(tabTarget);
      });
    });

    // Instagram Downloader / Inspector Action
    const btnInspect = document.getElementById('btnInspectMedia');
    if (btnInspect) {
      btnInspect.addEventListener('click', () => this.handleInstaInspect());
    }

    // Instagram Caption Generator Action
    const btnGenerateCaption = document.getElementById('btnGenerateCaption');
    if (btnGenerateCaption) {
      btnGenerateCaption.addEventListener('click', () => this.handleGenerateCaption());
    }

    // Instagram Direct Message Launcher
    const btnLaunchDm = document.getElementById('btnLaunchDm');
    if (btnLaunchDm) {
      btnLaunchDm.addEventListener('click', () => this.handleLaunchDm());
    }

    // Settings Modal
    const btnSettings = document.getElementById('btnSettings');
    const modal = document.getElementById('settingsModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnSaveSettings = document.getElementById('btnSaveSettings');

    if (btnSettings && modal) {
      btnSettings.addEventListener('click', () => {
        this.populateSettingsForm();
        modal.classList.add('open');
      });
    }
    if (btnCloseModal && modal) {
      btnCloseModal.addEventListener('click', () => modal.classList.remove('open'));
    }
    if (btnSaveSettings && modal) {
      btnSaveSettings.addEventListener('click', () => {
        this.saveSettingsForm();
        modal.classList.remove('open');
      });
    }

    // App Quick Launchers
    document.querySelectorAll('.btn-hud-app').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (url) window.JarvisAI.openUrl(url);
      });
    });
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
    } catch (e) {
      console.warn("Could not query telemetry backend", e);
    }
  }

  async fetchWeather() {
    try {
      // Default to coordinates or fetch via IP-API / Open-Meteo
      const lat = 12.9716; // Default Bangalore / User timezone or fallback
      const lon = 77.5946;
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      if (res.ok) {
        const data = await res.json();
        const cur = data.current_weather;
        const tempElem = document.getElementById('weatherTemp');
        const metaElem = document.getElementById('weatherMeta');
        if (tempElem) tempElem.innerText = `${Math.round(cur.temperature)}°C`;
        if (metaElem) metaElem.innerText = `Wind: ${cur.windspeed} km/h | Code: ${cur.weathercode}`;
      }
    } catch (e) {
      console.warn("Weather fetch failed", e);
    }
  }

  updateState(state) {
    if (!this.statusElem || !this.statusDot || !this.reactorWrapper) return;

    this.reactorWrapper.classList.remove('listening', 'speaking');
    this.statusDot.classList.remove('busy', 'listening');

    if (state === 'listening') {
      this.statusElem.innerText = "LISTENING...";
      this.statusDot.classList.add('listening');
      this.reactorWrapper.classList.add('listening');
      if (this.reactorStatus) this.reactorStatus.innerText = "AUDIO FEED ACTIVE // LISTENING";
    } else if (state === 'speaking') {
      this.statusElem.innerText = "TRANSMITTING...";
      this.statusDot.classList.add('busy');
      this.reactorWrapper.classList.add('speaking');
      if (this.reactorStatus) this.reactorStatus.innerText = "SYNTHESIZING AUDIO SPEECH";
    } else if (state === 'processing') {
      this.statusElem.innerText = "PROCESSING...";
      this.statusDot.classList.add('busy');
      if (this.reactorStatus) this.reactorStatus.innerText = "NEURAL MATRIX EVALUATING";
    } else {
      this.statusElem.innerText = "ONLINE";
      if (this.reactorStatus) this.reactorStatus.innerText = "JARVIS ONLINE // READY";
    }
  }

  async handleUserCommand(rawText) {
    if (!rawText || !rawText.trim()) return;
    const text = rawText.trim();

    this.addMessage("user", text);
    this.updateState('processing');

    try {
      const response = await window.JarvisAI.processInput(text);
      this.addMessage("jarvis", response.reply);
      if (window.JarvisAudio) window.JarvisAudio.playSuccess();
      if (window.JarvisVoice) window.JarvisVoice.speak(response.reply);
    } catch (err) {
      const errMsg = "I encountered an anomaly processing that directive, sir.";
      this.addMessage("jarvis", errMsg);
      if (window.JarvisVoice) window.JarvisVoice.speak(errMsg);
    } finally {
      this.updateState('idle');
    }
  }

  sendChatMessage() {
    if (!this.chatInput) return;
    const text = this.chatInput.value.trim();
    if (!text) return;
    this.chatInput.value = '';
    this.handleUserCommand(text);
  }

  addMessage(sender, text) {
    if (!this.chatFeed) return;
    const card = document.createElement('div');
    card.className = `message-card ${sender}`;

    const senderHeader = document.createElement('div');
    senderHeader.className = 'message-sender';
    senderHeader.innerHTML = sender === 'user' 
      ? '<i class="fas fa-user-astronaut"></i> Commander' 
      : '<i class="fas fa-robot"></i> J.A.R.V.I.S.';

    const textBody = document.createElement('div');
    textBody.className = 'message-text';
    textBody.innerText = text;

    card.appendChild(senderHeader);
    card.appendChild(textBody);
    this.chatFeed.appendChild(card);
    this.chatFeed.scrollTop = this.chatFeed.scrollHeight;
  }

  // Instagram Tab Switcher
  switchInstaTab(tabName) {
    document.querySelectorAll('.insta-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === `tab-${tabName}`);
    });
  }

  // Instagram Media Inspector & Downloader
  async handleInstaInspect() {
    const input = document.getElementById('instaMediaUrl');
    const previewBox = document.getElementById('instaPreviewBox');
    if (!input || !previewBox) return;

    const url = input.value.trim();
    if (!url) {
      alert("Please paste an Instagram Reel or Post link first.");
      return;
    }

    previewBox.innerHTML = '<p style="color:var(--cyan-glow);"><i class="fas fa-spinner fa-spin"></i> Inspecting media streams...</p>';

    try {
      const data = await window.JarvisInsta.inspectMedia(url);
      previewBox.classList.add('has-content');

      let embedHtml = '';
      if (data.embed_url) {
        embedHtml = `<iframe src="${data.embed_url}" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`;
      } else if (data.thumbnail_url) {
        embedHtml = `<img src="${data.thumbnail_url}" style="max-width:100%; border-radius:6px; margin-bottom:10px;" />`;
      }

      previewBox.innerHTML = `
        <div style="margin-bottom:10px;">
          <strong style="color:var(--text-bright);">${data.title || 'Instagram Media'}</strong>
          <div style="font-size:12px; color:var(--cyan-glow); margin-top:4px;">${data.author_name ? 'By: ' + data.author_name : 'Direct Stream'}</div>
        </div>
        ${embedHtml}
        <div style="display:flex; gap:10px; margin-top:12px;">
          <a href="${data.url}" target="_blank" class="btn-action-primary" style="flex:1; text-align:center; text-decoration:none; justify-content:center;">
            <i class="fab fa-instagram"></i> Open on Instagram
          </a>
          <button id="btnCopyLink" class="btn-hud-app" style="flex:1; justify-content:center;">
            <i class="fas fa-copy"></i> Copy Link
          </button>
        </div>
      `;

      const btnCopy = document.getElementById('btnCopyLink');
      if (btnCopy) {
        btnCopy.addEventListener('click', () => {
          navigator.clipboard.writeText(data.url);
          alert("Instagram link copied to clipboard!");
        });
      }

      this.addMessage("jarvis", `Media link parsed successfully. Displaying preview for ${data.shortcode || 'post'}.`);
      if (window.JarvisVoice) window.JarvisVoice.speak("Instagram media identified, sir.");
    } catch (err) {
      previewBox.innerHTML = `<p style="color:var(--danger-neon);">Failed to parse media: ${err.message}</p>`;
    }
  }

  // Instagram AI Caption Generator
  handleGenerateCaption() {
    const topicInput = document.getElementById('captionTopic');
    const toneSelect = document.getElementById('captionTone');
    const nicheSelect = document.getElementById('captionNiche');
    const resultBox = document.getElementById('captionResultBox');
    const textOutput = document.getElementById('captionOutput');
    const tagsContainer = document.getElementById('tagsContainer');

    if (!topicInput || !resultBox || !textOutput) return;

    const topic = topicInput.value.trim() || "My New Tech Setup";
    const tone = toneSelect ? toneSelect.value : 'sophisticated';
    const niche = nicheSelect ? nicheSelect.value : 'tech';

    const content = window.JarvisInsta.generateContent(topic, tone, niche);

    textOutput.value = content.fullCaption;
    resultBox.style.display = 'block';

    if (tagsContainer) {
      tagsContainer.innerHTML = content.tags.map(t => `<span class="insta-tag-chip">${t}</span>`).join('');
    }

    // Bind copy button
    const copyBtn = document.getElementById('btnCopyCaption');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(content.fullCaption);
        copyBtn.innerText = "COPIED!";
        setTimeout(() => copyBtn.innerText = "COPY ALL", 2000);
      };
    }

    // Add to schedule button
    const addQueueBtn = document.getElementById('btnAddSchedule');
    if (addQueueBtn) {
      addQueueBtn.onclick = () => {
        window.JarvisInsta.addToQueue({
          title: topic,
          caption: content.fullCaption,
          tags: content.tags
        });
        this.renderQueue();
        alert("Post added to your Instagram Planner Queue!");
      };
    }

    this.addMessage("jarvis", `Generated a ${tone} Instagram caption and hashtag package for "${topic}".`);
    if (window.JarvisVoice) window.JarvisVoice.speak("Your Instagram caption and hashtags are prepared, sir.");
  }

  // Instagram Direct Message Hub
  handleLaunchDm() {
    const userInput = document.getElementById('dmUsername');
    if (!userInput) return;
    const val = userInput.value.trim();
    if (!val) {
      alert("Please enter an Instagram username or handle.");
      return;
    }
    const info = window.JarvisInsta.generateDmLink(val);
    window.JarvisAI.openUrl(info.link);
    this.addMessage("jarvis", `Launching Instagram Direct Message conversation with @${info.username}.`);
  }

  // Schedule Queue Renderer
  renderQueue() {
    const listElem = document.getElementById('queueList');
    if (!listElem || !window.JarvisInsta) return;

    const items = window.JarvisInsta.queue;
    if (items.length === 0) {
      listElem.innerHTML = '<p style="color:var(--text-dim); font-size:12px; text-align:center; padding:12px;">No scheduled posts yet. Generate a caption to add one.</p>';
      return;
    }

    listElem.innerHTML = items.map(item => `
      <div class="queue-item">
        <div>
          <div class="queue-title">${item.title}</div>
          <div class="queue-meta">Date: ${item.date} | Status: <span style="color:var(--cyan-glow);">${item.status}</span></div>
        </div>
        <button onclick="window.JarvisApp.removeQueueItem('${item.id}')" style="background:none; border:none; color:var(--danger-neon); cursor:pointer;">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');
  }

  removeQueueItem(id) {
    window.JarvisInsta.removeFromQueue(id);
    this.renderQueue();
  }

  // Settings
  populateSettingsForm() {
    const provider = document.getElementById('settingAiProvider');
    const geminiKey = document.getElementById('settingGeminiKey');
    const openaiKey = document.getElementById('settingOpenaiKey');
    const voiceSelect = document.getElementById('settingVoiceSelect');

    if (provider) provider.value = window.JarvisAI.provider;
    if (geminiKey) geminiKey.value = window.JarvisAI.geminiKey;
    if (openaiKey) openaiKey.value = window.JarvisAI.openaiKey;

    if (voiceSelect && window.JarvisVoice) {
      voiceSelect.innerHTML = window.JarvisVoice.voices.map(v => 
        `<option value="${v.name}" ${window.JarvisVoice.selectedVoice && window.JarvisVoice.selectedVoice.name === v.name ? 'selected' : ''}>${v.name} (${v.lang})</option>`
      ).join('');
    }
  }

  saveSettingsForm() {
    const provider = document.getElementById('settingAiProvider')?.value || 'builtin';
    const geminiKey = document.getElementById('settingGeminiKey')?.value || '';
    const openaiKey = document.getElementById('settingOpenaiKey')?.value || '';
    const voiceName = document.getElementById('settingVoiceSelect')?.value;

    window.JarvisAI.setProvider(provider, { gemini: geminiKey, openai: openaiKey });
    if (voiceName && window.JarvisVoice) {
      window.JarvisVoice.setVoiceByName(voiceName);
    }
    if (window.JarvisAudio) window.JarvisAudio.playSuccess();
    this.addMessage("jarvis", "Neural configurations and settings saved successfully, sir.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.JarvisApp = new JarvisApplication();
  window.JarvisApp.init();
});
