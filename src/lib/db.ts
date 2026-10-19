import fs from "fs";
import path from "path";

type Row = Record<string, unknown>;

type Runner = {
  all(sql: string, params?: unknown[]): Promise<Row[]>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
};

let runnerPromise: Promise<Runner> | null = null;
let readyPromise: Promise<void> | null = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS tutors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    bio TEXT NOT NULL,
    timezone TEXT NOT NULL,
    subjects TEXT NOT NULL,
    cancel_policy_hours INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    parent_email TEXT NOT NULL,
    parent_phone TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    tutor_id TEXT NOT NULL,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    subjects TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL,
    family_id TEXT,
    student_id TEXT,
    session_type TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    status TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    parent_email TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_grade TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    covered TEXT,
    went_well TEXT,
    next_focus TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sessions_slot_unique
    ON sessions (tutor_id, starts_at)
    WHERE status != 'canceled'`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL,
    family_id TEXT,
    session_id TEXT NOT NULL UNIQUE,
    number TEXT NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL,
    checkout_url TEXT,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    due_at TEXT,
    paid_at TEXT,
    failure_reason TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    bot TEXT NOT NULL,
    customer TEXT NOT NULL,
    request TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    status TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'ops',
    kind TEXT NOT NULL DEFAULT 'other',
    target_id TEXT,
    created_at TEXT NOT NULL,
    decided_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    related_id TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    bot TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'ops',
    action TEXT NOT NULL,
    summary TEXT NOT NULL,
    target TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    channel TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    from_name TEXT NOT NULL,
    from_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ticket_replies (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS job_openings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    team TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS applicants (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS time_off (
    id TEXT PRIMARY KEY,
    person TEXT NOT NULL,
    starts_on TEXT NOT NULL,
    ends_on TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS plan_payments (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    failure_reason TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL
  )`,
];

const ALTERS = [
  `ALTER TABLE approvals ADD COLUMN department TEXT NOT NULL DEFAULT 'ops'`,
  `ALTER TABLE approvals ADD COLUMN kind TEXT NOT NULL DEFAULT 'other'`,
  `ALTER TABLE approvals ADD COLUMN target_id TEXT`,
  `ALTER TABLE activity_log ADD COLUMN department TEXT NOT NULL DEFAULT 'ops'`,
];

const TABLES = [
  "ticket_replies",
  "tickets",
  "applicants",
  "job_openings",
  "time_off",
  "campaigns",
  "leads",
  "plan_payments",
  "activity_log",
  "outbox",
  "audit_log",
  "approvals",
  "invoices",
  "sessions",
  "students",
  "families",
  "settings",
  "tutors",
];

function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? url : null;
}

export function databaseLabel() {
  const url = databaseUrl();
  if (!url) {
    return {
      mode: "sqlite" as const,
      label: process.env.SQLITE_PATH || "data/business-os.db",
    };
  }
  try {
    return { mode: "postgres" as const, label: new URL(url).hostname };
  } catch {
    return { mode: "postgres" as const, label: "configured" };
  }
}

function toPg(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function sqliteFile() {
  return process.env.SQLITE_PATH || path.join(process.cwd(), "data", "business-os.db");
}

async function createRunner(): Promise<Runner> {
  const url = databaseUrl();
  if (url) {
    const { Pool } = await import("pg");
    const parsed = new URL(url);
    const host = parsed.hostname;
    const local = host === "localhost" || host === "127.0.0.1";
    parsed.searchParams.delete("sslmode");
    const pool = new Pool({
      connectionString: parsed.toString(),
      ssl: local ? undefined : { rejectUnauthorized: false },
      max: 5,
    });
    return {
      async all(sql, params = []) {
        const result = await pool.query(toPg(sql), params);
        return result.rows as Row[];
      },
      async run(sql, params = []) {
        const result = await pool.query(toPg(sql), params);
        return { changes: result.rowCount ?? 0 };
      },
      async exec(sql) {
        await pool.query(sql);
      },
    };
  }

  const imported = (await import("node:sqlite")) as {
    DatabaseSync: new (filename: string) => {
      exec(sql: string): void;
      prepare(sql: string): {
        all(...params: unknown[]): Row[];
        run(...params: unknown[]): { changes: number };
      };
    };
  };
  const file = sqliteFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new imported.DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  return {
    async all(sql, params = []) {
      return db.prepare(sql).all(...params);
    },
    async run(sql, params = []) {
      const info = db.prepare(sql).run(...params);
      return { changes: Number(info?.changes ?? 0) };
    },
    async exec(sql) {
      db.exec(sql);
    },
  };
}

async function runner() {
  if (!runnerPromise) runnerPromise = createRunner();
  return runnerPromise;
}

export async function all<T = Row>(sql: string, params: unknown[] = []) {
  return (await runner()).all(sql, params) as Promise<T[]>;
}

export async function one<T = Row>(sql: string, params: unknown[] = []) {
  const rows = await all<T>(sql, params);
  return rows[0];
}

export async function run(sql: string, params: unknown[] = []) {
  return (await runner()).run(sql, params);
}

export async function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const db = await runner();
      for (const statement of SCHEMA) {
        await db.exec(statement);
      }
      for (const statement of ALTERS) {
        try {
          await db.exec(statement);
        } catch {
          // Column already exists on databases created with the current schema.
        }
      }
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty();
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}

export async function wipe() {
  await ready();
  for (const table of TABLES) {
    await run(`DELETE FROM ${table}`);
  }
}

export function isUniqueError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return code === "23505" || /unique|duplicate key/i.test(message);
}
