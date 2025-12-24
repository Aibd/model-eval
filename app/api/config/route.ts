import { NextRequest } from 'next/server';
import { AppConfig } from '@/lib/types';
import { readAppConfig, writeAppConfig } from '@/lib/db';

export async function GET() {
    const config = await Promise.resolve(readAppConfig(true));
    return new Response(JSON.stringify(config), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function POST(req: NextRequest) {
    try {
        const config = (await req.json()) as AppConfig;
        await Promise.resolve(writeAppConfig(config));
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

