import React, { useRef, useState } from 'react';
import { Send, Paperclip, X, Globe, WifiOff } from 'lucide-react';

interface InputAreaProps {
    onSend: (message: string, file?: File) => void;
    isLoading: boolean;
    enableWebSearch?: boolean;
    onWebSearchToggle?: (enabled: boolean) => void;
}

export function InputArea({ onSend, isLoading, enableWebSearch = false, onWebSearchToggle }: InputAreaProps) {
    const [input, setInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !selectedFile) || isLoading) return;

        onSend(input, selectedFile || undefined);
        setInput('');
        setSelectedFile(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    return (
        <div className="absolute bottom-6 left-0 right-0 px-4 z-20">
            <form onSubmit={handleSubmit} className="mx-auto max-w-3xl relative">
                {selectedFile && (
                    <div className="absolute -top-14 left-0 flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2">
                        <Paperclip className="h-4 w-4 text-slate-500" />
                        <span className="max-w-[200px] truncate font-medium text-slate-700">{selectedFile.name}</span>
                        <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="ml-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/60 bg-white/95 backdrop-blur-xl px-3 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] relative">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 rounded-xl transition-all"
                        disabled={isLoading}
                    >
                        <Paperclip className="h-5 w-5" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything..."
                        className="flex-1 bg-transparent px-2 py-2 pr-10 outline-none text-slate-700 placeholder:text-slate-400 text-base"
                        disabled={isLoading}
                    />

                    {/* Web Search Toggle - Inside input box, bottom right */}
                    {onWebSearchToggle && (
                        <button
                            type="button"
                            onClick={() => onWebSearchToggle(!enableWebSearch)}
                            className={`absolute bottom-2 right-14 p-1.5 rounded-lg transition-all ${
                                enableWebSearch
                                    ? 'text-blue-600 hover:bg-blue-50'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                            }`}
                            title={enableWebSearch ? '关闭联网搜索' : '开启联网搜索'}
                        >
                            <Globe className="h-4 w-4" />
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={(!input.trim() && !selectedFile) || isLoading}
                        className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 transition-all shadow-md"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-400 font-medium">AI can make mistakes. Please verify important information.</p>
                </div>
            </form>
        </div>
    );
}
