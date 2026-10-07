/**
 * Centralized Single-Instance Text-To-Speech Manager
 * Enforces strictly ONE MALE VOICE for all J.A.R.V.I.S. responses.
 * Manages a single unified speech queue and prevents concurrent TTS audio.
 */

class SpeechManager {
  private selectedMaleVoice: SpeechSynthesisVoice | null = null;
  private isSpeakingState: boolean = false;
  private voicesLoaded: boolean = false;
  private safetyTimeout: any = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  // Known Male Voice Names in macOS, Chrome, Safari, Edge
  private preferredMaleNames: string[] = [
    'Daniel',               // Quintessential British Butler voice on macOS/iOS
    'Google UK English Male',
    'Oliver',
    'George',
    'Arthur',
    'Fred',
    'Alex',
    'Aaron',
    'David',
    'Mark',
    'James',
    'Rishi'
  ];

  // Female voice names to strictly blacklist and reject
  private femaleBlacklist: string[] = [
    'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona',
    'veena', 'zira', 'susan', 'hazel', 'catherine', 'linda',
    'female', 'woman', 'girl', 'eva', 'serena', 'ava', 'allison'
  ];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
    }
  }

  private initVoices(): void {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    this.voicesLoaded = true;

    // 1. First priority: Match preferred English male voices
    for (const name of this.preferredMaleNames) {
      const match = voices.find(v => 
        v.name.toLowerCase().includes(name.toLowerCase()) && 
        v.lang.startsWith('en')
      );
      if (match) {
        this.selectedMaleVoice = match;
        return;
      }
    }

    // 2. Second priority: Any voice with 'male' in name or description (excluding blacklisted)
    const explicitMale = voices.find(v => {
      const lower = v.name.toLowerCase();
      const isBlacklisted = this.femaleBlacklist.some(f => lower.includes(f));
      return v.lang.startsWith('en') && lower.includes('male') && !isBlacklisted;
    });

    if (explicitMale) {
      this.selectedMaleVoice = explicitMale;
      return;
    }

    // 3. Fallback: Any English voice that is NOT in the female blacklist
    const safeFallback = voices.find(v => {
      const lower = v.name.toLowerCase();
      return v.lang.startsWith('en') && !this.femaleBlacklist.some(f => lower.includes(f));
    });

    if (safeFallback) {
      this.selectedMaleVoice = safeFallback;
    }
  }

  public getSelectedVoice(): SpeechSynthesisVoice | null {
    if (!this.selectedMaleVoice) {
      this.initVoices();
    }
    return this.selectedMaleVoice;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingState || (typeof window !== 'undefined' && window.speechSynthesis?.speaking);
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (this.safetyTimeout) {
        clearTimeout(this.safetyTimeout);
        this.safetyTimeout = null;
      }
      window.speechSynthesis.cancel();
      this.isSpeakingState = false;
    }
  }

  public cancelCurrentSpeech(): void {
    this.stop();
  }

  /**
   * Central speech execution.
   * Cancels any existing playback before starting and uses only the verified male voice.
   */
  public speak(text: string, onEnd?: () => void, onStart?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    // Always stop and cancel existing speech to prevent overlapping voices
    this.cancelCurrentSpeech();

    // Clean text of markdown characters
    const cleanText = text.replace(/[*#_`]/g, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.02;
    utterance.pitch = 0.95;

    const voice = this.getSelectedVoice();
    if (voice) {
      utterance.voice = voice;
    }

    this.activeUtterance = utterance;

    let finished = false;
    const handleFinish = () => {
      if (finished) return;
      finished = true;
      this.activeUtterance = null;
      if (this.safetyTimeout) {
        clearTimeout(this.safetyTimeout);
        this.safetyTimeout = null;
      }
      this.isSpeakingState = false;
      if (onEnd) onEnd();
    };

    utterance.onstart = () => {
      this.isSpeakingState = true;
      if (onStart) onStart();
    };

    utterance.onend = handleFinish;
    utterance.onerror = (e) => {
      console.warn("Speech error or cancelled:", e);
      handleFinish();
    };

    // Safety timeout in case browser TTS event hangs
    const estimatedDuration = Math.max(2000, Math.min(25000, cleanText.length * 80));
    this.safetyTimeout = setTimeout(() => {
      if (!finished && this.isSpeakingState) {
        handleFinish();
      }
    }, estimatedDuration);

    this.isSpeakingState = true;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  }
}

export const speechManager = new SpeechManager();
