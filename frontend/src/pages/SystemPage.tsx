import React, { useState, useEffect } from 'react';
import { SystemMetrics } from '../types';
import { api } from '../services/api';
import { 
  Cpu, 
  HardDrive, 
  Battery, 
  Wifi, 
  Activity, 
  Server, 
  Layers 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface SystemPageProps {
  metrics?: SystemMetrics;
}

export const SystemPage: React.FC<SystemPageProps> = ({ metrics }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const hist = await api.getSystemHistory();
        setHistory(hist);
        const procs = await api.getSystemProcesses();
        setProcesses(procs);
      } catch (e) {}
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 gap-6 scrollbar-thin">
      {/* Header */}
      <div className="glass-panel rounded-xl p-5 flex items-center justify-between">
        <div>
          <h1 className="font-hud font-bold text-base tracking-wider text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-jarvis-cyan" /> REAL-TIME HARDWARE TELEMETRY
          </h1>
          <p className="text-xs text-slate-400 font-data">
            Kernel diagnostics, live psutil hardware probes, process inspector & resource metrics
          </p>
        </div>

        {metrics && (
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>OS: <strong className="text-white">{metrics.os}</strong></span>
            <span>UPTIME: <strong className="text-jarvis-cyan">{metrics.uptime}</strong></span>
          </div>
        )}
      </div>

      {/* Top 4 Stat Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CPU Card */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-data font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-jarvis-cyan" /> CPU UTILIZATION
              </span>
              <span className="font-hud font-extrabold text-sm text-jarvis-cyan">
                {metrics.cpu_percent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-jarvis-blue to-jarvis-cyan rounded-full transition-all duration-300"
                style={{ width: `${Math.min(metrics.cpu_percent, 100)}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex justify-between">
              <span>Logical Cores: {metrics.cpu_cores}</span>
              <span>Status: Nominal</span>
            </div>
          </div>

          {/* RAM Card */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-data font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-purple-400" /> MEMORY LOAD
              </span>
              <span className="font-hud font-extrabold text-sm text-purple-400">
                {metrics.memory_percent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-300"
                style={{ width: `${metrics.memory_percent}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex justify-between">
              <span>Used: {metrics.memory_used_gb} GB</span>
              <span>Total: {metrics.memory_total_gb} GB</span>
            </div>
          </div>

          {/* Disk Card */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-data font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-jarvis-gold" /> STORAGE VOLUME
              </span>
              <span className="font-hud font-extrabold text-sm text-jarvis-gold">
                {metrics.disk_percent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-jarvis-gold rounded-full transition-all duration-300"
                style={{ width: `${metrics.disk_percent}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex justify-between">
              <span>Free: {metrics.disk_free_gb} GB</span>
              <span>Total: {metrics.disk_total_gb} GB</span>
            </div>
          </div>

          {/* Battery Card */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-data font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-jarvis-green" /> POWER CONDUIT
              </span>
              <span className="font-hud font-extrabold text-sm text-jarvis-green">
                {metrics.battery.percent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-jarvis-green rounded-full transition-all duration-300"
                style={{ width: `${metrics.battery.percent}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex justify-between">
              <span>Status: {metrics.battery.status}</span>
              <span>Power: {metrics.battery.power_plugged ? 'AC Connected' : 'Battery'}</span>
            </div>
          </div>

        </div>
      )}

      {/* Live Recharts History Area Chart */}
      <div className="glass-panel rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 border-b border-jarvis-border/60 pb-3">
          <span className="font-hud font-bold text-xs tracking-wider text-jarvis-cyan flex items-center gap-2">
            <Activity className="w-4 h-4" /> LIVE TELEMETRY WAVEFORM
          </span>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-jarvis-cyan">
              <span className="w-2.5 h-2.5 rounded-full bg-jarvis-cyan" /> CPU %
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> RAM %
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#475569" fontSize={11} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09101f', borderColor: '#00f0ff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#00f0ff" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" name="CPU" />
                <Area type="monotone" dataKey="memory" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#memGrad)" name="Memory" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
              Collecting historical waveform samples...
            </div>
          )}
        </div>
      </div>

      {/* Real Top Processes Table */}
      <div className="glass-panel rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 border-b border-jarvis-border/60 pb-3">
          <span className="font-hud font-bold text-xs tracking-wider text-jarvis-cyan flex items-center gap-2">
            <Layers className="w-4 h-4" /> TOP ACTIVE PROCESSES
          </span>
          <span className="text-[10px] font-mono text-slate-400">SORTED BY CPU LOAD</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="pb-2">PID</th>
                <th className="pb-2">PROCESS NAME</th>
                <th className="pb-2 text-right">CPU %</th>
                <th className="pb-2 text-right">MEM %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {processes.map((p) => (
                <tr key={p.pid} className="hover:bg-slate-900/60">
                  <td className="py-2.5 text-slate-500">{p.pid}</td>
                  <td className="py-2.5 font-bold text-slate-200">{p.name}</td>
                  <td className="py-2.5 text-right text-jarvis-cyan font-bold">{p.cpu}%</td>
                  <td className="py-2.5 text-right text-purple-400">{p.memory}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
