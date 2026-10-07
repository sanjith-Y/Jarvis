/**
 * JARVIS Audio Engine & Synthesized Sound Effects
 * Powered by Web Audio API (Zero external audio assets required)
 */

class JarvisAudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.micStream = null;
    this.dataArray = null;
    this.canvas = null;
    this.canvasCtx = null;
    this.animationId = null;
    this.soundEnabled = true;
    this.isVisualizing = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  // Synthesize Sci-Fi UI Beep
  playBeep(freq = 880, type = 'sine', duration = 0.08) {
    if (!this.soundEnabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio playBeep failed", e);
    }
  }

  // Futuristic System Activation Chime
  playBootSound() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      [330, 440, 660, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.1, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch (e) {}
  }

  // Voice Listening Activated
  playListeningStart() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  // Operation Confirmed Chime
  playSuccess() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.08, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
    } catch (e) {}
  }

  // Setup Visualizer Canvas
  setupCanvasVisualizer(canvasElement) {
    this.canvas = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    this.startCanvasRender();
  }

  // Connect Mic Input for Dynamic Reactor Pulsing
  async connectMicrophone() {
    try {
      this.init();
      if (!this.micStream) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const source = this.ctx.createMediaStreamSource(this.micStream);
        source.connect(this.analyser);
      }
    } catch (e) {
      console.log("Microphone access for visualizer optional or denied", e);
    }
  }

  startCanvasRender() {
    const render = () => {
      this.animationId = requestAnimationFrame(render);
      if (!this.canvas || !this.canvasCtx) return;

      const width = this.canvas.width;
      const height = this.canvas.height;
      this.canvasCtx.clearRect(0, 0, width, height);

      let avgFreq = 0;
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i];
        }
        avgFreq = sum / this.dataArray.length;
      }

      // Draw Sci-Fi HUD Audio Waveform
      const barCount = 32;
      const barWidth = width / barCount - 2;
      
      for (let i = 0; i < barCount; i++) {
        const rawVal = this.dataArray ? (this.dataArray[i % this.dataArray.length] || 0) : 0;
        // Add subtle ambient idle vibration if quiet
        const val = Math.max(rawVal, Math.sin(Date.now() / 250 + i * 0.4) * 8 + 12);
        const barHeight = (val / 255) * (height - 8);

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        const grad = this.canvasCtx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#00f0ff');
        grad.addColorStop(1, 'rgba(0, 114, 255, 0.2)');

        this.canvasCtx.fillStyle = grad;
        this.canvasCtx.shadowColor = '#00f0ff';
        this.canvasCtx.shadowBlur = val > 60 ? 10 : 2;
        this.canvasCtx.fillRect(x, y, barWidth, Math.max(2, barHeight));
      }

      // Dynamically Pulse Arc Reactor
      const reactorWrapper = document.getElementById('reactorWrapper');
      if (reactorWrapper && avgFreq > 20) {
        const scale = 1 + Math.min(0.12, avgFreq / 500);
        const core = reactorWrapper.querySelector('.reactor-core');
        if (core) {
          core.style.transform = `scale(${scale})`;
        }
      }
    };
    render();
  }
}

window.JarvisAudio = new JarvisAudioEngine();
