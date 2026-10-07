/**
 * JARVIS Voice Interface
 * Manages Microphone Permissions, Continuous Speech Recognition,
 * Male-only Speech Synthesis, and Echo-free Voice Loop.
 */

class JarvisVoiceEngine {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.continuousMode = false;
    this.selectedVoice = null;
    this.voices = [];
    this.pitch = 0.95;
    this.rate = 1.02;
    this.muted = false;
    this.activeUtterance = null;
    this.isSpeaking = false;
    this.onCommandCallback = null;
    this.onStatusChangeCallback = null;
    this.hasMicPermission = false;
    this.restartTimeout = null;

    // Preferred Male Voices
    this.preferredMaleNames = [
      'Daniel',
      'Google UK English Male',
      'Oliver',
      'George',
      'Arthur',
      'Alex',
      'Fred',
      'David'
    ];

    // Strictly blacklisted female voices
    this.femaleBlacklist = [
      'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona',
      'veena', 'zira', 'susan', 'hazel', 'catherine', 'linda',
      'female', 'woman', 'girl', 'eva', 'serena', 'ava', 'allison'
    ];

    this.loadVoices();
    this.initRecognition();
  }

  loadVoices() {
    if (!this.synthesis) return;
    const populate = () => {
      this.voices = this.synthesis.getVoices();
      if (!this.voices || this.voices.length === 0) return;

      // 1. Match preferred male names
      for (const name of this.preferredMaleNames) {
        const found = this.voices.find(v => 
          v.name.toLowerCase().includes(name.toLowerCase()) && 
          v.lang.startsWith('en')
        );
        if (found) {
          this.selectedVoice = found;
          return;
        }
      }

      // 2. Any voice explicitly marked male excluding blacklist
      const explicitMale = this.voices.find(v => {
        const lower = v.name.toLowerCase();
        const isBlacklisted = this.femaleBlacklist.some(f => lower.includes(f));
        return v.lang.startsWith('en') && lower.includes('male') && !isBlacklisted;
      });
      if (explicitMale) {
        this.selectedVoice = explicitMale;
        return;
      }

      // 3. Fallback: Any english voice NOT blacklisted
      const safe = this.voices.find(v => {
        const lower = v.name.toLowerCase();
        return v.lang.startsWith('en') && !this.femaleBlacklist.some(f => lower.includes(f));
      });
      this.selectedVoice = safe || this.voices[0];
    };

    populate();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = populate;
    }
  }

  async requestMicrophonePermission() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop audio tracks after obtaining permission
        stream.getTracks().forEach(track => track.stop());
        this.hasMicPermission = true;
        return true;
      }
    } catch (e) {
      console.warn("Microphone permission denied:", e);
      this.hasMicPermission = false;
      return false;
    }
    return true;
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    // Single speech recognition instance
    if (this.recognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (!this.isSpeaking && this.onStatusChangeCallback) {
        this.onStatusChangeCallback('listening');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto-restart loop if continuous mode is active and not currently speaking
      if (this.continuousMode && !this.isSpeaking) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.continuousMode && !this.isSpeaking) {
            try {
              this.recognition.start();
            } catch (e) {}
          }
        }, 200);
      } else if (!this.continuousMode && !this.isSpeaking) {
        if (this.onStatusChangeCallback) this.onStatusChangeCallback('idle');
      }
    };

    this.recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        this.continuousMode = false;
        if (this.onStatusChangeCallback) this.onStatusChangeCallback('idle');
        return;
      }
      // Auto-recover from no-speech, network, audio-capture
      if (this.continuousMode && !this.isSpeaking) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.continuousMode && !this.isSpeaking) {
            try { this.recognition.start(); } catch (e) {}
          }
        }, 300);
      }
    };

    this.recognition.onresult = (event) => {
      if (this.isSpeaking) {
        // Prevent hearing itself
        return;
      }

      const results = event.results;
      const latest = results[results.length - 1];
      if (latest && latest[0]) {
        const transcript = latest[0].transcript.trim();
        if (transcript) {
          console.log("Transcribed speech:", transcript);
          this.handleTranscript(transcript);
        }
      }
    };
  }

  handleTranscript(transcript) {
    const lower = transcript.toLowerCase();

    // Check for explicit sleep
    if (["stop listening", "go to sleep", "sleep jarvis", "deactivate jarvis"].some(s => lower.includes(s))) {
      this.stopContinuous();
      if (this.onCommandCallback) this.onCommandCallback(transcript);
      return;
    }

    // Wake-word extraction if present
    let cleanCommand = transcript;
    if (lower.startsWith("jarvis") || lower.startsWith("hey jarvis") || lower.startsWith("okay jarvis")) {
      cleanCommand = transcript.replace(/^(?:hey\s+|okay\s+)?jarvis[,:\s]*/i, '').trim();
      if (!cleanCommand) {
        this.speak("Yes, Boss?", () => {
          if (this.continuousMode) this.startListeningSession();
        });
        return;
      }
    }

    if (this.onCommandCallback) {
      this.onCommandCallback(cleanCommand || transcript);
    }
  }

  async startContinuous() {
    await this.requestMicrophonePermission();
    this.continuousMode = true;
    this.startListeningSession();
  }

  stopContinuous() {
    this.continuousMode = false;
    clearTimeout(this.restartTimeout);
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.isListening = false;
    if (this.onStatusChangeCallback) this.onStatusChangeCallback('sleeping');
  }

  startListeningSession() {
    if (!this.recognition || this.isSpeaking) return;
    try {
      this.recognition.start();
    } catch (e) {
      // Recognition might already be running
    }
  }

  stopListeningSession() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e) {}
    this.isListening = false;
  }

  speak(text, onFinished) {
    if (!this.synthesis || this.muted || !text) {
      if (onFinished) onFinished();
      return;
    }

    // 1. Temporarily pause microphone recognition to PREVENT HEARING ITSELF
    this.stopListeningSession();
    this.isSpeaking = true;
    if (this.onStatusChangeCallback) this.onStatusChangeCallback('speaking');

    // 2. Cancel previous utterances
    this.synthesis.cancel();

    // 3. Clean markdown and format text
    const cleanText = text.replace(/[*#_`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.pitch = this.pitch;
    utterance.rate = this.rate;

    // Retain reference on instance so Chrome GC does not drop it
    this.activeUtterance = utterance;

    let finished = false;
    const finishHandler = () => {
      if (finished) return;
      finished = true;
      this.isSpeaking = false;
      this.activeUtterance = null;

      // 4. AUTOMATIC RESUMPTION: Restart listening after TTS ends
      if (this.continuousMode) {
        if (this.onStatusChangeCallback) this.onStatusChangeCallback('listening');
        this.startListeningSession();
      } else {
        if (this.onStatusChangeCallback) this.onStatusChangeCallback('idle');
      }

      if (onFinished) onFinished();
    };

    utterance.onend = finishHandler;
    utterance.onerror = finishHandler;

    // Safety timeout in case browser TTS event hangs
    const safetyMs = Math.max(2000, Math.min(20000, cleanText.length * 85));
    setTimeout(() => {
      if (!finished && this.isSpeaking) {
        finishHandler();
      }
    }, safetyMs);

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      if (this.continuousMode) {
        this.startListeningSession();
      }
    }
  }
}

window.JarvisVoice = new JarvisVoiceEngine();
