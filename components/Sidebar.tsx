import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Settings, ScrollText, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsModal } from './SettingsModal';
import { AppConfig } from '@/lib/types';

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
    config: AppConfig;
    setConfig: (config: AppConfig) => void;
    onSelectModel: (modelId: string | null) => void; // null for comparison view
    activeView: 'comparison' | string; // 'comparison' or modelId
}

export function Sidebar({ isOpen, toggleSidebar, config, setConfig, onSelectModel, activeView }: SidebarProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSaveConfig = (newConfig: AppConfig) => {
        setConfig(newConfig);
        setIsSettingsOpen(false);
        localStorage.setItem('modelConfig', JSON.stringify(newConfig));
    };

    // Load history from storage
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const loadHistory = () => {
            const sessions = JSON.parse(localStorage.getItem('chat_sessions') || '[]');
            setHistory(sessions);
        };

        loadHistory();

        const handleStorageChange = () => loadHistory();
        window.addEventListener('storage-sessions', handleStorageChange);

        return () => window.removeEventListener('storage-sessions', handleStorageChange);
    }, []);

    // Helper to format date
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <>
            <div
                className={cn(
                    'relative h-full bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out flex-shrink-0 border-r border-slate-800 overflow-hidden',
                    isOpen ? 'w-72' : 'w-0'
                )}
            >
                <div className="w-72 h-full flex flex-col">
                    <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/50">
                        <div className="flex items-center gap-2 text-white">
                            <ScrollText className="h-5 w-5 text-blue-400" />
                            <span className="font-bold tracking-wide">Arena Logs</span>
                        </div>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                            title="Model Settings"
                        >
                            <Settings className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <button
                            onClick={() => onSelectModel(null)}
                            className={cn(
                                "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all shadow-lg mb-6 group",
                                activeView === 'comparison'
                                    ? "bg-blue-600 text-white shadow-blue-900/20 hover:bg-blue-500"
                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                            )}
                        >
                            <Plus className={cn("h-5 w-5 transition-transform", activeView === 'comparison' && "group-hover:rotate-90")} />
                            New Comparison
                        </button>

                        <div className="space-y-6">
                            {/* Single Model Access */}
                            {config.models?.length > 0 && (
                                <div>
                                    <h3 className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                        Direct Access
                                    </h3>
                                    <div className="space-y-1">
                                        {config.models.map((model) => (
                                            <button
                                                key={model.id}
                                                onClick={() => onSelectModel(model.id)}
                                                className={cn(
                                                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all group",
                                                    activeView === model.id
                                                        ? "bg-slate-800 text-white"
                                                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                                                )}
                                            >
                                                <Bot className={cn(
                                                    "h-4 w-4 transition-colors",
                                                    activeView === model.id ? "text-blue-400" : "text-slate-600 group-hover:text-blue-400"
                                                )} />
                                                <span className="truncate font-medium">{model.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    Recent Matches
                                </h3>
                                <div className="space-y-1">
                                    {history.length === 0 && (
                                        <p className="px-3 text-xs text-slate-600 italic">No matches yet.</p>
                                    )}
                                    {history.map((item) => (
                                        <button
                                            key={item.id}
                                            // TODO: Implement loading history
                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all group"
                                        >
                                            <MessageSquare className="h-4 w-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="truncate font-medium">{item.title}</p>
                                                <p className="text-xs text-slate-600">{formatDate(item.createdAt)}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-800/50">
                        <div className="flex items-center gap-3 px-2 py-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 ring-2 ring-slate-800 flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">User Account</p>
                                <p className="text-xs text-slate-500 truncate">Pro Plan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveConfig}
                initialConfig={config}
            />
        </>
    );
}
