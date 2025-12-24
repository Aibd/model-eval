'use client';

import React, { useState } from 'react';
import { useChat } from 'ai/react';
import { AppConfig } from '@/lib/types';
import { AlertCircle, X, Maximize2, Minimize2, Bot, Copy } from 'lucide-react';
import { InputArea } from './InputArea';

interface CodeCompareInterfaceProps {
    config: AppConfig;
    setConfig: (config: AppConfig) => void;
}

type PanelMode = 'code' | 'preview';

export function CodeCompareInterface({ config }: CodeCompareInterfaceProps) {
    const [errorA, setErrorA] = useState<string | null>(null);
    const [errorB, setErrorB] = useState<string | null>(null);
    const [enableWebSearch, setEnableWebSearch] = useState(true);

    const [leftMode, setLeftMode] = useState<PanelMode>('code');
    const [rightMode, setRightMode] = useState<PanelMode>('code');
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
                const errorMessage = errorData.message || errorData.error || '请求失败，请检查 API 配置';
                setErrorA(errorMessage);
            } catch {
                setErrorA('请求失败，请检查 API 配置');
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
                const errorMessage = errorData.message || errorData.error || '请求失败，请检查 API 配置';
                setErrorB(errorMessage);
            } catch {
                setErrorB('请求失败，请检查 API 配置');
            }
        },
    });

    const handleSend = async (message: string, file?: File) => {
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
            <div className="h-full w-full overflow-auto bg-slate-900 text-slate-50 text-xs p-0.5 rounded-xl">
                <textarea
                    className="h-full w-full resize-none bg-slate-900 text-slate-50 text-xs p-4 rounded-lg font-mono outline-none border-0"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="在这里粘贴或编辑代码..."
                />
            </div>
        );
    };

    const renderPreview = (content: string | undefined) => {
        if (!content) {
            return (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    暂无预览内容
                </div>
            );
        }
        return (
            <iframe
                className="w-full h-full rounded-xl border border-slate-200 bg-white"
                srcDoc={content}
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
        codeContent: string | undefined,
        previewContent: string | undefined,
        isLoadingSide: boolean
    ) => {
        const currentCodeValue = side === 'A'
            ? (leftCode || normalizedContentA)
            : (rightCode || normalizedContentB);

        const panel = (
            <div className="flex flex-col h-full bg-slate-50">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shadow-sm border bg-white ${side === 'A' ? 'border-blue-100' : 'border-purple-100'}`}>
                            <Bot className={`h-4 w-4 ${side === 'A' ? 'text-blue-600' : 'text-purple-600'}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-600">
                                {side === 'A' ? '模型 A' : '模型 B'}
                            </span>
                            <span className="text-xs text-slate-500 truncate max-w-[180px]">
                                {modelName || '未选择模型'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-full bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => setMode('code')}
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                    mode === 'code'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500'
                                }`}
                            >
                                Code
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('preview')}
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                    mode === 'preview'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500'
                                }`}
                            >
                                Preview
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFullscreen(!fullscreen)}
                            className="p-1.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="全屏预览"
                        >
                            {fullscreen ? (
                                <Minimize2 className="h-4 w-4" />
                            ) : (
                                <Maximize2 className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
                <div className="flex-1 p-3">
                    <div className="h-full rounded-xl border border-slate-200 bg-slate-950/5 overflow-hidden relative">
                        {isLoadingSide && (
                            <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white">
                                生成中...
                            </div>
                        )}
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
                                className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-900/80 text-slate-100 hover:bg-slate-900 transition-colors"
                                title="Copy code"
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </button>
                        )}
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
                <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center">
                    <div className="w-full h-full max-w-6xl max-h-[90vh] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden relative">
                        <button
                            type="button"
                            onClick={() => setFullscreen(false)}
                            className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/40 text-slate-100 hover:bg-black/60 transition-colors"
                        >
                            <Minimize2 className="h-4 w-4" />
                        </button>
                        <div className="w-full h-full bg-slate-900 p-4">
                            {renderPreview(currentCodeValue)}
                        </div>
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
                        <p className="text-sm font-medium text-red-800">模型 A 错误</p>
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
                        <p className="text-sm font-medium text-red-800">模型 B 错误</p>
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
                        normalizedContentA || undefined,
                        normalizedContentA || undefined,
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
                        normalizedContentB || undefined,
                        normalizedContentB || undefined,
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

