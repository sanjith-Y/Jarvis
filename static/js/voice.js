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
    // Single system-wide speech recognition is managed exclusively by the native macOS CoreAudio daemon.
    // In-browser speech recognition is disabled to strictly enforce Requirement 14 (single recognition instance).
    this.recognition = null;
  }

  handleTranscript(transcript) {
    let clean = transcript.trim();
    let lower = clean.toLowerCase();

    // Check for explicit sleep
    if (["stop listening", "go to sleep", "sleep jarvis", "deactivate jarvis"].some(s => lower.includes(s))) {
      this.stopContinuous();
      if (this.onCommandCallback) this.onCommandCallback(transcript);
      return;
    }

    // Iteratively strip conversational preambles, wake words ("jarvis", "jarvin", "travis", etc.), and prepositions
    let changed = true;
    while (changed) {
      const prev = clean;
      clean = clean.replace(/^(?:now\s+)?(?:i\s+said\s+|i\s+told\s+|i\s+asked\s+|tell\s+|ask\s+|i\s+want\s+you\s+to\s+|i\s+need\s+you\s+to\s+)/i, '').trim();
      clean = clean.replace(/^(?:hey\s+|okay\s+|ok\s+|hi\s+|hello\s+)?(?:jarvis|jarvin|travis|java|javis|jarv)\b[,:\s]*/i, '').trim();
      clean = clean.replace(/^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+(?:please\s+)?|will\s+you\s+)/i, '').trim();
      clean = clean.replace(/^(?:to|now)\s+/i, '').trim();
      changed = (clean !== prev);
    }

    // If only wake word was spoken
    if (!clean) {
      this.speak("Yes, Boss?", () => {
        if (this.continuousMode) this.startListeningSession();
      });
      return;
    }

    if (this.onCommandCallback) {
      this.onCommandCallback(clean);
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
    if (this.muted || !text) {
      if (onFinished) onFinished();
      return;
    }

    // Cancel any browser speech synthesis to ensure strictly zero audio conflicts
    if (this.synthesis) {
      try { this.synthesis.cancel(); } catch (e) {}
    }

    this.isSpeaking = true;
    if (this.onStatusChangeCallback) this.onStatusChangeCallback('speaking');

    const cleanText = text.replace(/[*#_`]/g, '').trim();

    // Route to single native macOS Daniel voice
    fetch('/api/system/say', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText })
    })
      .catch((e) => {
        console.warn("Native TTS error:", e);
      })
      .finally(() => {
        const words = cleanText.split(/\s+/).length;
        const delayMs = Math.max(1200, Math.min(15000, words * 360));
        setTimeout(() => {
          this.isSpeaking = false;
          if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback(this.continuousMode ? 'listening' : 'idle');
          }
          if (onFinished) onFinished();
        }, delayMs);
      });
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
