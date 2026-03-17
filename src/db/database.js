const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

// Always resolve DB_PATH relative to the project root (not the process CWD)
const PROJECT_ROOT = path.join(__dirname, '../../')
const DB_PATH = process.env.DB_PATH
  ? path.resolve(PROJECT_ROOT, process.env.DB_PATH)
  : path.join(PROJECT_ROOT, 'data/fundo.db')

// Ensure data dir exists
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name TEXT,
    sector TEXT,
    size TEXT,
    location TEXT,
    description TEXT,
    website TEXT,
    nif TEXT,
    stage TEXT,
    founded_year INTEGER,
    employees INTEGER,
    annual_revenue REAL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source TEXT,
    description TEXT,
    max_amount REAL,
    min_amount REAL,
    deadline TEXT,
    eligible_sectors TEXT,
    eligible_sizes TEXT,
    eligible_entities TEXT,
    eligible_countries TEXT,
    url TEXT,
    is_active INTEGER DEFAULT 1,
    call_status TEXT DEFAULT 'open',
    expected_next_open TEXT,
    ai_relevance_score REAL,
    ai_relevance_reason TEXT,
    funding_type TEXT,
    funding_rate INTEGER,
    region TEXT,
    category TEXT,
    cofinancing_rate INTEGER,
    trl_min INTEGER,
    trl_max INTEGER,
    consortium_required INTEGER DEFAULT 0,
    history_years TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grant_id INTEGER REFERENCES grants(id),
    status TEXT DEFAULT 'rascunho',
    notes TEXT,
    draft_content TEXT,
    project_budget REAL,
    estimated_funding REAL,
    submitted_at TEXT,
    deadline_reminder TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    message TEXT,
    grant_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    sector TEXT,
    location TEXT,
    budget REAL,
    trl INTEGER,
    entity_type TEXT,
    countries TEXT,
    consortium INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grant_id INTEGER REFERENCES grants(id),
    email TEXT,
    label TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(grant_id, email)
  );

  CREATE TABLE IF NOT EXISTS beneficiaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grant_id INTEGER REFERENCES grants(id),
    grant_title TEXT,
    company_name TEXT NOT NULL,
    nif TEXT,
    amount_approved REAL,
    approval_year INTEGER,
    approval_date TEXT,
    project_title TEXT,
    region TEXT,
    sector TEXT,
    source TEXT,
    source_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_beneficiaries_grant ON beneficiaries(grant_id);
  CREATE INDEX IF NOT EXISTS idx_beneficiaries_year ON beneficiaries(approval_year);
  CREATE INDEX IF NOT EXISTS idx_beneficiaries_region ON beneficiaries(region);
`)

// Migrations: add new columns to existing DB without data loss
const runMigration = (sql) => { try { db.exec(sql) } catch (e) { /* column already exists */ } }
runMigration('ALTER TABLE grants ADD COLUMN eligible_entities TEXT')
runMigration('ALTER TABLE grants ADD COLUMN eligible_countries TEXT')
runMigration('ALTER TABLE grants ADD COLUMN call_status TEXT DEFAULT \'open\'')
runMigration('ALTER TABLE grants ADD COLUMN expected_next_open TEXT')
runMigration('ALTER TABLE grants ADD COLUMN funding_rate INTEGER')
runMigration('ALTER TABLE grants ADD COLUMN trl_min INTEGER')
runMigration('ALTER TABLE grants ADD COLUMN trl_max INTEGER')
runMigration('ALTER TABLE grants ADD COLUMN consortium_required INTEGER DEFAULT 0')
runMigration('ALTER TABLE grants ADD COLUMN history_years TEXT')
runMigration('ALTER TABLE grants ADD COLUMN cofinancing_rate INTEGER')
runMigration('ALTER TABLE grants ADD COLUMN min_amount REAL')
runMigration('ALTER TABLE grants ADD COLUMN funding_type TEXT')
runMigration('ALTER TABLE grants ADD COLUMN region TEXT')
runMigration('ALTER TABLE grants ADD COLUMN category TEXT')
runMigration('ALTER TABLE applications ADD COLUMN project_budget REAL')
runMigration('ALTER TABLE applications ADD COLUMN estimated_funding REAL')
runMigration('ALTER TABLE beneficiaries ADD COLUMN approval_date TEXT')

module.exports = db
