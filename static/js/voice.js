/**
 * JARVIS Voice Interface
 * Manages Speech Recognition, Wake-word triggers, and Butler-tone Speech Synthesis.
 */

class JarvisVoiceEngine {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.continuousMode = false;
    this.wakeWordActive = true;
    this.selectedVoice = null;
    this.voices = [];
    this.pitch = 0.95;
    this.rate = 1.05;
    this.muted = false;
    this.onCommandCallback = null;
    this.onStatusChangeCallback = null;

    this.initRecognition();
    this.loadVoices();
  }

  loadVoices() {
    if (!this.synthesis) return;
    const populate = () => {
      this.voices = this.synthesis.getVoices();
      // Prefer British / Sophisticated voices typical of Jarvis (e.g. Daniel, UK English Male)
      const preferred = this.voices.find(v => 
        v.name.includes("Daniel") || 
        (v.lang.startsWith("en-GB") && v.name.toLowerCase().includes("male")) ||
        v.name.includes("Oliver") ||
        v.name.includes("Arthur")
      ) || this.voices.find(v => v.lang.startsWith("en-GB")) || this.voices.find(v => v.lang.startsWith("en"));

      this.selectedVoice = preferred || this.voices[0] || null;
    };

    populate();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = populate;
    }
  }

  setVoiceByName(name) {
    const v = this.voices.find(x => x.name === name);
    if (v) this.selectedVoice = v;
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('listening');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.continuousMode) {
        try { this.recognition.start(); } catch (e) {}
      } else {
        if (this.onStatusChangeCallback) this.onStatusChangeCallback('idle');
      }
    };

    this.recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        this.continuousMode = false;
      }
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('idle');
    };

    this.recognition.onresult = (event) => {
      const results = event.results;
      const latest = results[results.length - 1];
      if (latest && latest[0]) {
        let transcript = latest[0].transcript.trim();
        console.log("Transcribed speech:", transcript);
        this.handleTranscript(transcript);
      }
    };
  }

  handleTranscript(transcript) {
    const lower = transcript.toLowerCase();
    
    // Check for Wake Word "Hey Jarvis" or "Jarvis"
    if (this.wakeWordActive) {
      if (lower.startsWith("jarvis") || lower.startsWith("hey jarvis")) {
        const cleanCommand = transcript.replace(/^(hey\s+)?jarvis[:,]?\s*/i, '').trim();
        if (window.JarvisAudio) window.JarvisAudio.playListeningStart();
        if (cleanCommand && this.onCommandCallback) {
          this.onCommandCallback(cleanCommand);
        } else {
          this.speak("At your service, sir. How may I assist you?");
        }
        return;
      }
    }

    // Direct command if listening was activated via Push-To-Talk
    if (this.onCommandCallback) {
      this.onCommandCallback(transcript);
    }
  }

  toggleListening(continuous = false) {
    if (!this.recognition) {
      alert("Speech recognition is not available in your browser. Please use Chrome, Safari, or Edge.");
      return false;
    }

    if (this.isListening) {
      this.continuousMode = false;
      this.recognition.stop();
      return false;
    } else {
      this.continuousMode = continuous;
      try {
        this.recognition.start();
        if (window.JarvisAudio) {
          window.JarvisAudio.playListeningStart();
          window.JarvisAudio.connectMicrophone();
        }
        return true;
      } catch (e) {
        console.warn("Could not start recognition:", e);
        return false;
      }
    }
  }

  speak(text) {
    if (!this.synthesis || this.muted || !text) return;

    this.synthesis.cancel(); // Stop any overlapping speech

    const cleanText = text.replace(/[*#_`]/g, ''); // strip markdown formatting
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.pitch = this.pitch;
    utterance.rate = this.rate;

    utterance.onstart = () => {
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('speaking');
    };

    utterance.onend = () => {
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('idle');
    };

    utterance.onerror = () => {
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('idle');
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('idle');
    }
  }
}

window.JarvisVoice = new JarvisVoiceEngine();
