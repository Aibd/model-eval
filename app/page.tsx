'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { Menu, Bot, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { AppConfig } from '@/lib/types';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'comparison' | string>('comparison');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState<'A' | 'B' | null>(null);

  const [config, setConfig] = useState<AppConfig>({
    models: [],
    comparison: {
      modelAId: '',
      modelBId: ''
    }
  });
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsConfigLoading(true);
        setConfigError(null);
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to load config');
        }
        const data: AppConfig = await response.json();
        if (!Array.isArray(data.models)) data.models = [];
        if (!data.comparison) data.comparison = { modelAId: '', modelBId: '' };
        setConfig(data);
      } catch (e) {
        console.error('Failed to load config', e);
        const message = e instanceof Error ? e.message : '配置加载失败';
        setConfigError(message);
      } finally {
        setIsConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleModelSelect = (side: 'A' | 'B', modelId: string) => {
    const newConfig = { ...config };
    if (side === 'A') {
      newConfig.comparison.modelAId = modelId;
    } else {
      newConfig.comparison.modelBId = modelId;
    }
    setConfig(newConfig);
    setIsModelSelectorOpen(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isModelSelectorOpen && !(event.target as Element).closest('.model-selector')) {
        setIsModelSelectorOpen(null);
      }
    };

    if (isModelSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelSelectorOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        config={config}
        setConfig={setConfig}
        onSelectModel={(id) => setActiveView(id || 'comparison')}
        activeView={activeView}
      />

      <div className="flex flex-1 flex-col min-w-0 h-full relative">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {activeView === 'comparison' ? 'Model Arena' : config.models?.find(m => m.id === activeView)?.name || 'Chat'}
            </h1>
          </div>

          {/* Model Comparison Selector - Only show when in comparison view */}
          {activeView === 'comparison' && (
            <div className="flex-1 flex justify-center px-8">
              <div className="flex items-center gap-4">
                {/* Model A Selector */}
                <div className="relative model-selector">
                  <button
                    onClick={() => setIsModelSelectorOpen(isModelSelectorOpen === 'A' ? null : 'A')}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/60 hover:border-blue-300/60 transition-all duration-200 shadow-sm hover:shadow-md min-w-[160px] justify-center"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-100">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-blue-700 truncate">
                      {config.models?.find(m => m.id === config.comparison.modelAId)?.name || '选择模型A'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-blue-500" />
                  </button>

                  {/* Model A Dropdown */}
                  {isModelSelectorOpen === 'A' && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20 max-h-64 overflow-y-auto model-selector">
                      {config.models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect('A', model.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${
                            config.comparison.modelAId === model.id
                              ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                          }`}
                        >
                          <Bot className="h-4 w-4" />
                          <span className="truncate">{model.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* VS Icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-red-500 shadow-sm">
                  <Zap className="h-5 w-5 text-white" />
                </div>

                {/* Model B Selector */}
                <div className="relative model-selector">
                  <button
                    onClick={() => setIsModelSelectorOpen(isModelSelectorOpen === 'B' ? null : 'B')}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200/60 hover:border-purple-300/60 transition-all duration-200 shadow-sm hover:shadow-md min-w-[160px] justify-center"
                  >
                    <div className="p-1.5 rounded-lg bg-purple-100">
                      <Bot className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-semibold text-purple-700 truncate">
                      {config.models?.find(m => m.id === config.comparison.modelBId)?.name || '选择模型B'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-purple-500" />
                  </button>

                  {/* Model B Dropdown */}
                  {isModelSelectorOpen === 'B' && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20 max-h-64 overflow-y-auto model-selector">
                      {config.models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect('B', model.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${
                            config.comparison.modelBId === model.id
                              ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-500'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                          }`}
                        >
                          <Bot className="h-4 w-4" />
                          <span className="truncate">{model.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings button on the right */}
          <div></div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
          <ChatInterface config={config} setConfig={setConfig} activeView={activeView} />
        </main>
      </div>
    </div>
  );
}
