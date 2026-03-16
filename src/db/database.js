const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/fundo.db')

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
    deadline TEXT,
    eligible_sectors TEXT,
    eligible_sizes TEXT,
    url TEXT,
    is_active INTEGER DEFAULT 1,
    ai_relevance_score REAL,
    ai_relevance_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grant_id INTEGER REFERENCES grants(id),
    status TEXT DEFAULT 'rascunho',
    notes TEXT,
    draft_content TEXT,
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
`)

module.exports = db
