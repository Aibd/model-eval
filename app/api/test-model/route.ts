import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';
import { AppConfig, ModelConfig } from '@/lib/types';

export const runtime = 'edge';

// Error type definitions
interface APIError {
    message?: string;
    error?: {
        message?: string;
        type?: string;
        code?: string;
    };
    code?: string | number;
    status?: number;
    response?: {
        status?: number;
        statusText?: string;
    };
    type?: string;
}

export async function POST(req: Request) {
    try {
        const { modelConfig } = await req.json();

        let resolvedModelConfig: ModelConfig | null = null;
        if (modelConfig && modelConfig.id) {
            try {
                const configPath = path.join(process.cwd(), 'config', 'models.json');
                const data = await fs.readFile(configPath, 'utf-8');
                const storedConfig = JSON.parse(data) as AppConfig;
                resolvedModelConfig = storedConfig.models.find(m => m.id === modelConfig.id) || null;
            } catch {
                resolvedModelConfig = null;
            }
        }

        const effectiveConfig = resolvedModelConfig || modelConfig;

        if (!effectiveConfig || !effectiveConfig.apiKey || !effectiveConfig.modelId) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    error: 'Missing model configuration' 
                }), 
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const { provider, apiKey, baseUrl, modelId } = effectiveConfig;

        // Test the configuration with a simple request
        try {
            if (provider === 'openai') {
                const openai = new OpenAI({
                    apiKey: apiKey,
                    baseURL: baseUrl || 'https://api.openai.com/v1',
                });
                const response = await openai.chat.completions.create({
                    model: modelId,
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 50, // Increased to allow proper response
                });
                return new Response(
                    JSON.stringify({ 
                        success: true, 
                        message: 'API key and model ID are valid',
                        model: response.model
                    }), 
                    { 
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );

            } else if (provider === 'custom') {
                if (!baseUrl) {
                    return new Response(
                        JSON.stringify({ 
                            success: false, 
                            error: 'Missing baseUrl for custom provider' 
                        }), 
                        { 
                            status: 400,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                }
                const openai = new OpenAI({
                    apiKey: apiKey,
                    baseURL: baseUrl,
                });
                const response = await openai.chat.completions.create({
                    model: modelId,
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 50,
                });
                return new Response(
                    JSON.stringify({ 
                        success: true, 
                        message: 'API key and model ID are valid',
                        model: response.model
                    }), 
                    { 
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );

            } else if (provider === 'anthropic') {
                const anthropic = new Anthropic({
                    apiKey: apiKey,
                    baseURL: baseUrl || 'https://api.anthropic.com',
                });
                const response = await anthropic.messages.create({
                    model: modelId,
                    max_tokens: 50, // Increased to allow proper response
                    messages: [{ role: 'user', content: 'Hello' }],
                });
                return new Response(
                    JSON.stringify({ 
                        success: true, 
                        message: 'API key and model ID are valid',
                        model: response.model
                    }), 
                    { 
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );

            } else if (provider === 'openrouter') {
                // Note: We don't strictly validate model ID format here
                // Some models might work without the provider prefix
                // Let OpenRouter API decide if the model is valid
                
                // Get the origin from the request for OpenRouter headers
                // OpenRouter requires HTTP-Referer header (note: it's HTTP-Referer, not Referer)
                const origin = req.headers.get('origin') || req.headers.get('referer') || 'http://localhost:3000';
                // Extract base URL from origin if it's a full URL
                const refererUrl = origin.startsWith('http') ? origin : `http://${origin}`;
                
                // Try to get a more specific referer if available
                const referer = req.headers.get('referer') || refererUrl;
                
                const openai = new OpenAI({
                    apiKey: apiKey,
                    baseURL: baseUrl || 'https://openrouter.ai/api/v1',
                    defaultHeaders: {
                        'HTTP-Referer': referer,
                        'X-Title': 'Model Arena',
                        // Some clients may need additional headers
                        'Content-Type': 'application/json',
                    },
                });
                
                // Log request details for debugging
                console.log('Testing OpenRouter model:', {
                    modelId,
                    baseURL: baseUrl || 'https://openrouter.ai/api/v1',
                    referer: refererUrl,
                });
                
                try {
                    // Use similar parameters as chat API
                    // Some models (like gpt-5.2) may require more tokens or different settings
                    const response = await openai.chat.completions.create({
                        model: modelId,
                        messages: [{ role: 'user', content: 'Hello' }],
                        // Don't set max_tokens too low - some models need more
                        // Let the model use its default or reasonable minimum
                        max_tokens: 50, // Increased from 5 to allow models to respond properly
                    });
                    return new Response(
                        JSON.stringify({ 
                            success: true, 
                            message: 'API key and model ID are valid',
                            model: response.model
                        }), 
                        { 
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                } catch (apiError: unknown) {
                    // Log detailed error for debugging
                    const err = apiError as APIError;
                    console.error('OpenRouter API error:', {
                        modelId,
                        error: apiError,
                        errorMessage: err?.message,
                        errorResponse: err?.response,
                        status: err?.status,
                    });
                    throw apiError;
                }
            } else {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        error: 'Invalid provider' 
                    }), 
                    { 
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }
        } catch (testError: unknown) {
            // Handle API errors with detailed information
            // Try multiple ways to extract error message
            const err = testError as APIError;
            let errorMessage = 'Unknown error';
            let errorDetails: Record<string, unknown> = {};
            
            if (err?.error) {
                errorMessage = err.error.message || JSON.stringify(err.error);
                errorDetails = err.error as Record<string, unknown>;
            } else if (err?.message) {
                errorMessage = err.message;
            } else if (err?.response) {
                errorMessage = err.response.statusText || 'Provider returned error';
                errorDetails = err.response as Record<string, unknown>;
            }
            
            const errorCode = err?.code || err?.status || err?.response?.status;
            const statusCode = err?.status || err?.response?.status || 500;
            
            // Log full error for debugging
            console.error('Model test error (full):', {
                provider,
                modelId,
                statusCode,
                errorCode,
                errorMessage,
                testErrorType: err?.constructor?.name,
                testErrorKeys: Object.keys(err || {}),
                fullError: JSON.stringify(err, Object.getOwnPropertyNames(err))
            });
            
            // Special handling for OpenRouter errors
            let friendlyMessage = errorMessage;
            if (provider === 'openrouter') {
                // Check for specific error patterns
                const lowerError = errorMessage.toLowerCase();
                
                if (lowerError.includes('not available') || lowerError.includes('not found') || statusCode === 404) {
                    friendlyMessage = `模型 "${modelId}" 在 OpenRouter 上不可用或不存在。\n\n可能原因：\n1. 模型名称拼写错误\n2. 模型已被移除或暂时不可用\n3. 该模型需要特殊权限或订阅\n\n请访问 https://openrouter.ai/models 搜索确认模型名称。`;
                } else if (statusCode === 401 || lowerError.includes('api key') || lowerError.includes('incorrect api key') || lowerError.includes('unauthorized')) {
                    if (modelId.includes('gpt-5.2')) {
                        friendlyMessage = `模型 "${modelId}" 可能不存在或需要特殊权限。\n\n注意：GPT-5.2 可能不是正确的模型名称。OpenRouter 上常见的 OpenAI 模型包括：\n- openai/gpt-4o\n- openai/gpt-4-turbo\n- openai/gpt-4\n- openai/gpt-3.5-turbo\n\n请确认模型名称是否正确，或访问 https://openrouter.ai/models 查看可用模型。`;
                    } else {
                        friendlyMessage = `API key 验证失败。请确认：\n1. API key 是否正确\n2. 是否有权限访问模型 "${modelId}"\n3. 某些模型可能需要特定的订阅级别`;
                    }
                } else if (statusCode === 400 || lowerError.includes('provider returned error') || lowerError.includes('bad request')) {
                    // Special handling for "Provider returned error"
                    if (modelId.includes('gpt-5.2')) {
                        friendlyMessage = `模型 "${modelId}" 无法访问。\n\n可能原因：\n1. 模型名称不正确 - GPT-5.2 可能不存在\n2. 模型需要特殊权限或订阅\n3. 模型暂时不可用\n\n建议：\n- 访问 https://openrouter.ai/models 搜索 "gpt" 查看可用的 GPT 模型\n- 尝试使用 openai/gpt-4o 或其他已验证可用的模型`;
                    } else {
                        friendlyMessage = `请求失败：${errorMessage}\n\n模型 ID: ${modelId}\n\n可能原因：\n1. 模型名称不正确\n2. 模型暂时不可用\n3. 需要特殊权限\n\n请检查模型名称或访问 https://openrouter.ai/models 查看可用模型。`;
                    }
                } else if (lowerError.includes('rate limit') || statusCode === 429) {
                    friendlyMessage = `请求频率过高，请稍后再试。`;
                } else {
                    friendlyMessage = `OpenRouter 返回错误：${errorMessage}\n\n模型 ID: ${modelId}\n状态码: ${statusCode}\n\n请检查模型名称是否正确，或访问 https://openrouter.ai/models 查看可用模型。`;
                }
            }
            
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    error: friendlyMessage,
                    code: errorCode,
                    statusCode: statusCode,
                    originalError: errorMessage,
                    details: errorDetails,
                    modelId: modelId,
                    provider: provider,
                    // Add debugging info
                    debug: {
                        requestModelId: modelId,
                        errorType: err?.error?.type || err?.type,
                        errorCode: err?.error?.code || errorCode,
                        statusCode: statusCode,
                        fullError: err
                    }
                }), 
                { 
                    status: statusCode >= 400 && statusCode < 600 ? statusCode : 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    } catch (error: unknown) {
        const err = error as Error;
        return new Response(
            JSON.stringify({ 
                success: false, 
                error: err?.message || 'Internal server error' 
            }), 
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

