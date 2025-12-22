import React, { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import { ModelColumn } from './ModelColumn';
import { InputArea } from './InputArea';
import { AppConfig, ModelConfig } from '@/lib/types';
import { AlertCircle, X, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
    config: AppConfig;
    setConfig: (config: AppConfig) => void;
    activeView: 'comparison' | string;
}

export function ChatInterface({ config, setConfig, activeView }: ChatInterfaceProps) {
    const [errorA, setErrorA] = useState<string | null>(null);
    const [errorB, setErrorB] = useState<string | null>(null);
    const [enableWebSearch, setEnableWebSearch] = useState(true); // Default to enabled


    // Helper to get model config by ID
    const getModel = (id: string) => config.models.find(m => m.id === id);

    // Determine active models based on view
    const modelAConfig = activeView === 'comparison'
        ? getModel(config.comparison.modelAId)
        : getModel(activeView);

    const modelBConfig = activeView === 'comparison'
        ? getModel(config.comparison.modelBId)
        : null;

    // Model A Hook (Always used, either for Left side or Single view)
    const {
        messages: messagesA,
        input: inputA,
        handleInputChange: handleInputChangeA,
        handleSubmit: handleSubmitA,
        isLoading: isLoadingA,
        append: appendA,
        setMessages: setMessagesA,
    } = useChat({
        api: '/api/chat',
        body: {
            modelConfig: modelAConfig,
            enableWebSearch: enableWebSearch
        },
        id: `chat-${modelAConfig?.id || 'a'}`,
        onFinish: () => { setErrorA(null); },
        onError: async (err) => {
            console.error("Model A Error:", err);
            try {
                const errorData = await err.response?.json?.() || {};
                const errorMessage = errorData.message || errorData.error || '请求失败，请检查 API 配置';
                setErrorA(errorMessage);
            } catch {
                setErrorA('请求失败，请检查 API 配置');
            }
        },
    });

    // Model B Hook (Only used in comparison mode)
    const {
        messages: messagesB,
        input: inputB,
        handleInputChange: handleInputChangeB,
        handleSubmit: handleSubmitB,
        isLoading: isLoadingB,
        append: appendB,
        setMessages: setMessagesB,
    } = useChat({
        api: '/api/chat',
        body: {
            modelConfig: modelBConfig,
            enableWebSearch: enableWebSearch
        },
        id: `chat-${modelBConfig?.id || 'b'}`,
        onFinish: () => { setErrorB(null); },
        onError: async (err) => {
            console.error("Model B Error:", err);
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

        if (activeView === 'comparison') {
            await Promise.all([
                appendA(msg),
                appendB(msg)
            ]);
        } else {
            await appendA(msg);
        }
    };

    const isLoading = isLoadingA || isLoadingB;

    if (!modelAConfig && activeView !== 'comparison') {
        return <div className="flex items-center justify-center h-full text-slate-500">Model not found</div>;
    }

    // Extract user messages for comparison view (they should only appear once in the center)
    const userMessages = activeView === 'comparison' 
        ? messagesA.filter(m => m.role === 'user')
        : [];
    
    // Filter out user messages from model columns in comparison mode
    const assistantMessagesA = activeView === 'comparison'
        ? messagesA.filter(m => m.role === 'assistant')
        : messagesA;
    
    const assistantMessagesB = activeView === 'comparison'
        ? messagesB.filter(m => m.role === 'assistant')
        : messagesB;


    const content = activeView === 'comparison' ? (
        <>
            {/* Comparison View: Single scrollable interface with user messages in center, model responses below */}
            <div className="flex-1 overflow-y-auto pb-32">
            {errorA && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800">模型 A 错误</p>
                        <p className="text-xs text-red-600 mt-1">{errorA}</p>
                    </div>
                    <button
                        onClick={() => setErrorA(null)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
            {errorB && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800">模型 B 错误</p>
                        <p className="text-xs text-red-600 mt-1">{errorB}</p>
                    </div>
                    <button
                        onClick={() => setErrorB(null)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    </div>
                )}
                
                <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                    {userMessages.length === 0 && messagesA.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                            <div className="p-4 rounded-2xl mb-4 bg-blue-50">
                                <Bot className="h-12 w-12 text-blue-200" />
                            </div>
                            <p className="font-medium">Ready to compare</p>
                        </div>
                    )}

                    {/* Render conversation pairs: User message + Model responses */}
                    {userMessages.map((userMsg, index) => {
                        const assistantMsgA = assistantMessagesA[index];
                        const assistantMsgB = assistantMessagesB[index];
                        const isLastPair = index === userMessages.length - 1;
                        
                        return (
                            <div key={userMsg.id} className="space-y-6">
                                {/* User Message - Right Aligned, No Icon */}
                                <div className="flex justify-end">
                                    <div className="max-w-2xl w-full animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="bg-slate-800 text-white rounded-2xl rounded-tr-none px-5 py-3.5 text-sm leading-relaxed shadow-sm">
                                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-img:rounded-lg">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {userMsg.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Model Responses - Side by Side */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Model A Response */}
                                    <div className="space-y-4">
                                        {assistantMsgA ? (
                                            <div className="flex gap-4 animate-in slide-in-from-bottom-2 duration-300">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm border border-white bg-white">
                                                    <Bot className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="mb-1.5">
                                                        <span className="text-xs font-semibold text-blue-600">{modelAConfig?.name || 'Model A'}</span>
                                                    </div>
                                                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-5 py-3.5 text-sm leading-relaxed shadow-sm text-slate-700">
                                                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-img:rounded-lg prose-img:shadow-md">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {assistantMsgA.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : isLastPair && isLoadingA ? (
                                            <div className="flex gap-4 animate-pulse">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white border border-slate-100 shadow-sm">
                                                    <Bot className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="mb-1.5">
                                                        <span className="text-xs font-semibold text-blue-600">{modelAConfig?.name || 'Model A'}</span>
                                                    </div>
                                                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm">
                                                        <div className="flex space-x-1.5 h-5 items-center">
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Model B Response */}
                                    <div className="space-y-4">
                                        {assistantMsgB ? (
                                            <div className="flex gap-4 animate-in slide-in-from-bottom-2 duration-300">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm border border-white bg-white">
                                                    <Bot className="h-6 w-6 text-purple-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="mb-1.5">
                                                        <span className="text-xs font-semibold text-purple-600">{modelBConfig?.name || 'Model B'}</span>
                                                    </div>
                                                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-5 py-3.5 text-sm leading-relaxed shadow-sm text-slate-700">
                                                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-img:rounded-lg prose-img:shadow-md">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {assistantMsgB.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : isLastPair && isLoadingB ? (
                                            <div className="flex gap-4 animate-pulse">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-white border border-slate-100 shadow-sm">
                                                    <Bot className="h-6 w-6 text-purple-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="mb-1.5">
                                                        <span className="text-xs font-semibold text-purple-600">{modelBConfig?.name || 'Model B'}</span>
                                                    </div>
                                                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm">
                                                        <div className="flex space-x-1.5 h-5 items-center">
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    ) : (
        // Single Model View: Normal layout
        <div className="flex-1 flex overflow-hidden pb-32">
            <div className="flex-1 min-w-0 flex flex-col">
                {errorA && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-red-800">模型 A 错误</p>
                            <p className="text-xs text-red-600 mt-1">{errorA}</p>
                        </div>
                        <button
                            onClick={() => setErrorA(null)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <ModelColumn
                        modelName={modelAConfig?.name || 'Select a Model'}
                        messages={messagesA}
                        isLoading={isLoadingA}
                        color="blue"
                        isComparison={false}
                        side="A"
                        config={config}
                        setConfig={setConfig}
                        modelId={modelAConfig?.modelId}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {content}

            <InputArea 
                onSend={handleSend} 
                isLoading={isLoading}
                enableWebSearch={enableWebSearch}
                onWebSearchToggle={setEnableWebSearch}
            />
        </div>
    );
}
