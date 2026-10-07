import React, { useState, useEffect } from 'react';
import { FileEntry } from '../types';
import { api } from '../services/api';
import { FolderTree, File, Folder, Search, Plus, Eye, ArrowLeft } from 'lucide-react';

export const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadFiles = async (subpath = '') => {
    try {
      const res = await api.listFiles(subpath);
      if (res.success) {
        setFiles(res.files);
        setCurrentPath(subpath);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadFiles('');
  }, []);

  const handleOpen = async (entry: FileEntry) => {
    if (entry.is_dir) {
      loadFiles(entry.rel_path);
    } else {
      const res = await api.readFile(entry.rel_path);
      if (res.success) {
        setSelectedFile({ path: entry.rel_path, content: res.content });
      }
    }
  };

  const handleCreate = async () => {
    if (!newFileName.trim()) return;
    const targetPath = currentPath ? `${currentPath}/${newFileName.trim()}` : newFileName.trim();
    await api.createFile(targetPath, newFileContent);
    setNewFileName('');
    setNewFileContent('');
    setShowCreateModal(false);
    loadFiles(currentPath);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-hud font-bold text-base tracking-wider text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-jarvis-cyan" /> WORKSPACE FILE ASSISTANT
          </h1>
          <p className="text-xs text-slate-400 font-data">
            Secure workspace inspection, document summarization, and file generation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentPath && (
            <button
              onClick={() => {
                const parts = currentPath.split('/');
                parts.pop();
                loadFiles(parts.join('/'));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-data font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> BACK
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-jarvis-cyan hover:bg-cyan-300 text-black font-hud font-bold text-xs tracking-wider rounded-lg shadow-neon-cyan transition-transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> CREATE FILE
          </button>
        </div>
      </div>

      {/* Main Grid: File Browser & File Viewer */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        
        {/* File Browser List */}
        <div className="glass-panel rounded-xl p-4 overflow-y-auto space-y-2 scrollbar-thin">
          <div className="text-[11px] font-mono text-slate-500 pb-2 border-b border-slate-800">
            PATH: /{currentPath}
          </div>

          {files.map((f, i) => (
            <div
              key={i}
              onClick={() => handleOpen(f)}
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800/60 cursor-pointer border border-transparent hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {f.is_dir ? (
                  <Folder className="w-4 h-4 text-jarvis-cyan" />
                ) : (
                  <File className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs font-data font-semibold text-slate-200">
                  {f.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {f.is_dir ? 'DIR' : `${f.size_bytes} B`}
              </span>
            </div>
          ))}
        </div>

        {/* File Viewer */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 flex flex-col justify-between overflow-hidden">
          {selectedFile ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <span className="font-mono text-xs font-bold text-jarvis-cyan">
                  {selectedFile.path}
                </span>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Close Viewer
                </button>
              </div>

              <pre className="flex-1 overflow-auto bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-200 leading-relaxed scrollbar-thin">
                {selectedFile.content}
              </pre>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
              <Eye className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
              <span>Select a file from the workspace to inspect contents.</span>
            </div>
          )}
        </div>

      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel border-jarvis-cyan/40 max-w-lg w-full p-6 rounded-xl space-y-4 shadow-neon-cyan">
            <h3 className="font-hud font-bold text-sm tracking-wider text-white">
              CREATE WORKSPACE FILE
            </h3>

            <div>
              <label className="block text-xs font-data text-slate-400 mb-1">FILE NAME</label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. notes.txt or script.py"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan"
              />
            </div>

            <div>
              <label className="block text-xs font-data text-slate-400 mb-1">CONTENT</label>
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                rows={6}
                placeholder="Enter file contents..."
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white outline-none focus:border-jarvis-cyan font-mono resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-data font-semibold"
              >
                CANCEL
              </button>
              <button
                onClick={handleCreate}
                className="px-5 py-2 bg-jarvis-cyan hover:bg-cyan-300 text-black rounded text-xs font-hud font-bold tracking-wider shadow-neon-cyan"
              >
                CREATE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
