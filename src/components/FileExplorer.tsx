'use client';

import { Folder, FileText, FileCode2, FileJson, Image as ImageIcon } from 'lucide-react';

export interface FileNode {
  name: string;
  kind: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

interface FileExplorerProps {
  files: FileNode[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

export default function FileExplorer({ files, activeFile, onSelectFile }: FileExplorerProps) {
  const getIcon = (name: string, kind: 'file' | 'directory') => {
    if (kind === 'directory') return <Folder size={14} className="text-blue-400" color="#60a5fa" />;
    if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js') || name.endsWith('.jsx')) {
      return <FileCode2 size={14} color="#fcd34d" />;
    }
    if (name.endsWith('.json')) return <FileJson size={14} color="#a7f3d0" />;
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.svg')) {
      return <ImageIcon size={14} color="#f472b6" />;
    }
    return <FileText size={14} color="#9ca3af" />;
  };

  const renderTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`file-item ${activeFile === node.path ? 'active' : ''}`}
          style={{ paddingLeft: `${level * 12 + 16}px` }}
          onClick={() => {
            if (node.kind === 'file') {
              onSelectFile(node.path);
            }
          }}
        >
          {getIcon(node.name, node.kind)}
          <span>{node.name}</span>
        </div>
        {node.kind === 'directory' && node.children && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="flex flex-col">
      {renderTree(files)}
    </div>
  );
}
