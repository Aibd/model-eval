'use client';

import React, { useState } from 'react';
import { useChat } from 'ai/react';
import { AppConfig } from '@/lib/types';
import { AlertCircle, X, Maximize2, Minimize2, Bot, Copy, Eye, Code } from 'lucide-react';
import { InputArea } from './InputArea';

interface CodeCompareInterfaceProps {
    config: AppConfig;
    setConfig: (config: AppConfig) => void;
    leftMode: PanelMode;
    setLeftMode: (mode: PanelMode) => void;
    rightMode: PanelMode;
    setRightMode: (mode: PanelMode) => void;
}

type PanelMode = 'code' | 'preview';

export function CodeCompareInterface({ 
    config, 
    leftMode, 
    setLeftMode, 
    rightMode, 
    setRightMode 
}: CodeCompareInterfaceProps) {
    const [errorA, setErrorA] = useState<string | null>(null);
    const [errorB, setErrorB] = useState<string | null>(null);
    const [enableWebSearch, setEnableWebSearch] = useState(true);

    const [leftFullscreen, setLeftFullscreen] = useState(false);
    const [rightFullscreen, setRightFullscreen] = useState(false);
    const [leftCode, setLeftCode] = useState('');
    const [rightCode, setRightCode] = useState('');

    const getModel = (id: string) => config.models.find(m => m.id === id);

    const modelAConfig = getModel(config.comparison.modelAId);
    const modelBConfig = getModel(config.comparison.modelBId);

    const {
        messages: messagesA,
        isLoading: isLoadingA,
        append: appendA,
    } = useChat({
        api: '/api/chat',
        body: {
            modelConfig: modelAConfig,
            enableWebSearch: enableWebSearch,
        },
        id: `code-chat-${modelAConfig?.id || 'a'}`,
        onFinish: () => {
            setErrorA(null);
            setLeftMode((prev) => (prev === 'code' ? 'preview' : prev));
        },
        onError: async (err) => {
            try {
                const errorData = await err.response?.json?.() || {};
                const errorMessage = errorData.message || errorData.error || 'Request failed, please check API configuration';
                setErrorA(errorMessage);
            } catch {
                setErrorA('Request failed, please check API configuration');
            }
        },
    });

    const {
        messages: messagesB,
        isLoading: isLoadingB,
        append: appendB,
    } = useChat({
        api: '/api/chat',
        body: {
            modelConfig: modelBConfig,
            enableWebSearch: enableWebSearch,
        },
        id: `code-chat-${modelBConfig?.id || 'b'}`,
        onFinish: () => {
            setErrorB(null);
            setRightMode((prev) => (prev === 'code' ? 'preview' : prev));
        },
        onError: async (err) => {
            try {
                const errorData = await err.response?.json?.() || {};
                const errorMessage = errorData.message || errorData.error || 'Request failed, please check API configuration';
                setErrorB(errorMessage);
            } catch {
                setErrorB('Request failed, please check API configuration');
            }
        },
    });

    const handleSend = async (message: string, file?: File) => {
        // Clear existing edited code when sending a new request
        setLeftCode('');
        setRightCode('');
        
        const contextMessage = file
            ? `${message}\n\n[Attached File: ${file.name}]`
            : message;

        const msg = { role: 'user' as const, content: contextMessage };
        await Promise.all([
            appendA(msg),
            appendB(msg),
        ]);
    };

    const assistantMessagesA = messagesA.filter(m => m.role === 'assistant');
    const assistantMessagesB = messagesB.filter(m => m.role === 'assistant');

    const lastAssistantA = assistantMessagesA[assistantMessagesA.length - 1];
    const lastAssistantB = assistantMessagesB[assistantMessagesB.length - 1];

    const normalizeCodeContent = (content: string | undefined) => {
        if (!content) return '';
        const lines = content.split('\n');
        const filtered = lines.filter(line => {
            const trimmed = line.trim();
            return !trimmed.startsWith('```');
        });
        return filtered.join('\n').trim();
    };

    const normalizedContentA = normalizeCodeContent(lastAssistantA?.content as string | undefined);
    const normalizedContentB = normalizeCodeContent(lastAssistantB?.content as string | undefined);

    const isLoading = isLoadingA || isLoadingB;

    const renderCode = (value: string, onChange: (v: string) => void) => {
        return (
            <div className="h-full w-full bg-slate-900 text-slate-50 text-xs rounded-xl overflow-hidden">
                <textarea
                    className="h-full w-full resize-none bg-slate-900 text-slate-50 text-xs p-4 font-mono outline-none border-0"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Paste or edit code here..."
                />
            </div>
        );
    };

    const renderPreview = (content: string | undefined) => {
        if (!content) {
            return (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    No preview content available
                </div>
            );
        }

        const isSvg = content.trim().startsWith('<svg') || content.trim().startsWith('<?xml');
        
        const wrappedContent = isSvg ? `
            <html>
                <head>
                    <style>
                        body { 
                            margin: 0; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100vh; 
                            width: 100vw; 
                            overflow: hidden;
                            background-color: transparent;
                        }
                        svg { 
                            max-width: 100%; 
                            max-height: 100%; 
                            width: auto; 
                            height: auto; 
                        }
                    </style>
                </head>
                <body>${content}</body>
            </html>
        ` : content;

        return (
            <iframe
                className="w-full h-full rounded-xl border border-slate-200 bg-white"
                srcDoc={wrappedContent}
                sandbox="allow-scripts allow-same-origin"
            />
        );
    };

    const renderPanel = (
        side: 'A' | 'B',
        modelName: string | undefined,
        mode: PanelMode,
        setMode: (m: PanelMode) => void,
        fullscreen: boolean,
        setFullscreen: (v: boolean) => void,
        isLoadingSide: boolean
    ) => {
        const currentCodeValue = side === 'A'
            ? (leftCode || normalizedContentA)
            : (rightCode || normalizedContentB);

        const panel = (
            <div className="flex flex-col h-full bg-slate-50 group/panel">
                <div className="flex-1 p-3">
                    <div className="h-full rounded-xl border border-slate-200 bg-slate-950/5 overflow-hidden relative group/content">
                        {isLoadingSide && (
                            <div className="absolute top-3 left-3 z-20 text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white">
                                Generating...
                            </div>
                        )}
                        
                        {/* Hover Overlay Controls */}
                        <div className="absolute top-0 left-0 right-0 p-3 flex items-start justify-end z-10 opacity-0 group-hover/panel:opacity-100 transition-all duration-200 pointer-events-none">
                            <div className="flex items-center gap-1.5 pointer-events-auto">
                                <div className="flex items-center gap-1 p-1 rounded-lg bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg mr-1">
                                    <button
                                        type="button"
                                        onClick={() => setMode('code')}
                                        className={`p-1.5 rounded-md transition-all ${
                                            mode === 'code' 
                                                ? 'bg-blue-50 text-blue-600' 
                                                : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                        title="Code Mode"
                                    >
                                        <Code className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode('preview')}
                                        className={`p-1.5 rounded-md transition-all ${
                                            mode === 'preview' 
                                                ? 'bg-blue-50 text-blue-600' 
                                                : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                        title="Preview Mode"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {mode === 'code' && currentCodeValue && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(currentCodeValue);
                                            } catch (e) {
                                                console.error('Copy failed', e);
                                            }
                                        }}
                                        className="p-2 rounded-lg bg-white/95 backdrop-blur-md border border-slate-200 text-slate-600 hover:bg-white hover:text-blue-600 transition-all shadow-lg hover:scale-105 active:scale-95"
                                        title="Copy code"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setFullscreen(!fullscreen)}
                                    className="p-2 rounded-lg bg-white/95 backdrop-blur-md border border-slate-200 text-slate-600 hover:bg-white hover:text-blue-600 transition-all shadow-lg hover:scale-105 active:scale-95"
                                    title="Fullscreen Preview"
                                >
                                    {fullscreen ? (
                                        <Minimize2 className="h-4 w-4" />
                                    ) : (
                                        <Maximize2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="h-full">
                            {mode === 'code'
                                ? renderCode(
                                    currentCodeValue,
                                    side === 'A' ? setLeftCode : setRightCode
                                )
                                : renderPreview(currentCodeValue)}
                        </div>
                    </div>
                </div>
            </div>
        );

        if (!fullscreen) {
            return panel;
        }

        return (
            <>
                {panel}
                <div className="fixed inset-0 z-[100] bg-white group/fullscreen">
                    <button
                        type="button"
                        onClick={() => setFullscreen(false)}
                        className="absolute top-4 right-4 z-[110] p-2.5 rounded-full bg-slate-900/10 hover:bg-slate-900/20 text-slate-600 hover:text-slate-900 transition-all opacity-0 group-hover/fullscreen:opacity-100 backdrop-blur-sm border border-white/20"
                        title="Exit Fullscreen"
                    >
                        <Minimize2 className="h-5 w-5" />
                    </button>
                    <div className="w-full h-full">
                        {renderPreview(currentCodeValue)}
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {errorA && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800">
                            {modelAConfig?.modelId || 'Model A'} Error
                        </p>
                        <p className="text-xs text-red-600 mt-1">{errorA}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setErrorA(null)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
            {errorB && (
                <div className="mx-6 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800">
                            {modelBConfig?.modelId || 'Model B'} Error
                        </p>
                        <p className="text-xs text-red-600 mt-1">{errorB}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setErrorB(null)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="flex-1 flex overflow-y-auto pb-32 mt-2">
                <div className="flex-1 min-w-0 flex flex-col border-r border-slate-200">
                    {renderPanel(
                        'A',
                        modelAConfig?.modelId,
                        leftMode,
                        setLeftMode,
                        leftFullscreen,
                        setLeftFullscreen,
                        isLoadingA
                    )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                    {renderPanel(
                        'B',
                        modelBConfig?.modelId,
                        rightMode,
                        setRightMode,
                        rightFullscreen,
                        setRightFullscreen,
                        isLoadingB
                    )}
                </div>
            </div>

            <InputArea
                onSend={handleSend}
                isLoading={isLoading}
                enableWebSearch={enableWebSearch}
                onWebSearchToggle={setEnableWebSearch}
            />
        </div>
    );
}

