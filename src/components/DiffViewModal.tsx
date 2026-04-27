import React from 'react';
import { X, Check, XCircle } from 'lucide-react';

interface FileChange {
  path: string;
  content: string;
  type: 'create' | 'modify' | 'delete';
}

interface DiffViewModalProps {
  changes: FileChange[];
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptFile: (path: string) => void;
  onRejectFile: (path: string) => void;
  onClose: () => void;
}

export default function DiffViewModal({ changes, onAcceptAll, onRejectAll, onAcceptFile, onRejectFile, onClose }: DiffViewModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-lg w-full max-w-6xl h-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#252526]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            Review AI Changes ({changes.length} files)
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={onRejectAll} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors flex items-center gap-1">
              <XCircle size={14}/> Reject All
            </button>
            <button onClick={onAcceptAll} className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex items-center gap-1">
              <Check size={14}/> Accept All
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 ml-4"><X size={20}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-[#1e1e1e]">
          {changes.map((change) => (
            <div key={change.path} className="border border-[#333] rounded-md overflow-hidden bg-[#252526]">
              <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#333]">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded uppercase font-bold ${
                    change.type === 'create' ? 'bg-green-900 text-green-300' :
                    change.type === 'modify' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-red-900 text-red-300'
                  }`}>
                    {change.type}
                  </span>
                  <span className="font-mono text-sm text-white">{change.path}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onRejectFile(change.path)} className="text-red-400 hover:text-red-300 hover:bg-red-900/30 px-3 py-1 rounded text-xs transition-colors border border-red-900/50">Reject</button>
                  <button onClick={() => onAcceptFile(change.path)} className="text-green-400 hover:text-green-300 hover:bg-green-900/30 px-3 py-1 rounded text-xs transition-colors border border-green-900/50">Accept</button>
                </div>
              </div>
              <div className="p-4 overflow-x-auto max-h-[400px] overflow-y-auto bg-[#1e1e1e]">
                <pre className="text-xs font-mono text-gray-300 whitespace-pre">
                  {change.content || '(File deleted)'}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
