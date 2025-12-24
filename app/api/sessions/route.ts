import { NextRequest } from 'next/server';
import { ChatSession } from '@/lib/types';
import { listChatSessions, upsertChatSession } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
    const items = await Promise.resolve(listChatSessions());
    return new Response(JSON.stringify(items), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST(req: NextRequest) {
    try {
        const session = (await req.json()) as ChatSession;
        await Promise.resolve(upsertChatSession(session));
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

