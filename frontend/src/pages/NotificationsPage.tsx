import React, { useState, useEffect } from 'react';
import { NotificationItem, NotificationPriority } from '../types';
import { api } from '../services/api';
import { 
  Bell, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  Sparkles, 
  CheckCheck, 
  Play, 
  Check 
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'IMPORTANT' | 'CRITICAL' | 'UNREAD'>('ALL');
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Simulator Form State
  const [simSource, setSimSource] = useState('Security Gateway');
  const [simTitle, setSimTitle] = useState('Suspicious SSH Login Attempt');
  const [simContent, setSimContent] = useState('Unauthorized IP address 192.168.1.105 attempted root access.');
  const [simPriority, setSimPriority] = useState<NotificationPriority>('CRITICAL');

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications(
        filter === 'CRITICAL' ? 'CRITICAL' : filter === 'IMPORTANT' ? 'IMPORTANT' : undefined,
        filter === 'UNREAD'
      );
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const handleMarkRead = async (id: number) => {
    await api.markNotificationRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    loadNotifications();
  };

  const handleSmartSummary = async () => {
    setLoading(true);
    try {
      const res = await api.getNotificationSummary();
      setSummaryText(res.summary);
      await api.speak(res.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    await api.simulateNotification(simSource, 'Simulator Agent', simTitle, simContent, simPriority);
    loadNotifications();
  };

  const getPriorityBadge = (p: NotificationPriority) => {
    switch (p) {
      case 'CRITICAL':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold">
            <AlertOctagon className="w-3 h-3" /> CRITICAL
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold">
            <AlertTriangle className="w-3 h-3" /> IMPORTANT
          </span>
        );
      case 'NORMAL':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-mono font-bold">
            <Info className="w-3 h-3" /> NORMAL
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-medium">
            LOW PRIORITY
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Top Header */}
      <div className="glass-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-hud font-bold text-base tracking-wider text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-jarvis-cyan" /> INTELLIGENT NOTIFICATION MATRIX
          </h1>
          <p className="text-xs text-slate-400 font-data">
            Contextual triage, importance classification & proactive voice alert protocols
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSmartSummary}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-jarvis-cyan hover:bg-cyan-300 text-black font-hud font-bold text-xs tracking-wider rounded-lg shadow-neon-cyan transition-transform active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loading ? "ANALYZING..." : "GENERATE SMART SUMMARY"}
          </button>

          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-data font-semibold border border-slate-700 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            MARK ALL READ
          </button>
        </div>
      </div>

      {/* Smart Summary Banner if generated */}
      {summaryText && (
        <div className="p-4 rounded-xl bg-jarvis-blue/15 border border-jarvis-cyan/40 text-slate-200 text-sm flex items-start justify-between shadow-neon-blue">
          <div>
            <div className="font-hud font-bold text-xs text-jarvis-cyan mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> J.A.R.V.I.S. INTELLIGENCE BRIEFING
            </div>
            <p className="leading-relaxed font-sans">{summaryText}</p>
          </div>
          <button
            onClick={() => setSummaryText(null)}
            className="text-slate-400 hover:text-white text-xs font-mono ml-4"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {(['ALL', 'IMPORTANT', 'CRITICAL', 'UNREAD'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-data font-bold tracking-wider transition-colors ${
              filter === tab
                ? 'bg-jarvis-cyan/20 text-jarvis-cyan border border-jarvis-cyan/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List & Simulator Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        
        {/* Main Feed */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-4 overflow-y-auto space-y-3 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center font-mono text-xs">
              <Bell className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
              <span>No notifications in this category.</span>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-all ${
                  n.is_read
                    ? 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                    : 'bg-slate-900/90 border-slate-700/80 text-slate-200 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2.5">
                    {getPriorityBadge(n.priority)}
                    <span className="font-data font-bold text-xs uppercase tracking-wider text-slate-300">
                      {n.source}
                    </span>
                    {n.is_simulated ? (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono border border-purple-500/30">
                        SIMULATED NOTIFICATION
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{n.timestamp}</span>
                </div>

                <h4 className="font-data font-bold text-sm text-white mb-1">
                  {n.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {n.content}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Sender: {n.sender}</span>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-jarvis-cyan hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Check className="w-3 h-3" /> Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Development Notification Simulator */}
        <div className="glass-panel rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-jarvis-gold border-b border-jarvis-border/60 pb-3 mb-4">
              <ShieldAlert className="w-4 h-4" />
              <span className="font-hud font-bold text-xs tracking-wider uppercase text-white">
                NOTIFICATION SIMULATOR
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed font-sans">
              Inject test events to verify real-time classification, triage algorithms, and proactive voice alerts.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-data font-semibold mb-1 uppercase">Event Source</label>
                <input
                  type="text"
                  value={simSource}
                  onChange={(e) => setSimSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none focus:border-jarvis-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-data font-semibold mb-1 uppercase">Title</label>
                <input
                  type="text"
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none focus:border-jarvis-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-data font-semibold mb-1 uppercase">Content</label>
                <textarea
                  value={simContent}
                  onChange={(e) => setSimContent(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none focus:border-jarvis-cyan resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-data font-semibold mb-1 uppercase">Priority Override</label>
                <select
                  value={simPriority}
                  onChange={(e) => setSimPriority(e.target.value as NotificationPriority)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none focus:border-jarvis-cyan font-mono"
                >
                  <option value="CRITICAL">CRITICAL (Immediate voice interruption)</option>
                  <option value="IMPORTANT">IMPORTANT (Voice alert if not quiet mode)</option>
                  <option value="NORMAL">NORMAL (Notification center log)</option>
                  <option value="LOW">LOW (Silent grouping)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleSimulate}
            className="w-full mt-4 py-2.5 px-4 bg-slate-800 hover:bg-jarvis-cyan hover:text-black text-jarvis-cyan border border-jarvis-cyan/40 font-hud font-bold text-xs tracking-wider rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            DISPATCH SIMULATION
          </button>
        </div>

      </div>
    </div>
  );
};
