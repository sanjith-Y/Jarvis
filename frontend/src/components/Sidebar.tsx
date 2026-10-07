import React from 'react';
import { 
  Home, 
  Bot, 
  Bell, 
  Cpu, 
  Database, 
  FolderTree, 
  Clock, 
  Settings, 
  Zap 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, unreadCount = 0 }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'assistant', label: 'Assistant', icon: Bot },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'memory', label: 'Memory', icon: Database },
    { id: 'system', label: 'System', icon: Cpu },
    { id: 'files', label: 'Files', icon: FolderTree },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'reminders', label: 'Reminders', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-jarvis-border flex flex-col justify-between py-6 px-4 select-none shrink-0 z-20">
      <div>
        {/* Brand identity */}
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="w-9 h-9 rounded-full border border-jarvis-cyan flex items-center justify-center bg-jarvis-cyan/10 shadow-neon-cyan">
            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
          </div>
          <div>
            <div className="font-hud font-extrabold text-base tracking-widest text-white flex items-center gap-2">
              J.A.R.V.I.S.
              <span className="text-[10px] text-jarvis-cyan border border-jarvis-cyan/40 px-1 rounded bg-jarvis-cyan/10">
                MARK VII
              </span>
            </div>
            <div className="text-[11px] font-data text-slate-400 tracking-wider">
              AI OPERATING SYSTEM
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-jarvis-cyan/15 text-jarvis-cyan border border-jarvis-cyan/40 shadow-neon-cyan'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-jarvis-cyan' : 'text-slate-400'}`} />
                  <span className="font-data tracking-wide">{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-jarvis-cyan text-black rounded-full shadow-[0_0_8px_#00f0ff]">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer status pill */}
      <div className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-jarvis-green shadow-[0_0_6px_#00ff88]" />
          HOST READY
        </span>
        <span className="text-slate-500">v1.0.0</span>
      </div>
    </aside>
  );
};
