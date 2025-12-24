import { NextRequest } from 'next/server';
import { getChatSessionById } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const { id } = await ctx.params;
    const session = await Promise.resolve(getChatSessionById(id));
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
