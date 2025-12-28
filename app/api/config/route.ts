import { NextRequest } from 'next/server';
import { AppConfig } from '@/lib/types';
import { readAppConfig, writeAppConfig } from '@/lib/db';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        // Return empty config for unauthenticated users so they can see the UI but have no models
        return new Response(JSON.stringify({ models: [], comparison: { modelAId: '', modelBId: '' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const userId = (session.user as any).id || session.user.email || 'default';
    const config = await Promise.resolve(readAppConfig(userId, true));
    return new Response(JSON.stringify(config), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const userId = (session.user as any).id || session.user.email || 'default';

        const config = (await req.json()) as AppConfig;
        await Promise.resolve(writeAppConfig(userId, config));
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

