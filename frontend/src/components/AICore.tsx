import React from 'react';
import { JarvisState } from '../types';

interface AICoreProps {
  state: JarvisState;
  onClick?: () => void;
  size?: number;
}

export const AICore: React.FC<AICoreProps> = ({ state, onClick, size = 260 }) => {
  const getColors = () => {
    switch (state) {
      case 'ERROR':
        return {
          glow: '#ff3366',
          ring: 'rgba(255, 51, 102, 0.4)',
          core: 'radial-gradient(circle, #ffffff 0%, #ff3366 60%, #880022 100%)',
          shadow: '0 0 35px rgba(255, 51, 102, 0.7)'
        };
      case 'SLEEPING':
      case 'IDLE':
      case 'OFFLINE':
        return {
          glow: '#475569',
          ring: 'rgba(71, 85, 105, 0.3)',
          core: 'radial-gradient(circle, #64748b 0%, #334155 70%, #0f172a 100%)',
          shadow: '0 0 15px rgba(51, 65, 85, 0.4)'
        };
      case 'ACTIVATING':
        return {
          glow: '#00f0ff',
          ring: 'rgba(0, 240, 255, 0.8)',
          core: 'radial-gradient(circle, #ffffff 0%, #38bdf8 50%, #0284c7 100%)',
          shadow: '0 0 45px rgba(0, 240, 255, 0.8)'
        };
      case 'PROCESSING':
      case 'THINKING':
      case 'EXECUTING':
        return {
          glow: '#a855f7',
          ring: 'rgba(168, 85, 247, 0.6)',
          core: 'radial-gradient(circle, #ffffff 0%, #c084fc 50%, #9333ea 100%)',
          shadow: '0 0 40px rgba(168, 85, 247, 0.8)'
        };
      case 'SPEAKING':
        return {
          glow: '#f5a623',
          ring: 'rgba(245, 166, 35, 0.5)',
          core: 'radial-gradient(circle, #ffffff 0%, #ffc83b 50%, #f5a623 100%)',
          shadow: '0 0 40px rgba(245, 166, 35, 0.8)'
        };
      case 'LISTENING':
        return {
          glow: '#00f0ff',
          ring: 'rgba(0, 240, 255, 0.7)',
          core: 'radial-gradient(circle, #ffffff 0%, #00f0ff 60%, #0072ff 100%)',
          shadow: '0 0 50px rgba(0, 240, 255, 0.9)'
        };
      default: // ONLINE
        return {
          glow: '#00f0ff',
          ring: 'rgba(0, 240, 255, 0.35)',
          core: 'radial-gradient(circle, #ffffff 0%, #00d2ff 55%, #0072ff 100%)',
          shadow: '0 0 30px rgba(0, 240, 255, 0.6)'
        };
    }
  };

  const colors = getColors();

  return (
    <div 
      className="relative flex flex-col items-center justify-center cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
      style={{ width: size, height: size }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`JARVIS AI Core State: ${state}`}
    >
      {/* Outer Ring with Segments */}
      <svg 
        className={`absolute inset-0 w-full h-full ${
          state === 'THINKING' || state === 'EXECUTING' 
            ? 'animate-spin' 
            : state === 'LISTENING'
            ? 'animate-pulse'
            : 'animate-[spin_25s_linear_infinite]'
        }`}
        viewBox="0 0 200 200"
      >
        <circle 
          cx="100" cy="100" r="90" 
          fill="none" 
          stroke={colors.ring} 
          strokeWidth="2" 
          strokeDasharray={state === 'LISTENING' ? "8, 6" : "16, 8, 4, 8"} 
        />
        <circle 
          cx="100" cy="100" r="78" 
          fill="none" 
          stroke={colors.glow} 
          strokeWidth="1.5" 
          strokeDasharray="40 20" 
          opacity="0.6"
        />
      </svg>

      {/* Middle Counter-Rotating Ring */}
      <svg 
        className={`absolute w-[80%] h-[80%] ${
          state === 'THINKING' 
            ? 'animate-[spin_2s_linear_infinite_reverse]' 
            : 'animate-[spin_15s_linear_infinite_reverse]'
        }`}
        viewBox="0 0 160 160"
      >
        <circle 
          cx="80" cy="80" r="70" 
          fill="none" 
          stroke={colors.glow} 
          strokeWidth="2" 
          strokeDasharray="30 15 10 15" 
          opacity="0.8" 
        />
      </svg>

      {/* Inner Energy Core */}
      <div 
        className={`w-[44%] h-[44%] rounded-full flex items-center justify-center transition-all duration-300 ${
          state === 'LISTENING' 
            ? 'scale-110' 
            : state === 'SPEAKING' 
            ? 'scale-105' 
            : 'scale-100'
        }`}
        style={{
          background: colors.core,
          boxShadow: colors.shadow
        }}
      >
        {/* Core Center Pulse Dot */}
        <div className="w-8 h-8 rounded-full bg-white shadow-[0_0_15px_#ffffff] opacity-90 animate-pulse" />
      </div>

      {/* State Glow Aura Ring */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${colors.ring} 0%, transparent 70%)`,
          opacity: state === 'OFFLINE' ? 0.1 : 0.45
        }}
      />
    </div>
  );
};
