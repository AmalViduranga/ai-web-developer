'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Play, X, Code, Loader2, Sparkles, RefreshCw, AlertCircle, CheckCircle2, Trash2, Eye } from 'lucide-react';
import { useStore, Message } from '@/store/useStore';
import DiffViewModal from './DiffViewModal';

export default function AIChatPanel() {
  const { chatMessages, addChatMessage, clearChat, currentActiveFile, fileContents, setFileContent } = useStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any | null>(null);
  const [aiStatus, setAiStatus] = useState({ state: 'checking', message: 'Connecting to AI...' });
  const [showDiff, setShowDiff] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getBackendUrl = () => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  const checkAiHealth = async () => {
    setAiStatus({ state: 'checking', message: 'Checking AI connection...' });
    try {
      const res = await fetch(`${getBackendUrl()}/api/ai/health`).catch(() => null);
      if (!res || !res.ok) {
        setAiStatus({ state: 'error', message: 'Backend unreachable.' });
        return;
      }
      const data = await res.json();
      if (data.status === 'ok') {
        setAiStatus({ state: 'ready', message: `AI Ready (${data.provider}: ${data.model})` });
      } else {
        setAiStatus({ state: 'warning', message: data.message || data.error });
      }
    } catch (e) {
      setAiStatus({ state: 'error', message: 'Failed to check AI health.' });
    }
  };

  useEffect(() => { checkAiHealth(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isLoading, pendingChanges]);

  const sendMessage = async (text: string = input) => {
    if (!text.trim() || isLoading) return;
    addChatMessage({ role: 'user', content: text });
    setInput('');
    setIsLoading(true);

    try {
      const projectContext = {
        activeFile: currentActiveFile,
        files: currentActiveFile && fileContents[currentActiveFile] ? { [currentActiveFile]: fileContents[currentActiveFile] } : {}
      };

      const res = await fetch(`${getBackendUrl()}/api/ai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, projectContext })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        addChatMessage({ role: 'assistant', content: `❌ Error: ${data.error || 'Failed to get AI response'}\n\nDetails: ${data.details || ''}` });
        return;
      }

      addChatMessage({ role: 'assistant', content: data.reply || 'Applied changes.' });

      if (data.actions && Object.keys(data.actions).length > 0) {
        const hasChanges = data.actions.files_created?.length > 0 || data.actions.files_modified?.length > 0 || data.actions.files_deleted?.length > 0;
        if (hasChanges || data.actions.commands?.length > 0) {
          setPendingChanges(data.actions);
        }
      }
    } catch (err: any) {
      addChatMessage({ role: 'assistant', content: `❌ Network Error: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const getChangesArray = () => {
    if (!pendingChanges) return [];
    const arr: any[] = [];
    if (pendingChanges.files_created) pendingChanges.files_created.forEach((f:any) => arr.push({...f, type: 'create'}));
    if (pendingChanges.files_modified) pendingChanges.files_modified.forEach((f:any) => arr.push({...f, type: 'modify'}));
    if (pendingChanges.files_deleted) pendingChanges.files_deleted.forEach((path:string) => arr.push({path, content: '', type: 'delete'}));
    return arr;
  };

  const applyChanges = async (filesToAccept: string[] = []) => {
    if (!pendingChanges) return;
    const backendUrl = getBackendUrl();
    let appliedCount = 0;
    
    try {
      if (pendingChanges.files_created) {
        for (const f of pendingChanges.files_created) {
          if (filesToAccept.length > 0 && !filesToAccept.includes(f.path)) continue;
          await fetch(`${backendUrl}/api/files/write`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: f.path, content: f.content }) });
          setFileContent(f.path, f.content);
          appliedCount++;
        }
      }
      if (pendingChanges.files_modified) {
        for (const f of pendingChanges.files_modified) {
          if (filesToAccept.length > 0 && !filesToAccept.includes(f.path)) continue;
          await fetch(`${backendUrl}/api/files/write`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: f.path, content: f.content }) });
          setFileContent(f.path, f.content);
          appliedCount++;
        }
      }
      if (pendingChanges.files_deleted) {
        for (const path of pendingChanges.files_deleted) {
          if (filesToAccept.length > 0 && !filesToAccept.includes(path)) continue;
          await fetch(`${backendUrl}/api/files/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) });
          appliedCount++;
        }
      }
      
      addChatMessage({ role: 'assistant', content: `✅ Applied ${appliedCount} changes successfully.` });
    } catch (e: any) {
      addChatMessage({ role: 'assistant', content: `❌ Failed to apply changes: ${e.message}` });
    }
    setPendingChanges(null);
    setShowDiff(false);
  };

  const handleAcceptAll = () => applyChanges();
  const handleRejectAll = () => { setPendingChanges(null); setShowDiff(false); };
  
  const handleAcceptFile = (path: string) => {
    applyChanges([path]);
    // Remove accepted from pending
    const newPending = { ...pendingChanges };
    if (newPending.files_created) newPending.files_created = newPending.files_created.filter((f:any) => f.path !== path);
    if (newPending.files_modified) newPending.files_modified = newPending.files_modified.filter((f:any) => f.path !== path);
    if (newPending.files_deleted) newPending.files_deleted = newPending.files_deleted.filter((p:string) => p !== path);
    setPendingChanges(newPending);
  };

  const handleRejectFile = (path: string) => {
    const newPending = { ...pendingChanges };
    if (newPending.files_created) newPending.files_created = newPending.files_created.filter((f:any) => f.path !== path);
    if (newPending.files_modified) newPending.files_modified = newPending.files_modified.filter((f:any) => f.path !== path);
    if (newPending.files_deleted) newPending.files_deleted = newPending.files_deleted.filter((p:string) => p !== path);
    setPendingChanges(newPending);
  };

  const hasRemainingChanges = pendingChanges && (
    (pendingChanges.files_created?.length > 0) || 
    (pendingChanges.files_modified?.length > 0) || 
    (pendingChanges.files_deleted?.length > 0)
  );

  return (
    <div className="flex flex-col h-full bg-[#252526] relative">
      {showDiff && pendingChanges && (
        <DiffViewModal 
          changes={getChangesArray()} 
          onAcceptAll={handleAcceptAll} onRejectAll={handleRejectAll} 
          onAcceptFile={handleAcceptFile} onRejectFile={handleRejectFile} 
          onClose={() => setShowDiff(false)} 
        />
      )}
      
      <div className="h-[35px] flex justify-between items-center px-4 border-b border-[#333333] shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#cccccc] tracking-wide uppercase">
          CHAT
        </div>
        <div className="flex items-center gap-3 text-xs">
          {aiStatus.state === 'ready' && <span className="flex items-center gap-1 text-[#4dff4d]" title={aiStatus.message}><CheckCircle2 size={12}/> Ready</span>}
          {aiStatus.state === 'warning' && <span className="flex items-center gap-1 text-yellow-500" title={aiStatus.message}><AlertCircle size={12}/> Warning</span>}
          {aiStatus.state === 'error' && <span className="flex items-center gap-1 text-red-500" title={aiStatus.message}><X size={12}/> Error</span>}
          
          <button onClick={checkAiHealth} className="text-[#858585] hover:text-white transition-colors" title="Retry AI Connection">
            <RefreshCw size={12} className={aiStatus.state === 'checking' ? 'animate-spin' : ''} />
          </button>
          <button onClick={clearChat} className="text-[#858585] hover:text-red-400 transition-colors" title="Clear Chat History">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      
      {(aiStatus.state === 'warning' || aiStatus.state === 'error') && (
        <div className="bg-[#4d1f1f] border-b border-red-900 p-3 text-xs text-red-200 flex flex-col gap-1 shrink-0">
          <strong className="text-white">AI System Issue</strong>
          <p>{aiStatus.message}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#858585] px-4">
            <div className="bg-[#333] p-4 rounded-full mb-4 text-blue-400"><Sparkles size={32} /></div>
            <h3 className="font-semibold text-white mb-2 text-lg">AI Assistant</h3>
            <p className="text-xs mb-6 max-w-[250px]">Ask questions, request code generation, or instruct the AI to refactor open files.</p>
            <div className="flex flex-col gap-2 w-full">
              {["Create a Next.js portfolio", "Add dark mode toggle", "Refactor this file to use hooks"].map((sug, i) => (
                <button key={i} onClick={() => sendMessage(sug)} className="bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[#cccccc] text-xs py-2 px-3 rounded text-left border border-[#3c3c3c] transition-colors">{sug}</button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] p-3 rounded-lg text-[13px] leading-relaxed ${msg.role === 'user' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-[#cccccc] border border-[#3c3c3c]'}`}>
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#858585]">
            <Loader2 className="animate-spin" size={14} /> Generating response...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {hasRemainingChanges && (
        <div className="p-3 bg-[#2d2d2d] border-t border-[#3c3c3c] flex flex-col gap-2 shrink-0 z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-400 flex items-center gap-1"><Code size={14} /> Pending Changes</span>
            <button onClick={() => setPendingChanges(null)} className="text-[#858585] hover:text-white"><X size={14} /></button>
          </div>
          <div className="text-[11px] text-[#858585] max-h-[80px] overflow-y-auto">
            {pendingChanges.files_created?.length > 0 && <div><span className="text-green-400">Creates:</span> {pendingChanges.files_created.map((f:any)=>f.path).join(', ')}</div>}
            {pendingChanges.files_modified?.length > 0 && <div><span className="text-yellow-500">Modifies:</span> {pendingChanges.files_modified.map((f:any)=>f.path).join(', ')}</div>}
            {pendingChanges.files_deleted?.length > 0 && <div><span className="text-red-400">Deletes:</span> {pendingChanges.files_deleted.join(', ')}</div>}
            {pendingChanges.commands?.length > 0 && <div><span className="text-blue-400">Run:</span> {pendingChanges.commands.join(' && ')}</div>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => setShowDiff(true)} className="flex-1 bg-[#444] hover:bg-[#555] text-white px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 transition-colors border border-[#555]">
              <Eye size={12} /> Review
            </button>
            <button onClick={() => handleAcceptAll()} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 transition-colors">
              <CheckCircle2 size={12} /> Accept
            </button>
          </div>
        </div>
      )}

      <div className="p-4 bg-[#252526] shrink-0 border-t border-[#333333]">
        <div className="relative">
          <textarea
            className="w-full bg-[#3c3c3c] text-[#cccccc] text-[13px] rounded border border-[#444] focus:border-blue-500 focus:outline-none p-3 pr-10 resize-none h-[80px] custom-scrollbar placeholder-[#858585]"
            placeholder="Ask AI or type '/' for commands..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button 
            onClick={() => sendMessage()} disabled={isLoading || !input.trim() || aiStatus.state === 'error'}
            className="absolute bottom-3 right-3 text-[#858585] hover:text-white disabled:opacity-30 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
