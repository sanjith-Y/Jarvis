import React, { useState, useEffect } from 'react';
import { MemoryItem } from '../types';
import { api } from '../services/api';
import { Database, Search, Plus, Trash2, Tag, Calendar } from 'lucide-react';

export const MemoryPage: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('projects');

  const loadMemories = async () => {
    try {
      const data = await api.getMemories(search);
      setMemories(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [search]);

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    await api.createMemory(newContent.trim(), newCategory);
    setNewContent('');
    loadMemories();
  };

  const handleDelete = async (id: number) => {
    await api.deleteMemory(id);
    loadMemories();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-hud font-bold text-base tracking-wider text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-jarvis-cyan" /> LONG-TERM KNOWLEDGE VAULT
          </h1>
          <p className="text-xs text-slate-400 font-data">
            Persistent context, preferences, active projects & recall repository
          </p>
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-jarvis-cyan"
          />
        </div>
      </div>

      {/* Add Memory Input */}
      <div className="glass-panel rounded-xl p-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Store a fact, preference, or goal (e.g. 'Prefers dark mode and concise summaries')..."
          className="flex-1 min-w-[280px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-jarvis-cyan"
        />

        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-jarvis-cyan font-data"
        >
          <option value="projects">Projects</option>
          <option value="preferences">Preferences</option>
          <option value="goals">Goals</option>
          <option value="general">General</option>
        </select>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-jarvis-cyan hover:bg-cyan-300 text-black font-hud font-bold text-xs tracking-wider rounded-lg shadow-neon-cyan transition-transform active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> STORE MEMORY
        </button>
      </div>

      {/* Memory Cards Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-1 scrollbar-thin">
        {memories.length === 0 ? (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
            <Database className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
            <span>No memories match your query.</span>
          </div>
        ) : (
          memories.map((m) => (
            <div
              key={m.id}
              className="glass-panel rounded-xl p-4 flex flex-col justify-between hover:border-jarvis-cyan/40 transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-jarvis-cyan/15 text-jarvis-cyan border border-jarvis-cyan/30 text-[10px] font-mono uppercase">
                    <Tag className="w-2.5 h-2.5" /> {m.category}
                  </span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition-opacity"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {m.content}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>{m.created_at}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
