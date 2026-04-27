'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'github'>('ai');
  const [aiSettings, setAiSettings] = useState({
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.1',
    apiKey: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('ai_settings');
    if (saved) setAiSettings(JSON.parse(saved));
  }, []);

  const saveSettings = () => {
    localStorage.setItem('ai_settings', JSON.stringify(aiSettings));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-panel)] w-[600px] rounded-lg shadow-xl border border-[var(--border-color)] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white"><X size={20} /></button>
        </div>
        
        <div className="flex h-[400px]">
          <div className="w-48 border-r border-[var(--border-color)] p-2 flex flex-col gap-1">
            <button 
              className={`text-left px-3 py-2 rounded text-sm ${activeTab === 'ai' ? 'bg-[var(--accent-glow)] text-[var(--accent-color)]' : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-panel-light)]'}`}
              onClick={() => setActiveTab('ai')}
            >
              AI Provider
            </button>
            <button 
              className={`text-left px-3 py-2 rounded text-sm ${activeTab === 'github' ? 'bg-[var(--accent-glow)] text-[var(--accent-color)]' : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-panel-light)]'}`}
              onClick={() => setActiveTab('github')}
            >
              GitHub Integration
            </button>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'ai' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-md font-medium text-white mb-2">AI Configuration</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">Settings are saved locally and sent securely to the local backend.</p>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-[var(--text-secondary)]">Provider</label>
                  <select 
                    className="bg-[var(--bg-app)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-white focus:border-[var(--accent-color)] outline-none"
                    value={aiSettings.provider}
                    onChange={(e) => setAiSettings({...aiSettings, provider: e.target.value})}
                  >
                    <option value="ollama">Local (Ollama)</option>
                    <option value="openai">OpenAI</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm text-[var(--text-secondary)]">Base URL (For Local/OpenRouter)</label>
                  <input 
                    type="text" 
                    value={aiSettings.baseUrl}
                    onChange={(e) => setAiSettings({...aiSettings, baseUrl: e.target.value})}
                    className="bg-[var(--bg-app)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-white focus:border-[var(--accent-color)] outline-none" 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm text-[var(--text-secondary)]">Model Name</label>
                  <input 
                    type="text" 
                    value={aiSettings.model}
                    onChange={(e) => setAiSettings({...aiSettings, model: e.target.value})}
                    className="bg-[var(--bg-app)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-white focus:border-[var(--accent-color)] outline-none" 
                  />
                </div>

                {aiSettings.provider !== 'ollama' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-[var(--text-secondary)]">API Key</label>
                    <input 
                      type="password" 
                      placeholder="sk-..." 
                      value={aiSettings.apiKey}
                      onChange={(e) => setAiSettings({...aiSettings, apiKey: e.target.value})}
                      className="bg-[var(--bg-app)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-white focus:border-[var(--accent-color)] outline-none" 
                    />
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'github' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-md font-medium text-white mb-2">GitHub Settings</h3>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-[var(--text-secondary)]">Personal Access Token</label>
                  <input type="password" placeholder="ghp_..." className="bg-[var(--bg-app)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-white focus:border-[var(--accent-color)] outline-none" />
                </div>
                <button className="bg-[var(--accent-color)] text-white px-4 py-2 rounded text-sm w-fit mt-2 hover:bg-[var(--accent-hover)]">Connect GitHub</button>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-panel-light)]">Cancel</button>
          <button onClick={saveSettings} className="bg-[var(--accent-color)] text-white px-4 py-2 rounded text-sm hover:bg-[var(--accent-hover)]">Save Settings</button>
        </div>
      </div>
    </div>
  );
}
