import React, { useState, useEffect } from 'react';
import { AutomationRule } from '../types';
import { api } from '../services/api';
import { Zap, Plus, Trash2, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

export const AutomationPage: React.FC = () => {
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('TIME');
  const [triggerValue, setTriggerValue] = useState('09:00');
  const [actionType, setActionType] = useState('NOTIFICATION_SUMMARY');
  const [actionValue, setActionValue] = useState('Speak morning briefing');
  const [showAddModal, setShowAddModal] = useState(false);

  const loadAutomations = async () => {
    try {
      const data = await api.getAutomations();
      setAutomations(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await api.createAutomation({
      name: name.trim(),
      trigger_type: triggerType,
      trigger_value: triggerValue,
      action_type: actionType,
      action_value: actionValue
    });
    setName('');
    setShowAddModal(false);
    loadAutomations();
  };

  const handleToggle = async (id: number) => {
    await api.toggleAutomation(id);
    loadAutomations();
  };

  const handleDelete = async (id: number) => {
    await api.deleteAutomation(id);
    loadAutomations();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-hud font-bold text-base tracking-wider text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-jarvis-cyan" /> AUTONOMOUS PROTOCOLS & TRIGGERS
          </h1>
          <p className="text-xs text-slate-400 font-data">
            Schedule recurring operations, threshold alerts & conditional directives
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-jarvis-cyan hover:bg-cyan-300 text-black font-hud font-bold text-xs tracking-wider rounded-lg shadow-neon-cyan transition-transform active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> NEW AUTOMATION RULE
        </button>
      </div>

      {/* Rules list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {automations.map((a) => (
          <div
            key={a.id}
            className={`glass-panel rounded-xl p-4 flex items-center justify-between transition-all ${
              a.enabled ? 'border-jarvis-cyan/30' : 'opacity-60 border-slate-800'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-hud font-bold text-sm text-white">
                  {a.name}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  a.enabled ? 'bg-jarvis-green/20 text-jarvis-green border border-jarvis-green/30' : 'bg-slate-800 text-slate-500'
                }`}>
                  {a.enabled ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                <span>Trigger: <strong className="text-jarvis-cyan">{a.trigger_type} ({a.trigger_value})</strong></span>
                <span>Action: <strong className="text-purple-400">{a.action_type}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggle(a.id)}
                className={`px-3 py-1.5 rounded text-xs font-data font-bold tracking-wider ${
                  a.enabled
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-jarvis-cyan text-black'
                }`}
              >
                {a.enabled ? 'DISABLE' : 'ENABLE'}
              </button>

              <button
                onClick={() => handleDelete(a.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors"
                title="Delete Automation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel border-jarvis-cyan/40 max-w-md w-full p-6 rounded-xl space-y-4 shadow-neon-cyan">
            <h3 className="font-hud font-bold text-sm tracking-wider text-white">
              CONFIGURE AUTOMATION RULE
            </h3>

            <div>
              <label className="block text-xs font-data text-slate-400 mb-1">RULE NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nightly Security Sweep"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-data text-slate-400 mb-1">TRIGGER TYPE</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan"
                >
                  <option value="TIME">Time of Day</option>
                  <option value="BATTERY_LESS_THAN">Battery Threshold</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-data text-slate-400 mb-1">TRIGGER VALUE</label>
                <input
                  type="text"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder="e.g. 08:00 or 20"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-data text-slate-400 mb-1">ACTION TYPE</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan"
              >
                <option value="NOTIFICATION_SUMMARY">Voice Notification Summary</option>
                <option value="REMINDER">Trigger Reminder</option>
                <option value="ALERT">Voice Critical Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-data text-slate-400 mb-1">ACTION PARAMETER</label>
              <input
                type="text"
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                placeholder="Parameter value..."
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-data font-semibold"
              >
                CANCEL
              </button>
              <button
                onClick={handleCreate}
                className="px-5 py-2 bg-jarvis-cyan hover:bg-cyan-300 text-black rounded text-xs font-hud font-bold tracking-wider shadow-neon-cyan"
              >
                SAVE RULE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
