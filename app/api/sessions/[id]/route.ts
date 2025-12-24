import { NextRequest } from 'next/server';
import { getChatSessionById } from '@/lib/db';

export const runtime = 'nodejs';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const sessionAuth = await getServerSession(authOptions);
    if (!sessionAuth?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const userId = (sessionAuth.user as any).id || sessionAuth.user.email || 'default';
    const { id } = await ctx.params;
    const session = await Promise.resolve(getChatSessionById(userId, id));
    if (!session) {
        return new Response('Not found', {
            status: 404,
        });
    }

    return new Response(JSON.stringify(session), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
