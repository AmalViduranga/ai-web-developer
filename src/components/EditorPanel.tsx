'use client';

import React, { useRef, useState } from 'react';
import Editor, { useMonaco, OnMount } from '@monaco-editor/react';
import { useStore } from '@/store/useStore';
import { Loader2 } from 'lucide-react';

interface EditorPanelProps {
  fileName: string;
  fileContent: string;
  onChange: (value: string | undefined) => void;
}

export default function EditorPanel({ fileName, fileContent, onChange }: EditorPanelProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const getLanguage = (path: string) => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    return 'plaintext';
  };

  const handleEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // AI Autocomplete on Ctrl+Space
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Space, async () => {
      const position = editor.getPosition();
      const model = editor.getModel();
      if (!position || !model) return;

      const fullText = model.getValue();
      const offset = model.getOffsetAt(position);
      const prefix = fullText.substring(0, offset);
      const suffix = fullText.substring(offset);

      setIsAiLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/ai/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix, suffix })
        });
        const data = await res.json();
        
        if (data.success && data.completion) {
          // Insert the completion
          editor.executeEdits("ai-autocomplete", [
            {
              range: new monacoInstance.Range(position.lineNumber, position.column, position.lineNumber, position.column),
              text: data.completion,
              forceMoveMarkers: true
            }
          ]);
        }
      } catch (err) {
        console.error("AI Completion error", err);
      } finally {
        setIsAiLoading(false);
      }
    });
  };

  return (
    <div className="h-full w-full relative bg-[#1e1e1e]">
      {isAiLoading && (
        <div className="absolute top-2 right-4 z-10 flex items-center gap-2 bg-[#252526] text-xs px-2 py-1 rounded text-blue-400 border border-[#3c3c3c]">
          <Loader2 size={12} className="animate-spin"/> AI Generating...
        </div>
      )}
      <Editor
        height="100%"
        language={getLanguage(fileName)}
        theme="vs-dark"
        value={fileContent}
        onChange={onChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: true },
          fontSize: 13,
          fontFamily: "'Fira Code', 'Consolas', monospace",
          wordWrap: 'on',
          formatOnPaste: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          padding: { top: 16 },
          inlineSuggest: { enabled: true }
        }}
      />
    </div>
  );
}
