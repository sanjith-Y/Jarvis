import React, { useState, useEffect } from 'react';
import { ReminderItem } from '../types';
import { api } from '../services/api';
import { Clock, Plus, CheckCircle, Trash2, Calendar, AlertCircle } from 'lucide-react';

export const RemindersPage: React.FC = () => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [title, setTitle] = useState('');
  const [dueTime, setDueTime] = useState('in 1 hour');

  const loadReminders = async () => {
    try {
      const data = await api.getReminders(filter === 'ALL' ? undefined : filter);
      setReminders(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadReminders();
  }, [filter]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    await api.createReminder(title.trim(), dueTime);
    setTitle('');
    loadReminders();
  };

  const handleComplete = async (id: number) => {
    await api.completeReminder(id);
    loadReminders();
  };

  const handleDelete = async (id: number) => {
    await api.deleteReminder(id);
    loadReminders();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-hud font-bold text-base tracking-wider text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-jarvis-cyan" /> TEMPORAL REMINDER SCHEDULER
          </h1>
          <p className="text-xs text-slate-400 font-data">
            Persistent deadlines, natural language time offsets & proactive agenda tracking
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {(['ALL', 'UPCOMING', 'OVERDUE', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-data font-bold tracking-wider transition-colors ${
                filter === tab
                  ? 'bg-jarvis-cyan/20 text-jarvis-cyan border border-jarvis-cyan/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Add Reminder Bar */}
      <div className="glass-panel rounded-xl p-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Reminder title (e.g. 'Submit AI project report')..."
          className="flex-1 min-w-[240px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-jarvis-cyan"
        />

        <input
          type="text"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          placeholder="e.g. 'at 8 PM' or 'in 30 mins' or 'tomorrow at 10 AM'"
          className="w-64 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-jarvis-cyan font-mono"
        />

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-jarvis-cyan hover:bg-cyan-300 text-black font-hud font-bold text-xs tracking-wider rounded-lg shadow-neon-cyan transition-transform active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> SET REMINDER
        </button>
      </div>

      {/* Reminders List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {reminders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
            <Clock className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
            <span>No reminders in this view.</span>
          </div>
        ) : (
          reminders.map((r) => (
            <div
              key={r.id}
              className={`glass-panel rounded-xl p-4 flex items-center justify-between transition-all ${
                r.status === 'COMPLETED'
                  ? 'opacity-50 border-slate-800'
                  : r.status === 'OVERDUE'
                  ? 'border-red-500/40 bg-red-950/10'
                  : 'border-jarvis-cyan/30'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => handleComplete(r.id)}
                  className={`p-1.5 rounded-full border transition-colors ${
                    r.status === 'COMPLETED'
                      ? 'bg-jarvis-green text-black border-jarvis-green'
                      : 'border-slate-600 hover:border-jarvis-cyan text-transparent hover:text-jarvis-cyan'
                  }`}
                  title="Mark Completed"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>

                <div>
                  <h4 className={`text-sm font-data font-bold ${r.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-white'}`}>
                    {r.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1 text-jarvis-gold">
                      <Calendar className="w-3 h-3" /> Due: {r.due_time}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      r.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(r.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors"
                title="Delete Reminder"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
