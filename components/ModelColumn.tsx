
import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, ChevronDown, Check } from 'lucide-react';
import { Message } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AppConfig } from '@/lib/types';

interface ModelColumnProps {
    modelName: string;
    messages: Message[];
    isLoading: boolean;
    color: 'blue' | 'purple';
    isComparison?: boolean;
    side?: 'A' | 'B';
    config?: AppConfig;
    setConfig?: (config: AppConfig) => void;
    modelId?: string; // Add modelId prop to display
    userMessages?: Message[]; // User messages for comparison view (displayed in center)
}

export function ModelColumn({ modelName, messages, isLoading, color, isComparison = false, side, config, setConfig, modelId, userMessages }: ModelColumnProps) {
    const isBlue = color === 'blue';
    const bgColor = isBlue ? 'bg-slate-50/50' : 'bg-slate-50/50'; // Keep background neutral
    const accentColor = isBlue ? 'text-blue-600' : 'text-purple-600';
    const bubbleColor = isBlue ? 'bg-blue-50 border-blue-100 text-slate-800' : 'bg-purple-50 border-purple-100 text-slate-800';
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const handleSelectModel = (modelId: string) => {
        if (!config || !setConfig) return;
        
        const newConfig = { ...config };
        if (side === 'A') {
            newConfig.comparison.modelAId = modelId;
        } else if (side === 'B') {
            newConfig.comparison.modelBId = modelId;
        }
        setConfig(newConfig);
        setIsDropdownOpen(false);
    };

    const currentModelId = side === 'A' ? config?.comparison.modelAId : config?.comparison.modelBId;
    const availableModels = config?.models || [];

    return (
        <div className={`flex flex-col h-full ${bgColor}`}>
            <div className="px-6 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${isBlue ? 'bg-blue-100/50' : 'bg-purple-100/50'}`}>
                        <Bot className={`h-5 w-5 ${accentColor}`} />
                    </div>
                    {isComparison && setConfig ? (
                        <div className="flex-1 min-w-0 relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 group hover:bg-slate-100/50 rounded-lg px-2 py-1 -ml-2 transition-colors w-full text-left"
                            >
                                <div className="flex-1 min-w-0">
                                    <h2 className="font-bold text-slate-800 text-sm truncate">{modelName}</h2>
                                    <p className="text-xs text-slate-500 font-medium">点击选择模型</p>
                                </div>
                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20 max-h-64 overflow-y-auto">
                                    {availableModels.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                            暂无可用模型
                                        </div>
                                    ) : (
                                        availableModels.map((model) => (
                                            <button
                                                key={model.id}
                                                onClick={() => handleSelectModel(model.id)}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                                                    currentModelId === model.id ? 'bg-blue-50/50' : ''
                                                }`}
                                            >
                                                <span className={`font-medium ${currentModelId === model.id ? 'text-blue-600' : 'text-slate-700'}`}>
                                                    {model.modelId}
                                                </span>
                                                {currentModelId === model.id && (
                                                    <Check className="h-4 w-4 text-blue-600" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h2 className="font-bold text-slate-800 text-sm">{modelName}</h2>
                            <p className="text-xs text-slate-500 font-medium font-mono">{modelId || 'N/A'}</p>
                        </div>
                    )}
                </div>
                <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
                {messages.length === 0 && !userMessages?.length && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in zoom-in duration-500">
                        <div className={`p-4 rounded-2xl mb-4 ${isBlue ? 'bg-blue-50' : 'bg-purple-50'}`}>
                            <Bot className={`h-12 w-12 ${isBlue ? 'text-blue-200' : 'text-purple-200'}`} />
                        </div>
                        <p className="font-medium">Ready to compare</p>
                    </div>
                )}

                {/* In comparison mode, only show assistant messages (user messages shown in center) */}
                {isComparison && userMessages ? (
                    // Show assistant messages aligned with user messages by index
                    userMessages.map((userMsg, index) => {
                        const assistantMsg = messages[index]; // Get corresponding assistant message by index
                        
                        return (
                            <div key={`response-${userMsg.id}`} className="space-y-4">
                                {/* Assistant response */}
                                {assistantMsg && assistantMsg.role === 'assistant' ? (
                                    <div className="flex gap-4 animate-in slide-in-from-bottom-2 duration-300">
                                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm border border-white bg-white`}>
                                            <Bot className={`h-6 w-6 ${accentColor}`} />
                                        </div>
                                        <div className={`max-w-[85%] rounded-2xl rounded-tl-none px-5 py-3.5 text-sm leading-relaxed shadow-sm bg-white border border-slate-100 text-slate-700`}>
                                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-img:rounded-lg prose-img:shadow-md">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {assistantMsg.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ) : index === userMessages.length - 1 && isLoading ? (
                                    // Show loading indicator for the last user message if loading
                                    <div className="flex gap-4 animate-pulse">
                                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white border border-slate-100 shadow-sm`}>
                                            <Bot className={`h-6 w-6 ${accentColor}`} />
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm">
                                            <div className="flex space-x-1.5 h-5 items-center">
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })
                ) : (
                    // Normal view: show all messages (user + assistant)
                    messages.map((m) => (
                        <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 duration-300`}>
                            <div
                                className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm border border-white ${m.role === 'user'
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-white'
                                    }`}
                            >
                                {m.role === 'user' ? <User className="h-5 w-5" /> : <Bot className={`h-6 w-6 ${accentColor}`} />}
                            </div>

                            <div
                                className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${m.role === 'user'
                                    ? 'bg-slate-800 text-white rounded-tr-none'
                                    : `bg-white border border-slate-100 text-slate-700 rounded-tl-none`
                                    }`}
                            >
                                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-img:rounded-lg prose-img:shadow-md">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex gap-4 animate-pulse">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white border border-slate-100 shadow-sm`}>
                            <Bot className={`h-6 w-6 ${accentColor}`} />
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm">
                            <div className="flex space-x-1.5 h-5 items-center">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
