/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          dark: '#030712',
          panel: '#09101f',
          card: '#0f172a',
          border: 'rgba(0, 240, 255, 0.2)',
          cyan: '#00f0ff',
          blue: '#0072ff',
          glow: '#00d2ff',
          gold: '#f5a623',
          red: '#ff3366',
          green: '#00ff88',
        }
      },
      fontFamily: {
        hud: ['Orbitron', 'sans-serif'],
        data: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.35)',
        'neon-blue': '0 0 20px rgba(0, 114, 255, 0.35)',
        'neon-gold': '0 0 15px rgba(245, 166, 35, 0.4)',
        'neon-red': '0 0 15px rgba(255, 51, 102, 0.5)',
      }
    },
  },
  plugins: [],
}
