'use client';

import { useState, useEffect } from 'react';
import TerminalPanel from './TerminalPanel';
import EditorPanel from './EditorPanel';
import FileExplorer, { FileNode } from './FileExplorer';
import AIChatPanel from './AIChatPanel';
import SettingsModal from './SettingsModal';
import { io, Socket } from 'socket.io-client';
import { useStore } from '@/store/useStore';
import { 
  Settings, Loader2, X, Code, Play, Square,
  TerminalSquare, FileCode2, Sparkles, AlertTriangle, Trash2, GitBranch, RefreshCw, PanelRightClose, PanelRightOpen,
  Search, Blocks, LayoutPanelTop, ChevronDown, ChevronRight
} from 'lucide-react';

const getApiBase = () => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function IDE() {
  const { 
    files, setFiles, 
    activeFiles, openFile, closeFile, currentActiveFile, setCurrentActiveFile,
    fileContents, setFileContent 
  } = useStore();

  const [isBooting, setIsBooting] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Layout states
  const [activeLeftPanel, setActiveLeftPanel] = useState<'explorer' | 'search' | 'git' | 'extensions'>('explorer');
  const [activeBottomPanel, setActiveBottomPanel] = useState<'terminal' | 'problems' | 'output' | 'git'>('terminal');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gitStatus, setGitStatus] = useState<any>(null);

  const initBackend = async () => {
    setIsBooting(true);
    try {
      const healthRes = await fetch(`${getApiBase()}/api/health`).catch(() => null);
      if (!healthRes || !healthRes.ok) {
        setBackendOnline(false);
        setIsBooting(false);
        return;
      }
      setBackendOnline(true);
      
      const sock = io(getApiBase(), { reconnectionAttempts: 5, reconnectionDelay: 1000 });
      setSocket(sock);
      sock.on('fs:change', () => { updateFileList(); updateGitStatus(); });

      await updateFileList();
      await updateGitStatus();
    } catch (err) {
      setBackendOnline(false);
    } finally {
      setIsBooting(false);
    }
  };

  useEffect(() => {
    initBackend();
    
    const handleRunDev = (e: any) => {
      const cmd = e.detail;
      if (socket) {
        setShowBottomPanel(true);
        setActiveBottomPanel('terminal');
        socket.emit('terminal:write', `\x03\r\n${cmd}\r\n`);
      }
    };
    window.addEventListener('run-dev-server', handleRunDev);
    
    return () => { 
      if (socket) socket.disconnect(); 
      window.removeEventListener('run-dev-server', handleRunDev);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const safeFetch = async (url: string, options?: any) => {
    if (!backendOnline) return { error: 'Backend offline' };
    try {
      const res = await fetch(url, options);
      return await res.json();
    } catch (e) { return { error: 'Failed to fetch' }; }
  };

  const updateFileList = async () => {
    const data = await safeFetch(`${getApiBase()}/api/files/tree`);
    if (data && !data.error && Array.isArray(data)) setFiles(data);
  };

  const updateGitStatus = async () => {
    const data = await safeFetch(`${getApiBase()}/api/git/status`);
    if (data && !data.error) setGitStatus(data);
  };

  const handleSelectFile = async (path: string) => {
    if (!fileContents[path]) {
      const data = await safeFetch(`${getApiBase()}/api/files/read`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path })
      });
      if (data && !data.error) setFileContent(path, data.content);
    }
    openFile(path);
  };

  const handleEditorChange = async (value: string | undefined) => {
    if (currentActiveFile && value !== undefined) {
      setFileContent(currentActiveFile, value);
      await safeFetch(`${getApiBase()}/api/files/write`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: currentActiveFile, content: value })
      });
    }
  };

  if (isBooting) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-white flex-col gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <h2 className="text-xl font-semibold text-gray-300">Connecting to local backend...</h2>
      </div>
    );
  }

  if (!backendOnline) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-white flex-col gap-4">
        <AlertTriangle size={48} className="text-red-500" />
        <h2 className="text-xl font-semibold">Backend server is not running</h2>
        <p className="text-gray-400">Start the backend server with <code className="text-blue-400">npm run dev</code></p>
        <button onClick={initBackend} className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white flex items-center gap-2">
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1e1e1e] text-[#cccccc] font-sans text-[13px] select-none">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      
      {/* 1. TOP HEADER / MENU BAR */}
      <header className="h-[35px] bg-[#333333] flex items-center justify-between px-3 shrink-0 border-b border-[#252526]">
        <div className="flex items-center gap-4 h-full">
          <div className="flex items-center gap-2 font-semibold tracking-wide text-white">
            <LayoutPanelTop size={16} className="text-blue-400"/> CodeForge
          </div>
          <nav className="flex items-center h-full text-[#cccccc]">
            {['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help'].map(item => (
              <div key={item} className="px-2 cursor-pointer hover:bg-[#505050] hover:text-white h-full flex items-center rounded-sm transition-colors text-xs">{item}</div>
            ))}
          </nav>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="bg-[#444444] hover:bg-[#505050] px-4 py-1 rounded-md text-xs border border-[#555] flex items-center gap-2 min-w-[300px] justify-center cursor-pointer">
            <Search size={12} className="text-gray-400"/> workspace - CodeForge AI IDE
          </div>
        </div>

        <div className="flex items-center gap-2 h-full">
          <button className="flex items-center gap-1 hover:bg-[#505050] px-2 py-1 rounded text-xs" onClick={() => { if(socket) socket.emit('terminal:write', 'npm run dev\r\n'); setShowBottomPanel(true); setActiveBottomPanel('terminal'); }}>
            <Play size={12} className="text-green-400"/> Run
          </button>
          <button className="flex items-center gap-1 hover:bg-[#505050] px-2 py-1 rounded text-xs" onClick={() => { if(socket) socket.emit('terminal:write', '\x03\r\n'); }}>
            <Square size={12} className="text-red-400"/> Stop
          </button>
          <div className="w-[1px] h-4 bg-[#555] mx-1"></div>
          <button className="hover:bg-[#505050] p-1.5 rounded transition-colors text-gray-400 hover:text-white" title="Toggle Right Panel (AI)" onClick={() => setShowRightPanel(!showRightPanel)}>
            {showRightPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 2. LEFT ACTIVITY BAR */}
        <div className="w-[48px] bg-[#333333] flex flex-col items-center py-2 gap-4 shrink-0 border-r border-[#252526]">
          <div className={`cursor-pointer p-2 rounded transition-colors ${activeLeftPanel === 'explorer' ? 'text-white border-l-2 border-l-blue-500' : 'text-[#858585] hover:text-white border-l-2 border-l-transparent'}`} onClick={() => setActiveLeftPanel('explorer')} title="Explorer"><FileCode2 size={24} strokeWidth={1.5} /></div>
          <div className={`cursor-pointer p-2 rounded transition-colors ${activeLeftPanel === 'search' ? 'text-white border-l-2 border-l-blue-500' : 'text-[#858585] hover:text-white border-l-2 border-l-transparent'}`} onClick={() => setActiveLeftPanel('search')} title="Search"><Search size={24} strokeWidth={1.5} /></div>
          <div className={`cursor-pointer p-2 rounded transition-colors ${activeLeftPanel === 'git' ? 'text-white border-l-2 border-l-blue-500' : 'text-[#858585] hover:text-white border-l-2 border-l-transparent'}`} onClick={() => setActiveLeftPanel('git')} title="Source Control"><GitBranch size={24} strokeWidth={1.5} /></div>
          <div className={`cursor-pointer p-2 rounded transition-colors ${activeLeftPanel === 'extensions' ? 'text-white border-l-2 border-l-blue-500' : 'text-[#858585] hover:text-white border-l-2 border-l-transparent'}`} onClick={() => setActiveLeftPanel('extensions')} title="Extensions"><Blocks size={24} strokeWidth={1.5} /></div>
          
          <div className="mt-auto flex flex-col gap-2">
            <div className="cursor-pointer p-2 text-[#858585] hover:text-white transition-colors" title="Settings" onClick={() => setShowSettings(true)}><Settings size={24} strokeWidth={1.5} /></div>
          </div>
        </div>

        {/* 3. LEFT SIDEBAR (EXPLORER/GIT) */}
        <aside className="w-[250px] bg-[#252526] flex flex-col shrink-0 border-r border-[#1e1e1e]">
          {activeLeftPanel === 'explorer' && (
            <div className="flex flex-col h-full">
              <div className="px-5 py-2 text-xs font-semibold text-[#cccccc] tracking-wide flex items-center justify-between uppercase">
                Explorer
              </div>
              <div className="flex-1 overflow-y-auto">
                <FileExplorer files={files} activeFile={currentActiveFile} onSelectFile={handleSelectFile} />
              </div>
            </div>
          )}
          {activeLeftPanel === 'git' && (
            <div className="flex flex-col h-full">
              <div className="px-5 py-2 text-xs font-semibold text-[#cccccc] tracking-wide uppercase">Source Control</div>
              <div className="p-4 text-xs text-[#cccccc]">
                {gitStatus?.isRepo ? (
                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-white">Branch: {gitStatus.branch || 'main'}</p>
                    {gitStatus.changedFiles?.length > 0 && (
                      <div>
                        <p className="text-yellow-500 mt-2 font-medium">Changes ({gitStatus.changedFiles.length})</p>
                        {gitStatus.changedFiles.map((f: string) => <div key={f} className="truncate mt-1 text-[#cccccc] hover:text-white cursor-pointer">{f}</div>)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p>No Git repository found.</p>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded w-full transition-colors" onClick={async () => {
                      await safeFetch(`${getApiBase()}/api/git/init`, { method: 'POST' });
                      updateGitStatus();
                    }}>Initialize Repository</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* 4. CENTER EDITOR AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] relative">
          
          {/* File Tabs */}
          <div className="flex bg-[#2d2d2d] overflow-x-auto custom-scrollbar shrink-0 h-[35px]">
            {activeFiles.length === 0 ? (
               <div className="h-full w-full bg-[#1e1e1e]"></div>
            ) : (
              activeFiles.map((path) => (
                <div 
                  key={path} 
                  onClick={() => setCurrentActiveFile(path)}
                  className={`flex items-center gap-2 px-3 h-full text-[13px] border-r border-[#1e1e1e] cursor-pointer group min-w-[120px] max-w-[200px] transition-colors
                    ${currentActiveFile === path ? 'bg-[#1e1e1e] text-blue-400 border-t border-t-blue-500' : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#1e1e1e] border-t border-t-transparent'}`}
                >
                  <FileCode2 size={14} className={currentActiveFile === path ? "text-blue-400" : "text-[#858585]"} />
                  <span className="truncate flex-1 font-medium">{path.split('/').pop()}</span>
                  <button className={`p-0.5 rounded hover:bg-[#444] transition-opacity ${currentActiveFile === path ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={(e) => { e.stopPropagation(); closeFile(path); }}>
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Editor Container */}
          <div className="flex-1 relative min-h-0">
            {currentActiveFile ? (
              <EditorPanel fileName={currentActiveFile} fileContent={fileContents[currentActiveFile] || ''} onChange={handleEditorChange} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#cccccc]">
                <div className="mb-4 opacity-50"><LayoutPanelTop size={64} /></div>
                <h2 className="text-2xl font-bold mb-2">CodeForge AI IDE</h2>
                <div className="grid grid-cols-2 gap-4 mt-4 w-[400px]">
                  <div className="text-right pr-4 border-r border-[#444]">Show All Commands</div><div className="font-mono text-xs text-gray-400 flex items-center">Ctrl+Shift+P</div>
                  <div className="text-right pr-4 border-r border-[#444]">Go to File</div><div className="font-mono text-xs text-gray-400 flex items-center">Ctrl+P</div>
                  <div className="text-right pr-4 border-r border-[#444]">Ask AI Assistant</div><div className="font-mono text-xs text-gray-400 flex items-center">Ctrl+L</div>
                  <div className="text-right pr-4 border-r border-[#444]">Toggle Terminal</div><div className="font-mono text-xs text-gray-400 flex items-center">Ctrl+`</div>
                </div>
              </div>
            )}
          </div>
          
          {/* 6. BOTTOM PANEL (Terminal/Output) */}
          {showBottomPanel && (
            <div className="h-[250px] border-t border-[#333333] flex flex-col shrink-0 bg-[#1e1e1e]">
              <div className="flex items-center justify-between px-4 h-[35px] border-b border-[#333333]">
                <div className="flex gap-4 h-full">
                  {['PROBLEMS', 'OUTPUT', 'DEBUG CONSOLE', 'TERMINAL', 'PORTS'].map(tab => (
                    <div 
                      key={tab} 
                      onClick={() => setActiveBottomPanel(tab.toLowerCase() as any)}
                      className={`text-[11px] font-medium tracking-wide flex items-center h-full cursor-pointer border-b-2
                        ${activeBottomPanel === tab.toLowerCase() ? 'text-[#e7e7e7] border-b-blue-500' : 'text-[#858585] border-b-transparent hover:text-[#cccccc]'}`}
                    >
                      {tab}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <button className="text-[#858585] hover:text-white transition-colors" onClick={() => { if(socket) socket.emit('terminal:write', '\x03\r\nclear\r\n'); }} title="Kill process & Clear">
                    <Trash2 size={14} />
                  </button>
                  <button className="text-[#858585] hover:text-white transition-colors" onClick={() => setShowBottomPanel(false)} title="Close Panel">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-[#1e1e1e] p-2 overflow-hidden">
                {activeBottomPanel === 'terminal' && backendOnline && <TerminalPanel />}
                {activeBottomPanel !== 'terminal' && <div className="p-4 text-gray-500">No output available.</div>}
              </div>
            </div>
          )}
        </div>

        {/* 5. RIGHT AI ASSISTANT PANEL */}
        {showRightPanel && (
          <aside className="w-[320px] bg-[#252526] shrink-0 border-l border-[#333333] shadow-[-4px_0_15px_rgba(0,0,0,0.1)] z-10 flex flex-col">
            <AIChatPanel />
          </aside>
        )}
      </div>

      {/* 8. STATUS BAR */}
      <footer className="h-[22px] bg-[#007acc] text-white text-[11px] flex items-center justify-between px-3 shrink-0 select-none">
        <div className="flex items-center gap-4 h-full">
          <div className="flex items-center gap-1 hover:bg-[#1f8ad2] px-2 h-full cursor-pointer transition-colors">
            <GitBranch size={12}/> {gitStatus?.branch || 'main'}*
          </div>
          <div className="flex items-center gap-1 hover:bg-[#1f8ad2] px-2 h-full cursor-pointer transition-colors">
            <RefreshCw size={12}/> 0 <AlertTriangle size={12} className="ml-1"/> 0
          </div>
          <div className="flex items-center gap-1 hover:bg-[#1f8ad2] px-2 h-full cursor-pointer transition-colors">
            CodeForge Workspace
          </div>
        </div>
        <div className="flex items-center gap-4 h-full">
          <div className="flex items-center gap-1 hover:bg-[#1f8ad2] px-2 h-full cursor-pointer transition-colors">
            Ln 1, Col 1
          </div>
          <div className="flex items-center gap-1 hover:bg-[#1f8ad2] px-2 h-full cursor-pointer transition-colors">
            UTF-8
          </div>
          <div className="flex items-center gap-1 hover:bg-[#1f8ad2] px-2 h-full cursor-pointer transition-colors">
            TypeScript React
          </div>
          <div className="flex items-center gap-1 hover:bg-[#1f8ad2] px-2 h-full cursor-pointer transition-colors">
            <span className="flex items-center gap-1 font-medium"><div className="w-2 h-2 rounded-full bg-[#4dff4d] shadow-[0_0_5px_#4dff4d]"></div> Localhost</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
