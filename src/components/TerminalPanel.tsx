'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

export default function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: { background: '#000000' },
      cursorBlink: true,
      fontFamily: 'monospace'
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    terminalInstance.current = term;

    // Connect to backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const socket = io(backendUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('terminal:spawn', 'default');
      term.write('\r\n\x1b[32m[Connected to local terminal]\x1b[0m\r\n');
    });

    socket.on('terminal:data', (data) => {
      term.write(data);
    });

    socket.on('disconnect', () => {
      term.write('\r\n\x1b[31m[Disconnected from local terminal]\x1b[0m\r\n');
    });

    term.onData((data) => {
      socket.emit('terminal:write', data);
    });

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      term.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)]">
      <div ref={terminalRef} className="terminal-container" />
    </div>
  );
}
