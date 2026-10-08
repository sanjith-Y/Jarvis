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
    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    // Strictly cancel any existing browser speech synthesis to ensure zero duplicate audio
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const cleanText = text.replace(/[*#_`]/g, '').trim();
    this.isSpeakingState = true;
    if (onStart) onStart();

    // Route to single native macOS speech synthesizer (say -v Daniel) via backend
    fetch('/api/system/say', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText })
    })
      .catch((e) => {
        console.warn("Native TTS request error:", e);
      })
      .finally(() => {
        // Approximate speech duration based on text length (~70ms per word + base)
        const wordCount = cleanText.split(/\s+/).length;
        const delayMs = Math.max(1200, Math.min(15000, wordCount * 360));
        setTimeout(() => {
          this.isSpeakingState = false;
          if (onEnd) onEnd();
        }, delayMs);
      });
  }
}

export const speechManager = new SpeechManager();
