import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FileNode {
  name: string;
  kind: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AppState {
  files: FileNode[];
  activeFiles: string[];
  currentActiveFile: string | null;
  fileContents: Record<string, string>;
  chatMessages: Message[];
  
  setFiles: (files: FileNode[]) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setCurrentActiveFile: (path: string | null) => void;
  setFileContent: (path: string, content: string) => void;
  addChatMessage: (msg: Message) => void;
  clearChat: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      files: [],
      activeFiles: [],
      currentActiveFile: null,
      fileContents: {},
      chatMessages: [],

      setFiles: (files) => set({ files }),
      
      openFile: (path) => set((state) => {
        const isActive = state.activeFiles.includes(path);
        return {
          activeFiles: isActive ? state.activeFiles : [...state.activeFiles, path],
          currentActiveFile: path
        };
      }),

      closeFile: (path) => set((state) => {
        const newActiveFiles = state.activeFiles.filter(p => p !== path);
        let newCurrent = state.currentActiveFile;
        if (state.currentActiveFile === path) {
          newCurrent = newActiveFiles.length > 0 ? newActiveFiles[newActiveFiles.length - 1] : null;
        }
        return {
          activeFiles: newActiveFiles,
          currentActiveFile: newCurrent
        };
      }),

      setCurrentActiveFile: (path) => set({ currentActiveFile: path }),

      setFileContent: (path, content) => set((state) => ({
        fileContents: { ...state.fileContents, [path]: content }
      })),

      addChatMessage: (msg) => set((state) => ({
        chatMessages: [...state.chatMessages, msg]
      })),

      clearChat: () => set({ chatMessages: [] }),
    }),
    {
      name: 'codeforge-storage',
      partialize: (state) => ({ 
        chatMessages: state.chatMessages,
        activeFiles: state.activeFiles,
        currentActiveFile: state.currentActiveFile
      }),
    }
  )
);
