export type ModelProvider = 'openai' | 'anthropic' | 'openrouter';

export interface ModelConfig {
    id: string;
    name: string;
    provider: ModelProvider;
    apiKey: string;
    baseUrl?: string; // Optional for OpenAI/Anthropic defaults
    modelId: string; // The actual model string ID (e.g., 'gpt-4', 'claude-3-opus')
}

export interface AppConfig {
    models: ModelConfig[];
    comparison: {
        modelAId: string; // ID of the model config
        modelBId: string;
    };
}

export interface Message {
    id: string;
    role: 'system' | 'user' | 'assistant' | 'data';
    content: string;
}

export interface ChatSession {
    id: string;
    title: string;
    createdAt: number;
    type: 'comparison' | 'single';
    modelAId: string;
    modelBId?: string;
    messagesA: Message[];
    messagesB: Message[]; // Empty if single
}
