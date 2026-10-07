import React, { useState, useRef, useEffect } from 'react';
import { AICore } from '../components/AICore';
import { QuickCommands } from '../components/QuickCommands';
import { JarvisState, ChatMessage, SystemMetrics, DiagnosticEntry } from '../types';
import { Mic, MicOff, Send, Volume2, Sparkles, Activity, ShieldCheck, Terminal, Radio, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface HomePageProps {
  jarvisState: JarvisState;
  sessionActive: boolean;
  messages: ChatMessage[];
  diagnostics?: DiagnosticEntry[];
  onSendMessage: (msg: string) => void;
  isListening: boolean;
  onToggleVoice: () => void;
  metrics?: SystemMetrics;
  userName: string;
}

export const HomePage: React.FC<HomePageProps> = ({
  jarvisState,
  sessionActive,
  messages,
  diagnostics = [],
  onSendMessage,
  isListening,
  onToggleVoice,
  metrics,
  userName
}) => {
  const [inputText, setInputText] = useState('');
  const [showDiagView, setShowDiagView] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Microhone Status Label & Color
  const getMicStatusBadge = () => {
    if (!sessionActive) {
      return {
        label: "MICROPHONE STANDBY // SLEEPING",
        sub: "SAY 'JARVIS' TO WAKE",
        dotClass: "bg-slate-500",
        textClass: "text-slate-400 border-slate-700 bg-slate-900/60"
      };
    }
    switch (jarvisState) {
      case 'LISTENING':
        return {
          label: "● MICROPHONE ACTIVE // LISTENING",
          sub: "VOICE STREAM OPEN",
          dotClass: "bg-jarvis-cyan shadow-neon-cyan animate-pulse",
          textClass: "text-jarvis-cyan border-jarvis-cyan/40 bg-jarvis-cyan/10 shadow-neon-cyan"
        };
      case 'PROCESSING':
      case 'THINKING':
        return {
          label: "● PROCESSING DIRECTIVE...",
          sub: "EVALUATING COMMAND MATRIX",
          dotClass: "bg-purple-400 animate-pulse",
          textClass: "text-purple-300 border-purple-500/40 bg-purple-950/40"
        };
      case 'EXECUTING':
        return {
          label: "● EXECUTING SYSTEM ACTION...",
          sub: "LAUNCHING / RUNNING",
          dotClass: "bg-amber-400 animate-pulse",
          textClass: "text-amber-300 border-amber-500/40 bg-amber-950/40"
        };
      case 'SPEAKING':
        return {
          label: "● SPEAKING // TTS TRANSMITTING",
          sub: "MIC PAUSED (ECHO PREVENTION)",
          dotClass: "bg-jarvis-gold animate-pulse",
          textClass: "text-jarvis-gold border-jarvis-gold/40 bg-jarvis-gold/10"
        };
      case 'ERROR':
        return {
          label: "● SUBSYSTEM ANOMALY // RECOVERING",
          sub: "AUTOMATIC RETRY PENDING",
          dotClass: "bg-red-500 animate-ping",
          textClass: "text-red-400 border-red-500/40 bg-red-950/40"
        };
      default:
        return {
          label: "● ONLINE // LISTENING",
          sub: "AWAITING BOSS DIRECTIVE",
          dotClass: "bg-emerald-400 animate-pulse",
          textClass: "text-emerald-400 border-emerald-500/40 bg-emerald-950/40"
        };
    }
  };

  const micBadge = getMicStatusBadge();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Central Hero: AI Core & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Left: System HUD Quick Overview */}
        <div className="glass-panel rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-jarvis-border/60 pb-3 mb-4">
            <span className="font-hud font-bold text-xs tracking-wider text-jarvis-cyan flex items-center gap-2">
              <Activity className="w-4 h-4" /> TELEMETRY MATRIX
            </span>
            <span className="text-[10px] font-mono text-slate-400">MACOS.ARM64</span>
          </div>

          {metrics ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-data text-slate-300 mb-1">
                  <span>CPU LOAD ({metrics.cpu_cores} CORES)</span>
                  <span className="text-jarvis-cyan font-bold">{metrics.cpu_percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-jarvis-blue to-jarvis-cyan rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(metrics.cpu_percent, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-data text-slate-300 mb-1">
                  <span>MEMORY USED</span>
                  <span className="text-jarvis-cyan font-bold">{metrics.memory_percent}% ({metrics.memory_used_gb} GB)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 rounded-full transition-all duration-300"
                    style={{ width: `${metrics.memory_percent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-data text-slate-300 mb-1">
                  <span>DISK STORAGE</span>
                  <span className="text-jarvis-gold font-bold">{metrics.disk_percent}% ({metrics.disk_free_gb} GB FREE)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-jarvis-gold rounded-full transition-all duration-300"
                    style={{ width: `${metrics.disk_percent}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] font-mono text-slate-400">
                <span>HOST: {metrics.hostname}</span>
                <span>UPTIME: {metrics.uptime}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono py-8 text-center">
              Synchronizing hardware telemetry...
            </div>
          )}
        </div>

        {/* Center: Arc Reactor Visualizer & State */}
        <div className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden text-center">
          <div className="absolute top-3 left-4 text-[10px] font-mono tracking-widest text-jarvis-cyan/60">
            NEURAL CORE // MARK VII
          </div>

          <AICore state={jarvisState} size={220} onClick={onToggleVoice} />

          <div className="mt-4">
            <h2 className="font-hud font-extrabold text-lg tracking-widest text-white">
              J.A.R.V.I.S.
            </h2>
            <div className={`mt-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold tracking-wider inline-flex items-center gap-2 ${micBadge.textClass}`}>
              <span className={`w-2 h-2 rounded-full ${micBadge.dotClass}`} />
              <span>{micBadge.label}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 font-sans">
              "How may I assist you, {userName}?"
            </p>
          </div>

          {/* Equalizer animation */}
          <div className="flex items-center gap-1.5 mt-3 h-5">
            {[4, 12, 18, 24, 14, 20, 8, 16, 22, 10, 15, 6].map((h, i) => (
              <span 
                key={i} 
                className={`w-1 rounded-full transition-all duration-150 ${
                  jarvisState === 'SPEAKING' || jarvisState === 'LISTENING'
                    ? 'bg-jarvis-cyan animate-pulse' 
                    : 'bg-slate-700'
                }`}
                style={{ height: jarvisState === 'SPEAKING' || jarvisState === 'LISTENING' ? `${h}px` : '4px' }}
              />
            ))}
          </div>
        </div>

        {/* Right: Security & Voice Controls */}
        <div className="glass-panel rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-jarvis-border/60 pb-3 mb-4">
            <span className="font-hud font-bold text-xs tracking-wider text-jarvis-cyan flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> ACCESS & CONTROLS
            </span>
            <span className="text-[10px] font-mono text-jarvis-green">ENFORCED</span>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="font-data font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>VOICE SYNTHESIS</span>
                <span className="text-jarvis-cyan font-mono">DANIEL (MALE)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Native macOS British butler speech engine active. Single male voice enforced.
              </p>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="font-data font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>SECURITY ENCLAVE</span>
                <span className="text-jarvis-green font-mono">SAFE</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Dangerous directives require explicit confirmation. Destructive commands are blocked.
              </p>
            </div>

            <button
              onClick={onToggleVoice}
              className={`w-full py-2.5 px-4 rounded-lg font-hud font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 ${
                sessionActive
                  ? 'bg-jarvis-cyan text-black shadow-neon-cyan hover:bg-cyan-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-jarvis-cyan border border-jarvis-cyan/30'
              }`}
            >
              {sessionActive ? (
                <>
                  <MicOff className="w-4 h-4" /> STOP LISTENING
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" /> ACTIVATE JARVIS
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] font-mono text-center mt-3 flex items-center justify-center gap-1.5">
            {sessionActive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">JARVIS ACTIVE // {jarvisState}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-slate-400">STANDBY // CLICK ACTIVATE OR SAY "JARVIS"</span>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Real-Time Conversation Stream & Diagnostic Panel */}
      <div className="flex-1 glass-panel rounded-xl p-4 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between border-b border-jarvis-border/60 pb-2 mb-3">
          <div className="flex items-center gap-4">
            <span className="font-hud font-bold text-xs tracking-wider text-jarvis-cyan flex items-center gap-2">
              <Terminal className="w-4 h-4" /> DIRECTIVE LOG STREAM
            </span>
            <button
              onClick={() => setShowDiagView(!showDiagView)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                showDiagView 
                  ? 'bg-jarvis-cyan text-black border-jarvis-cyan shadow-neon-cyan' 
                  : 'bg-slate-900/80 text-slate-400 hover:text-jarvis-cyan border-slate-800'
              }`}
            >
              <Radio className="w-3 h-3 inline mr-1" />
              {showDiagView ? "SHOW CHAT FEED" : `DIAGNOSTIC PIPELINE (${diagnostics.length})`}
            </button>
          </div>
          <span className="text-[10px] font-mono text-slate-400">{messages.length} ENTRIES</span>
        </div>

        {/* View Switcher: Diagnostic Pipeline or Chat Messages */}
        {showDiagView ? (
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {diagnostics.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
                <Radio className="w-6 h-6 text-jarvis-cyan/50 mb-2" />
                <span>No voice/directive transactions recorded yet. Speak or type a command.</span>
              </div>
            ) : (
              diagnostics.map((d) => (
                <div key={d.id} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-[10px]">
                    <span className="text-sky-400 font-bold">VOICE / DIRECTIVE RECEIVED</span>
                    <span>{d.timestamp}</span>
                  </div>
                  <div className="text-white">
                    <span className="text-slate-400">TRANSCRIPT:</span> <strong className="text-white">"{d.transcript}"</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">INTENT:</span> <span className="text-jarvis-cyan font-bold">{d.intent}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">TARGET / QUERY:</span> <span className="text-slate-200">"{d.targetOrQuery}"</span>
                  </div>
                  {d.appFound && d.appFound !== 'N/A' && (
                    <div>
                      <span className="text-slate-400">APPLICATION FOUND:</span>{' '}
                      <span className={d.appFound === 'YES' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {d.appFound}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                    <span className="text-slate-400">LAUNCH RESULT:</span>
                    {d.launchResult === 'SUCCESS' ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> SUCCESS
                      </span>
                    ) : d.launchResult === 'NOT_INSTALLED' ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> NOT INSTALLED
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> FAILURE
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Messages Feed */
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
                <Sparkles className="w-6 h-6 text-jarvis-cyan/50 mb-2" />
                <span>Awaiting instructions. Try saying "Open Instagram", "Open Terminal", or "Play Tamil vibe songs".</span>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-jarvis-blue/20 border border-jarvis-blue/40 text-slate-100 shadow-neon-blue'
                        : 'bg-slate-900/80 border border-jarvis-cyan/30 text-slate-200 shadow-neon-cyan'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1 text-[10px] font-mono">
                      <span className={m.sender === 'user' ? 'text-blue-400 font-bold' : 'text-jarvis-cyan font-bold'}>
                        {m.sender === 'user' ? userName.toUpperCase() : 'J.A.R.V.I.S.'}
                      </span>
                      <span className="text-slate-500">{m.timestamp}</span>
                    </div>

                    <p className="whitespace-pre-wrap">{m.text}</p>

                    {/* Directive Execution Log Badge */}
                    {m.toolAction && (
                      <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="text-slate-400 font-bold">COMMAND // {m.toolAction}:</span>
                        {m.toolResult?.app_name && (
                          <span className="text-white font-semibold">{m.toolResult.app_name}</span>
                        )}
                        {m.toolResult?.query && (
                          <span className="text-white font-semibold">"{m.toolResult.query}"</span>
                        )}
                        {m.toolResult?.service && (
                          <span className="text-slate-400">({m.toolResult.service})</span>
                        )}
                        {m.toolResult?.not_installed ? (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] border border-red-500/40 font-bold">
                            ✗ NOT INSTALLED
                          </span>
                        ) : m.toolStatus === 'FAILED' ? (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] border border-red-500/40 font-bold">
                            ✗ FAILED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] border border-emerald-500/40 font-bold">
                            ✓ SUCCESS
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Bottom Input Area & Quick Commands */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
          <QuickCommands onExecute={onSendMessage} />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Speak with 'Hey Jarvis' or type a directive (e.g. 'Open Instagram', 'Play Tamil vibe songs')..."
              className="flex-1 bg-slate-950 border border-jarvis-border/60 focus:border-jarvis-cyan rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              className="p-2.5 bg-jarvis-cyan text-black hover:bg-cyan-300 rounded-lg shadow-neon-cyan transition-transform active:scale-95"
              title="Transmit Directive"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
