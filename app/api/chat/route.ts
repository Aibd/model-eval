import { OpenAIStream, AnthropicStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ModelConfig } from '@/lib/types';
import { findModelById } from '@/lib/db';

export const runtime = 'nodejs';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user ? ((session.user as any).id || session.user.email) : 'anonymous';
        const { messages, modelConfig, enableWebSearch } = await req.json();

        let resolvedModelConfig: ModelConfig | null = null;
        if (modelConfig && modelConfig.id) {
            resolvedModelConfig = findModelById(userId, modelConfig.id);
        }

        const effectiveConfig = resolvedModelConfig || modelConfig;

        if (!effectiveConfig || !effectiveConfig.apiKey || !effectiveConfig.modelId) {
            return new Response('Missing model configuration', { status: 400 });
        }

        const { provider, apiKey, baseUrl, modelId } = effectiveConfig;
        let stream;

        if (provider === 'openai') {
            const openai = new OpenAI({
                apiKey: apiKey,
                baseURL: baseUrl || 'https://api.openai.com/v1',
            });
            const response = await openai.chat.completions.create({
                model: modelId,
                stream: true,
                messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
            });
            stream = OpenAIStream(response as ReadableStream);

        } else if (provider === 'custom') {
            if (!baseUrl) {
                return new Response('Missing baseUrl for custom provider', { status: 400 });
            }
            const openai = new OpenAI({
                apiKey: apiKey,
                baseURL: baseUrl,
            });
            const response = await openai.chat.completions.create({
                model: modelId,
                stream: true,
                messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
            });
            stream = OpenAIStream(response as ReadableStream);

        } else if (provider === 'anthropic') {
            const anthropic = new Anthropic({
                apiKey: apiKey,
                baseURL: baseUrl || 'https://api.anthropic.com',
            });

            // Extract system message if present
            const systemMessage = messages.find((m: { role: string; content: string }) => m.role === 'system')?.content;
            const conversationMessages = messages.filter((m: { role: string; content: string }) => m.role !== 'system').map((m: { role: string; content: string }) => ({
                role: m.role,
                content: m.content
            }));

            const response = await anthropic.messages.create({
                model: modelId,
                stream: true,
                max_tokens: 4096,
                messages: conversationMessages,
                system: systemMessage,
            });
            stream = AnthropicStream(response as ReadableStream);

        } else if (provider === 'openrouter') {
            // Note: We don't strictly validate model ID format here
            // Some models might work without the provider prefix or with different formats
            // Let OpenRouter API decide if the model is valid (like Cherry Studio does)

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

            // Prepare request options
            const requestOptions: {
                model: string;
                stream: boolean;
                messages: { role: string; content: string }[];
                plugins?: { id: string; engine: string }[];
            } = {
                model: modelId,
                stream: true,
                messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
            };

            // Add web search for OpenRouter if enabled
            // According to OpenRouter docs: https://openrouter.ai/docs/guides/features/web-search
            // Default to native engine, which automatically falls back to Exa if not supported
            if (enableWebSearch) {
                console.log(`Web search enabled for model: ${modelId}`);

                requestOptions.plugins = [
                    {
                        id: 'web',
                        engine: 'native'
                    }
                ];

                console.log(`Using native engine for web search with model: ${modelId} (will fallback to Exa if needed)`);
            } else {
                console.log('Web search not enabled');
            }

            try {
                const response = await openai.chat.completions.create(requestOptions);
                stream = OpenAIStream(response as ReadableStream);
            } catch (searchError) {
                console.error(`Web search failed for model ${modelId}:`, {
                    error: searchError?.message || searchError,
                    status: searchError?.status,
                    code: searchError?.code,
                    plugins: requestOptions.plugins
                });

                // Check if this is a "native web search not supported" error
                const isNativeNotSupported = searchError?.status === 404 &&
                    (searchError?.message?.includes('native web search') ||
                        searchError?.message?.includes('No endpoints found that support native web search'));

                if (enableWebSearch && isNativeNotSupported) {
                    console.log(`Model ${modelId} doesn't support native web search, retrying with Exa engine...`);

                    // Retry with Exa engine
                    const exaRetryOptions: {
                        model: string;
                        stream: boolean;
                        messages: { role: string; content: string }[];
                        plugins: { id: string; engine: string }[];
                    } = {
                        ...requestOptions,
                        plugins: [
                            {
                                id: 'web',
                                engine: 'exa'
                            }
                        ]
                    };

                    try {
                        const response = await openai.chat.completions.create(exaRetryOptions);
                        stream = OpenAIStream(response as ReadableStream);
                        console.log(`Successfully retried with Exa engine for model ${modelId}`);
                    } catch (exaError) {
                        console.error(`Exa engine also failed for model ${modelId}:`, exaError?.message || exaError);

                        // Final fallback: retry without any web search
                        console.warn(`Falling back to no web search for model ${modelId}`);
                        const finalRetryOptions: {
                            model: string;
                            stream: boolean;
                            messages: { role: string; content: string }[];
                            plugins?: { id: string; engine: string }[];
                        } = {
                            ...requestOptions
                        };
                        delete finalRetryOptions.plugins;

                        try {
                            const response = await openai.chat.completions.create(finalRetryOptions);
                            stream = OpenAIStream(response as ReadableStream);
                            console.log(`Successfully completed request without web search for model ${modelId}`);
                        } catch (finalError) {
                            console.error(`All attempts failed for model ${modelId}:`, finalError?.message || finalError);
                            throw finalError;
                        }
                    }
                } else if (enableWebSearch) {
                    // For other web search errors, retry without plugins
                    console.warn(`Web search failed for model ${modelId}, retrying without plugins...`);
                    const retryOptions: {
                        model: string;
                        stream: boolean;
                        messages: { role: string; content: string }[];
                        plugins?: { id: string; engine: string }[];
                    } = {
                        ...requestOptions
                    };
                    delete retryOptions.plugins;

                    try {
                        const response = await openai.chat.completions.create(retryOptions);
                        stream = OpenAIStream(response as ReadableStream);
                        console.log(`Successfully retried without web search for model ${modelId}`);
                    } catch (retryError) {
                        console.error(`Retry also failed for model ${modelId}:`, retryError?.message || retryError);
                        throw retryError;
                    }
                } else {
                    throw searchError;
                }
            }
        } else {
            return new Response('Invalid provider', { status: 400 });
        }

        return new StreamingTextResponse(stream);
    } catch (error) {
        console.error('API Error:', error);

        // 处理 API key 错误
        if (error?.status === 401 || error?.code === 'invalid_api_key') {
            const errorMessage = error?.error?.message || error?.message || 'Invalid API key';
            return new Response(
                JSON.stringify({
                    error: 'Authentication Error',
                    message: errorMessage,
                    code: 'invalid_api_key',
                    hint: 'Please check your API key in the settings. Make sure it is correct and has not expired.'
                }),
                {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 处理其他错误
        const statusCode = error?.status || 500;
        const errorMessage = error?.error?.message || error?.message || 'Internal Server Error';

        return new Response(
            JSON.stringify({
                error: 'API Error',
                message: errorMessage,
                details: error?.error || error
            }),
            {
                status: statusCode,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
