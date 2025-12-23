import React, { useState, useEffect } from 'react';
import { X, Save, Key, Server, Plus, Trash2, Check, Edit2, TestTube, Loader2, AlertCircle } from 'lucide-react';
import { AppConfig, ModelConfig, ModelProvider } from '@/lib/types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: AppConfig) => void;
    initialConfig: AppConfig;
}

const PROVIDERS: { value: ModelProvider; label: string; defaultBaseUrl: string }[] = [
    { value: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1' },
    { value: 'anthropic', label: 'Anthropic', defaultBaseUrl: 'https://api.anthropic.com/v1' },
    { value: 'openrouter', label: 'OpenRouter', defaultBaseUrl: 'https://openrouter.ai/api/v1' },
];

export function SettingsModal({ isOpen, onClose, onSave, initialConfig }: SettingsModalProps) {
    const [config, setConfig] = useState<AppConfig>(initialConfig);
    const [activeTab, setActiveTab] = useState<'models' | 'comparison'>('models');

    // New model form state
    const [newModel, setNewModel] = useState<Partial<ModelConfig>>({
        provider: 'openai',
        name: '',
        apiKey: '',
        modelId: '',
        baseUrl: 'https://api.openai.com/v1'
    });

    // Editing state
    const [editingModelId, setEditingModelId] = useState<string | null>(null);

    // Testing state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);

    useEffect(() => {
        setConfig(initialConfig);
    }, [initialConfig]);

    if (!isOpen) return null;

    const handleAddModel = () => {
        if (!newModel.name || !newModel.apiKey || !newModel.modelId) return;

        let updatedConfig: AppConfig;
        if (editingModelId) {
            // Update existing model
            updatedConfig = {
                ...config,
                models: config.models.map(m =>
                    m.id === editingModelId
                        ? {
                            ...m,
                            name: newModel.name!,
                            provider: newModel.provider as ModelProvider,
                            apiKey: newModel.apiKey!,
                            modelId: newModel.modelId!,
                            baseUrl: newModel.baseUrl
                        }
                        : m
                )
            };
            setEditingModelId(null);
        } else {
            // Add new model
            const model: ModelConfig = {
                id: crypto.randomUUID(),
                name: newModel.name,
                provider: newModel.provider as ModelProvider,
                apiKey: newModel.apiKey,
                modelId: newModel.modelId,
                baseUrl: newModel.baseUrl
            };

            updatedConfig = {
                ...config,
                models: [...config.models, model]
            };
        }

        setConfig(updatedConfig);
        // Auto-save when adding/editing models
        onSave(updatedConfig);

        // Reset form
        setNewModel({
            provider: 'openai',
            name: '',
            apiKey: '',
            modelId: '',
            baseUrl: 'https://api.openai.com/v1'
        });
    };

    const handleEditModel = (model: ModelConfig) => {
        setEditingModelId(model.id);
        setNewModel({
            provider: model.provider,
            name: model.name,
            apiKey: model.apiKey,
            modelId: model.modelId,
            baseUrl: model.baseUrl || PROVIDERS.find(p => p.value === model.provider)?.defaultBaseUrl || ''
        });
        // Scroll to form
        setTimeout(() => {
            const formElement = document.querySelector('.bg-slate-50');
            formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleCancelEdit = () => {
        setEditingModelId(null);
        setNewModel({
            provider: 'openai',
            name: '',
            apiKey: '',
            modelId: '',
            baseUrl: 'https://api.openai.com/v1'
        });
        setTestResult(null);
    };

    const handleTestModel = async () => {
        if (!newModel.name || !newModel.apiKey || !newModel.modelId) {
            setTestResult({
                success: false,
                message: '请先填写所有必填字段',
            });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            const testConfig: ModelConfig = {
                id: editingModelId || crypto.randomUUID(),
                name: newModel.name,
                provider: newModel.provider as ModelProvider,
                apiKey: newModel.apiKey,
                modelId: newModel.modelId,
                baseUrl: newModel.baseUrl
            };

            const response = await fetch('/api/test-model', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ modelConfig: testConfig }),
            });

            const data = await response.json();

            if (data.success) {
                setTestResult({
                    success: true,
                    message: data.message || '测试成功！API key 和模型 ID 都有效。',
                });
            } else {
                // Show detailed error information
                let errorDetails = data.error || '测试失败';
                if (data.originalError && data.originalError !== data.error) {
                    errorDetails += `\n原始错误: ${data.originalError}`;
                }
                if (data.modelId && data.provider === 'openrouter') {
                    errorDetails += `\n模型 ID: ${data.modelId}`;
                }
                
                setTestResult({
                    success: false,
                    message: errorDetails,
                    error: data.details?.message || data.details?.error?.message || data.originalError,
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: '测试时发生错误',
                error: error instanceof Error ? error.message : '未知错误',
            });
        } finally {
            setIsTesting(false);
        }
    };

    const removeModel = (id: string) => {
        if (editingModelId === id) {
            handleCancelEdit();
        }
        const updatedConfig: AppConfig = {
            ...config,
            models: config.models.filter(m => m.id !== id),
            // Clear comparison if removed model was selected
            comparison: {
                modelAId: config.comparison.modelAId === id ? '' : config.comparison.modelAId,
                modelBId: config.comparison.modelBId === id ? '' : config.comparison.modelBId,
            }
        };
        setConfig(updatedConfig);
        // Auto-save when removing models
        onSave(updatedConfig);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">Configuration</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex border-b border-slate-100 shrink-0">
                    <button
                        onClick={() => setActiveTab('models')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'models' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Manage Models
                    </button>
                    <button
                        onClick={() => setActiveTab('comparison')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'comparison' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Comparison Setup
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'models' ? (
                        <div className="space-y-8">
                            {/* Add/Edit Model Form */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        {editingModelId ? (
                                            <>
                                                <Edit2 className="h-4 w-4" /> Edit Model
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4" /> Add New Model
                                            </>
                                        )}
                                    </h3>
                                    {editingModelId && (
                                        <button
                                            onClick={handleCancelEdit}
                                            className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                        >
                                            取消编辑
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">Provider</label>
                                        <select
                                            value={newModel.provider}
                                            onChange={e => {
                                                const selectedProvider = e.target.value as ModelProvider;
                                                const defaultUrl = PROVIDERS.find(p => p.value === selectedProvider)?.defaultBaseUrl || '';
                                                setNewModel({ ...newModel, provider: selectedProvider, baseUrl: defaultUrl });
                                            }}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        >
                                            {PROVIDERS.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">Display Name</label>
                                        <input
                                            type="text"
                                            value={newModel.name}
                                            onChange={e => setNewModel({ ...newModel, name: e.target.value })}
                                            placeholder="e.g. GPT-4 Turbo"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">Model ID (API)</label>
                                        <input
                                            type="text"
                                            value={newModel.modelId}
                                            onChange={e => {
                                                const newModelId = e.target.value;
                                                // Auto-update display name if it's empty or matches the old modelId
                                                const newName = !newModel.name || newModel.name === newModel.modelId 
                                                    ? newModelId 
                                                    : newModel.name;
                                                setNewModel({ ...newModel, modelId: newModelId, name: newName });
                                            }}
                                            placeholder={
                                                newModel.provider === 'openrouter' 
                                                    ? 'e.g. openai/gpt-4o 或 anthropic/claude-3-opus'
                                                    : newModel.provider === 'openai'
                                                    ? 'e.g. gpt-4-turbo-preview'
                                                    : newModel.provider === 'anthropic'
                                                    ? 'e.g. claude-3-opus-20240229'
                                                    : 'e.g. model-id'
                                            }
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">API Key</label>
                                        <input
                                            type="text"
                                            value={newModel.apiKey}
                                            onChange={e => setNewModel({ ...newModel, apiKey: e.target.value })}
                                            placeholder="sk-..."
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-medium text-slate-500 mb-1 block">Base URL (Optional)</label>
                                        <input
                                            type="text"
                                            value={newModel.baseUrl}
                                            onChange={e => setNewModel({ ...newModel, baseUrl: e.target.value })}
                                            placeholder="https://api.openai.com/v1"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                {/* Test Result Display */}
                                {testResult && (
                                    <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                                        testResult.success
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-red-50 border-red-200'
                                    }`}>
                                        {testResult.success ? (
                                            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${
                                                testResult.success ? 'text-green-800' : 'text-red-800'
                                            }`}>
                                                {testResult.message}
                                            </p>
                                            {testResult.error && (
                                                <p className="text-xs text-red-600 mt-1 font-mono">
                                                    {testResult.error}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setTestResult(null)}
                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleTestModel}
                                        disabled={!newModel.name || !newModel.apiKey || !newModel.modelId || isTesting}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isTesting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                测试中...
                                            </>
                                        ) : (
                                            <>
                                                <TestTube className="h-4 w-4" />
                                                测试连接
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleAddModel}
                                        disabled={!newModel.name || !newModel.apiKey || !newModel.modelId}
                                        className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {editingModelId ? 'Update Model' : 'Add Model'}
                                    </button>
                                </div>
                            </div>

                            {/* Existing Models List */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-slate-800 text-sm">Configured Models</h3>
                                {config.models.length === 0 && (
                                    <p className="text-sm text-slate-400 italic">No models configured yet.</p>
                                )}
                                {config.models.map(model => (
                                    <div key={model.id} className={`flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm transition-all ${
                                        editingModelId === model.id 
                                            ? 'border-blue-500 ring-2 ring-blue-200' 
                                            : 'border-slate-200'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-md ${model.provider === 'openai' ? 'bg-green-100 text-green-600' : model.provider === 'anthropic' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <Server className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 text-sm">{model.name}</p>
                                                <p className="text-xs text-slate-500 font-mono">{model.modelId} • {model.provider}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEditModel(model)}
                                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="编辑模型"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => removeModel(model.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="删除模型"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-8">
                                {/* Model A Selection */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                                        <h3 className="font-semibold uppercase tracking-wider text-xs">Model A (Left)</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {config.models.map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => setConfig(prev => ({ ...prev, comparison: { ...prev.comparison, modelAId: model.id } }))}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${config.comparison.modelAId === model.id
                                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium text-slate-700">{model.name}</span>
                                                {config.comparison.modelAId === model.id && <Check className="h-4 w-4 text-blue-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Model B Selection */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-purple-600">
                                        <div className="h-2 w-2 rounded-full bg-purple-600"></div>
                                        <h3 className="font-semibold uppercase tracking-wider text-xs">Model B (Right)</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {config.models.map(model => (
                                            <button
                                                key={model.id}
                                                onClick={() => setConfig(prev => ({ ...prev, comparison: { ...prev.comparison, modelBId: model.id } }))}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${config.comparison.modelBId === model.id
                                                    ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                                                    : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium text-slate-700">{model.name}</span>
                                                {config.comparison.modelBId === model.id && <Check className="h-4 w-4 text-purple-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={() => {
                            // Save comparison settings before closing
                            onSave(config);
                            onClose();
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 font-medium"
                    >
                        <Save className="h-4 w-4" />
                        应用更改并关闭
                    </button>
                </div>
            </div>
        </div>
    );
}
