import React, { useState } from 'react';
import { Settings, Save, Shield, Volume2, Bot, Moon, Folder } from 'lucide-react';

interface SettingsPageProps {
  userName: string;
  onUpdateUserName: (name: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ userName, onUpdateUserName }) => {
  const [nameInput, setNameInput] = useState(userName);
  const [apiKey, setApiKey] = useState(localStorage.getItem('jarvis_openai_key') || '');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [voiceName, setVoiceName] = useState('Daniel');
  const [speechRate, setSpeechRate] = useState('1.0');
  const [wakeWord, setWakeWord] = useState('Hey Jarvis');
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = () => {
    onUpdateUserName(nameInput);
    localStorage.setItem('jarvis_openai_key', apiKey);
    localStorage.setItem('jarvis_user_name', nameInput);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-6 scrollbar-thin">
      {/* Header */}
      <div className="glass-panel rounded-xl p-5 flex items-center justify-between">
        <div>
          <h1 className="font-hud font-bold text-base tracking-wider text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-jarvis-cyan" /> J.A.R.V.I.S. CONFIGURATION MATRIX
          </h1>
          <p className="text-xs text-slate-400 font-data">
            Personal identity, AI reasoning parameters, voice synthesis, quiet mode & security
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-jarvis-cyan hover:bg-cyan-300 text-black font-hud font-bold text-xs tracking-wider rounded-lg shadow-neon-cyan transition-transform active:scale-95"
        >
          <Save className="w-4 h-4" /> SAVE CONFIGURATION
        </button>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-lg bg-jarvis-green/20 border border-jarvis-green/40 text-jarvis-green text-xs font-mono">
          ✓ Configuration matrix updated and synchronized successfully.
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* User & AI Settings */}
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-jarvis-border/60 pb-3 text-jarvis-cyan font-hud font-bold text-xs tracking-wider">
            <Bot className="w-4 h-4" /> PERSONAL IDENTITY & AI ENGINE
          </div>

          <div>
            <label className="block text-xs font-data font-semibold text-slate-400 mb-1 uppercase">User Name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan"
            />
          </div>

          <div>
            <label className="block text-xs font-data font-semibold text-slate-400 mb-1 uppercase">AI Model Provider</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan font-mono"
            >
              <option value="gpt-4o-mini">OpenAI GPT-4o Mini (Fast & Intelligent)</option>
              <option value="gpt-4o">OpenAI GPT-4o (Deep Reasoning)</option>
              <option value="offline-brain">Built-in Offline Reasoning Engine</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-data font-semibold text-slate-400 mb-1 uppercase">
              OpenAI API Key (Optional — Never stored in code)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              If left blank, J.A.R.V.I.S. operates via the autonomous offline neural engine.
            </p>
          </div>
        </div>

        {/* Voice & Synthesis Settings */}
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-jarvis-border/60 pb-3 text-jarvis-cyan font-hud font-bold text-xs tracking-wider">
            <Volume2 className="w-4 h-4" /> SPEECH & AUDIO SYNTHESIS
          </div>

          <div>
            <label className="block text-xs font-data font-semibold text-slate-400 mb-1 uppercase">Voice Speaker Persona</label>
            <select
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan"
            >
              <option value="Daniel">Daniel (British Butler Persona)</option>
              <option value="Oliver">Oliver (British UK Male)</option>
              <option value="Samantha">Samantha (Siri Natural)</option>
              <option value="Alex">Alex (macOS Classic)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-data font-semibold text-slate-400 mb-1 uppercase">Speech Speed Rate</label>
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.05"
              value={speechRate}
              onChange={(e) => setSpeechRate(e.target.value)}
              className="w-full accent-jarvis-cyan cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0.8x (Deliberate)</span>
              <span>{speechRate}x</span>
              <span>1.4x (Fast)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-data font-semibold text-slate-400 mb-1 uppercase">Default Wake Word</label>
            <input
              type="text"
              value={wakeWord}
              onChange={(e) => setWakeWord(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan"
            />
          </div>
        </div>

        {/* Quiet Mode & Triage */}
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-jarvis-border/60 pb-3 text-jarvis-cyan font-hud font-bold text-xs tracking-wider">
            <Moon className="w-4 h-4" /> QUIET MODE & INTERRUPTION TRIAGE
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            During quiet hours, normal notifications will not speak aloud. Critical security alerts will always notify.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-data font-semibold text-slate-400 mb-1 uppercase">Quiet Hours Start</label>
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-data font-semibold text-slate-400 mb-1 uppercase">Quiet Hours End</label>
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan font-mono"
              />
            </div>
          </div>
        </div>

        {/* Workspace Security */}
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-jarvis-border/60 pb-3 text-jarvis-cyan font-hud font-bold text-xs tracking-wider">
            <Folder className="w-4 h-4" /> WORKSPACE ROOT PERMISSIONS
          </div>

          <div>
            <label className="block text-xs font-data font-semibold text-slate-400 mb-1 uppercase">Authorized Workspace Path</label>
            <input
              type="text"
              readOnly
              value="/Users/sanjith/Documents/Jarvis"
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 font-mono outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              File read/write boundaries are restricted strictly to this root for host safety.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
