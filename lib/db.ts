import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { AppConfig, ChatSession, ModelConfig, Message } from './types';

const dbFile = path.join(process.cwd(), 'data', 'app.db');
const dbDir = path.dirname(dbFile);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbFile);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  base_url TEXT,
  model_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comparison (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  model_a_id TEXT,
  model_b_id TEXT
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  type TEXT NOT NULL,
  model_a_id TEXT NOT NULL,
  model_b_id TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  side TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  idx INTEGER NOT NULL
);
`);

function migrateConfigFromJson() {
    const configPath = path.join(process.cwd(), 'config', 'models.json');
    if (!fs.existsSync(configPath)) {
        return;
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as AppConfig;
    writeAppConfig(parsed);
    try {
        fs.unlinkSync(configPath);
    } catch {
    }
}

const hasModels = db.prepare('SELECT COUNT(*) as count FROM models').get() as { count: number };
if (!hasModels.count) {
    migrateConfigFromJson();
}

export function readAppConfig(): AppConfig {
    const rows = db
        .prepare('SELECT id, name, provider, api_key, base_url, model_id FROM models ORDER BY name ASC')
        .all() as {
        id: string;
        name: string;
        provider: ModelConfig['provider'];
        api_key: string;
        base_url: string | null;
        model_id: string;
    }[];

    const comparisonRow = db
        .prepare('SELECT model_a_id, model_b_id FROM comparison WHERE id = 1')
        .get() as { model_a_id: string | null; model_b_id: string | null } | undefined;

    return {
        models: rows.map((r) => ({
            id: r.id,
            name: r.name,
            provider: r.provider,
            apiKey: r.api_key,
            baseUrl: r.base_url || undefined,
            modelId: r.model_id,
        })),
        comparison: {
            modelAId: comparisonRow?.model_a_id || '',
            modelBId: comparisonRow?.model_b_id || '',
        },
    };
}

export function writeAppConfig(config: AppConfig): void {
    const tx = db.transaction((cfg: AppConfig) => {
        db.prepare('DELETE FROM models').run();
        const insertModel = db.prepare(
            'INSERT INTO models (id, name, provider, api_key, base_url, model_id) VALUES (@id, @name, @provider, @apiKey, @baseUrl, @modelId)'
        );
        cfg.models.forEach((m) => {
            insertModel.run({
                id: m.id,
                name: m.name,
                provider: m.provider,
                apiKey: m.apiKey,
                baseUrl: m.baseUrl ?? null,
                modelId: m.modelId,
            });
        });

        const comparison = cfg.comparison || { modelAId: '', modelBId: '' };
        db.prepare(
            'INSERT INTO comparison (id, model_a_id, model_b_id) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET model_a_id = excluded.model_a_id, model_b_id = excluded.model_b_id'
        ).run(comparison.modelAId || null, comparison.modelBId || null);
    });

    tx(config);
}

export function findModelById(id: string): ModelConfig | null {
    const row = db
        .prepare('SELECT id, name, provider, api_key, base_url, model_id FROM models WHERE id = ?')
        .get(id) as
        | {
              id: string;
              name: string;
              provider: ModelConfig['provider'];
              api_key: string;
              base_url: string | null;
              model_id: string;
          }
        | undefined;

    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        provider: row.provider,
        apiKey: row.api_key,
        baseUrl: row.base_url || undefined,
        modelId: row.model_id,
    };
}

export function upsertChatSession(session: ChatSession): void {
    const tx = db.transaction((s: ChatSession) => {
        db.prepare(
            'INSERT INTO chat_sessions (id, title, created_at, type, model_a_id, model_b_id) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, created_at = excluded.created_at, type = excluded.type, model_a_id = excluded.model_a_id, model_b_id = excluded.model_b_id'
        ).run(s.id, s.title, s.createdAt, s.type, s.modelAId, s.modelBId || null);

        db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(s.id);

        const insertMessage = db.prepare(
            'INSERT INTO chat_messages (id, session_id, side, role, content, created_at, idx) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        let idx = 0;
        s.messagesA.forEach((m) => {
            insertMessage.run(m.id, s.id, 'A', m.role, m.content, s.createdAt, idx++);
        });
        s.messagesB.forEach((m) => {
            insertMessage.run(m.id, s.id, 'B', m.role, m.content, s.createdAt, idx++);
        });
    });

    tx(session);
}

export function listChatSessions(): { id: string; title: string; createdAt: number; type: string }[] {
    const rows = db
        .prepare(
            'SELECT id, title, created_at as createdAt, type FROM chat_sessions ORDER BY created_at DESC LIMIT 100'
        )
        .all() as { id: string; title: string; createdAt: number; type: string }[];

    return rows;
}

export function getChatSessionById(id: string): ChatSession | null {
    const sessionRow = db
        .prepare(
            'SELECT id, title, created_at as createdAt, type, model_a_id as modelAId, model_b_id as modelBId FROM chat_sessions WHERE id = ?'
        )
        .get(id) as
        | {
              id: string;
              title: string;
              createdAt: number;
              type: string;
              modelAId: string;
              modelBId: string | null;
          }
        | undefined;

    if (!sessionRow) {
        return null;
    }

    const messageRows = db
        .prepare(
            'SELECT id, side, role, content, created_at as createdAt, idx FROM chat_messages WHERE session_id = ? ORDER BY idx ASC'
        )
        .all(id) as {
        id: string;
        side: string;
        role: Message['role'];
        content: string;
        createdAt: number;
        idx: number;
    }[];

    const messagesA: Message[] = [];
    const messagesB: Message[] = [];

    messageRows.forEach((row) => {
        const message: Message = {
            id: row.id,
            role: row.role,
            content: row.content,
        };
        if (row.side === 'A') {
            messagesA.push(message);
        } else if (row.side === 'B') {
            messagesB.push(message);
        }
    });

    return {
        id: sessionRow.id,
        title: sessionRow.title,
        createdAt: sessionRow.createdAt,
        type: sessionRow.type === 'comparison' ? 'comparison' : 'single',
        modelAId: sessionRow.modelAId,
        modelBId: sessionRow.modelBId || undefined,
        messagesA,
        messagesB,
    };
}
