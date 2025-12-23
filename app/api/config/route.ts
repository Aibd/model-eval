import { NextRequest } from 'next/server';
import { AppConfig } from '@/lib/types';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'config', 'models.json');

async function readConfig(): Promise<AppConfig> {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        return JSON.parse(data) as AppConfig;
    } catch {
        const defaultConfig: AppConfig = {
            models: [],
            comparison: {
                modelAId: '',
                modelBId: ''
            }
        };
        return defaultConfig;
    }
}

async function writeConfig(config: AppConfig): Promise<void> {
    const dir = path.dirname(CONFIG_FILE);
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch {
    }
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export async function GET() {
    const config = await readConfig();
    return new Response(JSON.stringify(config), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function POST(req: NextRequest) {
    try {
        const config = (await req.json()) as AppConfig;
        await writeConfig(config);
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

