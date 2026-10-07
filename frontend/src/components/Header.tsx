import React, { useState, useEffect } from 'react';
import { Bell, Battery, Wifi, ShieldCheck, Activity } from 'lucide-react';
import { SystemMetrics } from '../types';

interface HeaderProps {
  metrics?: SystemMetrics;
  unreadCount?: number;
  onNotificationClick?: () => void;
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  metrics, 
  unreadCount = 0, 
  onNotificationClick,
  isConnected 
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour12: false }));
      setDateStr(now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 glass-panel border-b border-jarvis-border flex items-center justify-between px-6 shrink-0 z-10 select-none">
      {/* Left indicator: Protocol status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-jarvis-green shadow-[0_0_8px_#00ff88]' : 'bg-jarvis-red shadow-[0_0_8px_#ff3366]'}`} />
          <span className="font-hud font-bold text-xs tracking-wider text-white">
            {isConnected ? 'ONLINE // READY' : 'OFFLINE // RECONNECTING'}
          </span>
        </div>
        
        {metrics && (
          <div className="hidden lg:flex items-center gap-2 text-xs font-data text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
            <Activity className="w-3.5 h-3.5 text-jarvis-cyan" />
            <span>CPU: <strong className="text-jarvis-cyan">{metrics.cpu_percent}%</strong></span>
            <span className="text-slate-600">|</span>
            <span>RAM: <strong className="text-jarvis-cyan">{metrics.memory_percent}%</strong></span>
          </div>
        )}
      </div>

      {/* Right controls: Telemetry, Battery, Notification, Time */}
      <div className="flex items-center gap-4">
        {metrics && (
          <div className="flex items-center gap-2 text-xs font-data text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
            <Battery className="w-4 h-4 text-jarvis-gold" />
            <span>{metrics.battery.percent}% ({metrics.battery.status})</span>
          </div>
        )}

        <button 
          onClick={onNotificationClick}
          className="relative p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          title="Notification Center"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-jarvis-cyan text-black rounded-full text-[10px] font-mono font-bold flex items-center justify-center shadow-[0_0_8px_#00f0ff]">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="text-right">
          <div className="font-hud font-bold text-base tracking-wider text-white">
            {timeStr}
          </div>
          <div className="text-[11px] font-data text-slate-400">
            {dateStr}
          </div>
        </div>
      </div>
    </header>
  );
};
