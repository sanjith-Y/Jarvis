import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { Send, Trash2, Copy, Code, Bot, Sparkles, Terminal } from 'lucide-react';

interface AssistantPageProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  onClearMessages: () => void;
  userName: string;
}

export const AssistantPage: React.FC<AssistantPageProps> = ({
  messages,
  onSendMessage,
  onClearMessages,
  userName
}) => {
  const [input, setInput] = useState('');
  const [codingMode, setCodingMode] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const prefix = codingMode ? "[Coding Mode] " : "";
    onSendMessage(prefix + input.trim());
    setInput('');
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-4">
      {/* Header bar */}
      <div className="glass-panel rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-jarvis-cyan" />
          <div>
            <h1 className="font-hud font-bold text-base tracking-wider text-white">
              INTELLIGENT ASSISTANT CONSOLE
            </h1>
            <p className="text-xs text-slate-400 font-data">
              Autonomous reasoning, safe computer control & multi-language coding intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCodingMode(!codingMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-data font-bold tracking-wider transition-all ${
              codingMode
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            CODING MODE: {codingMode ? 'ACTIVE' : 'OFF'}
          </button>

          <button
            onClick={onClearMessages}
            className="p-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 border border-slate-700 transition-colors"
            title="Clear Conversation History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 glass-panel rounded-xl p-6 overflow-y-auto space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center max-w-md mx-auto">
            <Sparkles className="w-8 h-8 text-jarvis-cyan mb-3 opacity-60" />
            <h3 className="font-hud font-bold text-sm text-slate-300 mb-1">
              CONVERSATION ENGINE READY
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask questions, request code reviews, trigger macOS computer actions, or search the live web.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl p-4 text-sm leading-relaxed relative group ${
                  m.sender === 'user'
                    ? 'bg-jarvis-blue/20 border border-jarvis-blue/40 text-slate-100 shadow-neon-blue'
                    : 'bg-slate-900/90 border border-jarvis-cyan/30 text-slate-200 shadow-neon-cyan'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1 text-[10px] font-mono">
                  <span className={m.sender === 'user' ? 'text-blue-400 font-bold' : 'text-jarvis-cyan font-bold'}>
                    {m.sender === 'user' ? userName.toUpperCase() : 'J.A.R.V.I.S.'}
                  </span>
                  <span className="text-slate-500">{m.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap font-sans text-sm">
                  {m.text}
                </div>

                {/* Tool execution result card if any */}
                {m.toolAction && (
                  <div className="mt-3 p-2.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>⚙ Tool Action: <strong className="text-jarvis-cyan">{m.toolAction}</strong></span>
                      <span className="text-jarvis-green text-[10px]">{m.toolStatus || 'COMPLETED'}</span>
                    </div>
                  </div>
                )}

                {/* Copy button */}
                <button
                  onClick={() => copyText(m.text)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-opacity"
                  title="Copy Text"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="glass-panel rounded-xl p-3 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            codingMode
              ? "Coding Mode Active: Ask to explain, refactor, or generate Python, TypeScript, React code..."
              : "Type your query or directive to JARVIS..."
          }
          className="flex-1 bg-slate-950 border border-jarvis-border/60 focus:border-jarvis-cyan rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
        />
        <button
          onClick={handleSend}
          className="px-5 py-2.5 bg-jarvis-cyan hover:bg-cyan-300 text-black font-hud font-bold text-xs tracking-wider rounded-lg shadow-neon-cyan flex items-center gap-2 transition-transform active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          TRANSMIT
        </button>
      </div>
    </div>
  );
};
