import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  command: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  message,
  command,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="glass-panel border-jarvis-gold/60 max-w-md w-full p-6 rounded-xl shadow-neon-gold animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-jarvis-gold mb-4">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="font-hud font-bold text-base tracking-wider uppercase text-white">
            Security Authorization Required
          </h3>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          {message}
        </p>

        {command && (
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-xs text-jarvis-cyan mb-6 overflow-x-auto">
            {command}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-data text-sm font-semibold tracking-wider transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg bg-jarvis-gold hover:bg-amber-400 text-black font-data text-sm font-bold tracking-wider shadow-neon-gold transition-colors"
          >
            AUTHORIZE & EXECUTE
          </button>
        </div>
      </div>
    </div>
  );
};
