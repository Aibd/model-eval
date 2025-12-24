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
  user_id TEXT,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  base_url TEXT,
  model_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comparison (
  user_id TEXT PRIMARY KEY,
  model_a_id TEXT,
  model_b_id TEXT
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
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

// Migration to add user_id column if it doesn't exist
try {
    const tableInfoModels = db.prepare("PRAGMA table_info(models)").all() as any[];
    if (!tableInfoModels.some(col => col.name === 'user_id')) {
        db.exec("ALTER TABLE models ADD COLUMN user_id TEXT");
    }

    const tableInfoSessions = db.prepare("PRAGMA table_info(chat_sessions)").all() as any[];
    if (!tableInfoSessions.some(col => col.name === 'user_id')) {
        db.exec("ALTER TABLE chat_sessions ADD COLUMN user_id TEXT");
    }

    // Migration for comparison table: it used to be id=1 singleton, now it's user_id primary key
    const tableInfoComparison = db.prepare("PRAGMA table_info(comparison)").all() as any[];
    if (tableInfoComparison.some(col => col.name === 'id')) {
        // Drop and recreate comparison table if it has the old schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS comparison_new (
                user_id TEXT PRIMARY KEY,
                model_a_id TEXT,
                model_b_id TEXT
            );
            INSERT INTO comparison_new (user_id, model_a_id, model_b_id) 
            SELECT 'system', model_a_id, model_b_id FROM comparison WHERE id = 1;
            DROP TABLE comparison;
            ALTER TABLE comparison_new RENAME TO comparison;
        `);
    }
} catch (e) {
    console.error("Migration failed:", e);
}

function migrateConfigFromJson() {
    const configPath = path.join(process.cwd(), 'config', 'models.json');
    if (!fs.existsSync(configPath)) {
        return;
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as AppConfig;
    writeAppConfig('system', parsed);
    try {
        fs.unlinkSync(configPath);
    } catch {
    }
}

const hasModels = db.prepare('SELECT COUNT(*) as count FROM models').get() as { count: number };
if (!hasModels.count) {
    migrateConfigFromJson();
}

export function readAppConfig(userId: string, redact = false): AppConfig {
    const rows = db
        .prepare('SELECT id, name, provider, api_key, base_url, model_id FROM models WHERE user_id = ? ORDER BY name ASC')
        .all(userId) as {
        id: string;
        name: string;
        provider: ModelConfig['provider'];
        api_key: string;
        base_url: string | null;
        model_id: string;
    }[];

    const comparisonRow = db
        .prepare('SELECT model_a_id, model_b_id FROM comparison WHERE user_id = ?')
        .get(userId) as { model_a_id: string | null; model_b_id: string | null } | undefined;

    return {
        models: rows.map((r) => ({
            id: r.id,
            name: r.name,
            provider: r.provider,
            apiKey: redact ? (r.api_key ? 'REDACTED' : '') : r.api_key,
            baseUrl: r.base_url || undefined,
            modelId: r.model_id,
        })),
        comparison: {
            modelAId: comparisonRow?.model_a_id || '',
            modelBId: comparisonRow?.model_b_id || '',
        },
    };
}

export function writeAppConfig(userId: string, config: AppConfig): void {
    const tx = db.transaction((cfg: AppConfig) => {
        // Get existing models to preserve API keys if they are redacted in the incoming config
        const existingModels = db.prepare('SELECT id, api_key FROM models WHERE user_id = ?').all(userId) as { id: string; api_key: string }[];
        const keyMap = new Map(existingModels.map(m => [m.id, m.api_key]));

        db.prepare('DELETE FROM models WHERE user_id = ?').run(userId);
        const insertModel = db.prepare(
            'INSERT INTO models (id, user_id, name, provider, api_key, base_url, model_id) VALUES (@id, @userId, @name, @provider, @apiKey, @baseUrl, @modelId)'
        );
        cfg.models.forEach((m) => {
            // If the incoming key is 'REDACTED', use the existing key from DB
            const finalApiKey = m.apiKey === 'REDACTED' ? (keyMap.get(m.id) || '') : m.apiKey;
            
            insertModel.run({
                id: m.id,
                userId: userId,
                name: m.name,
                provider: m.provider,
                apiKey: finalApiKey,
                baseUrl: m.baseUrl ?? null,
                modelId: m.modelId,
            });
        });

        const comparison = cfg.comparison || { modelAId: '', modelBId: '' };
        db.prepare(
            'INSERT INTO comparison (user_id, model_a_id, model_b_id) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET model_a_id = excluded.model_a_id, model_b_id = excluded.model_b_id'
        ).run(userId, comparison.modelAId || null, comparison.modelBId || null);
    });

    tx(config);
}

export function findModelById(userId: string, id: string): ModelConfig | null {
    const row = db
        .prepare('SELECT id, name, provider, api_key, base_url, model_id FROM models WHERE id = ? AND user_id = ?')
        .get(id, userId) as
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

export function upsertChatSession(userId: string, session: ChatSession): void {
    const tx = db.transaction((s: ChatSession) => {
        db.prepare(
            'INSERT INTO chat_sessions (id, user_id, title, created_at, type, model_a_id, model_b_id) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, created_at = excluded.created_at, type = excluded.type, model_a_id = excluded.model_a_id, model_b_id = excluded.model_b_id'
        ).run(s.id, userId, s.title, s.createdAt, s.type, s.modelAId, s.modelBId || null);

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

export function listChatSessions(userId: string): { id: string; title: string; createdAt: number; type: string }[] {
    const rows = db
        .prepare(
            'SELECT id, title, created_at as createdAt, type FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
        )
        .all(userId) as { id: string; title: string; createdAt: number; type: string }[];

    return rows;
}

export function getChatSessionById(userId: string, id: string): ChatSession | null {
    const sessionRow = db
        .prepare(
            'SELECT id, title, created_at as createdAt, type, model_a_id as modelAId, model_b_id as modelBId FROM chat_sessions WHERE id = ? AND user_id = ?'
        )
        .get(id, userId) as
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
