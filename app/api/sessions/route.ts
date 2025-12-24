import { NextRequest } from 'next/server';
import { ChatSession } from '@/lib/types';
import { listChatSessions, upsertChatSession } from '@/lib/db';

export const runtime = 'nodejs';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const userId = (session.user as any).id || session.user.email || 'default';
        const items = await Promise.resolve(listChatSessions(userId));
    return new Response(JSON.stringify(items), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function POST(req: NextRequest) {
    try {
        const sessionAuth = await getServerSession(authOptions);
        if (!sessionAuth?.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const userId = (sessionAuth.user as any).id || sessionAuth.user.email || 'default';
        const session = (await req.json()) as ChatSession;
        await Promise.resolve(upsertChatSession(userId, session));
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

