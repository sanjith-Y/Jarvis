import { 
  Globe, 
  Code, 
  Cpu, 
  Bell, 
  Scan, 
  Search, 
  Database, 
  Clock, 
  FileText 
} from 'lucide-react';

interface QuickCommandsProps {
  onExecute: (commandText: string) => void;
}

export const QuickCommands: React.FC<QuickCommandsProps> = ({ onExecute }) => {
  const commands = [
    { label: 'Open Chrome', cmd: 'Open Chrome', icon: Globe },
    { label: 'Open VS Code', cmd: 'Open VS Code', icon: Code },
    { label: 'System Status', cmd: 'What is my system status?', icon: Cpu },
    { label: 'Check Notifications', cmd: 'Check my notifications', icon: Bell },
    { label: 'Analyze Screen', cmd: 'Analyze my screen', icon: Scan },
    { label: 'Search Web', cmd: 'Search the web for quantum computing', icon: Search },
    { label: 'Show Memory', cmd: 'What do you remember about me?', icon: Database },
    { label: 'Set Reminder', cmd: 'Remind me in 30 minutes to review my code', icon: Clock },
    { label: 'Notification Summary', cmd: 'Summarize my notifications', icon: FileText },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 select-none scrollbar-thin scrollbar-thumb-jarvis-border">
      {commands.map((c, i) => {
        const Icon = c.icon;
        return (
          <button
            key={i}
            onClick={() => onExecute(c.cmd)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-jarvis-cyan/15 border border-slate-800 hover:border-jarvis-cyan/40 text-slate-300 hover:text-jarvis-cyan text-xs font-data font-semibold whitespace-nowrap transition-all duration-200"
          >
            <Icon className="w-3.5 h-3.5 text-jarvis-cyan" />
            <span>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
};
