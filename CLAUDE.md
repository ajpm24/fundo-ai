# CLAUDE.md — FundoAI

## Project Overview

FundoAI is an AI-powered grant finder and application manager for Portuguese startups and SMEs (PMEs). It helps users discover, match, and apply for Portuguese and EU funding opportunities using Claude AI for intelligent matching and draft assistance.

## Tech Stack

- **Backend:** Node.js + Express.js (pure JavaScript, no TypeScript)
- **Frontend:** React 18 + React Router 6 + Vite 5
- **Database:** SQLite 3 via better-sqlite3 (WAL mode, foreign keys)
- **AI:** Anthropic SDK (@anthropic-ai/sdk) — Claude API
- **Deployment:** Railway.app (Nixpacks builder)
- **Styling:** Vanilla CSS with CSS variables (dark theme)

## Repository Structure

```
/
├── src/                          # Backend (Express)
│   ├── server.js                 # Entry point (port 3333)
│   ├── db/
│   │   ├── database.js           # Schema, migrations, initialization
│   │   ├── seed.js               # 1260+ grants seed data
│   │   ├── seedBeneficiaries.js  # 195 sample beneficiaries
│   │   └── grants-export.json    # JSON export of all grants
│   ├── routes/                   # Express routers
│   │   ├── grants.js             # Grant search, filtering, pagination
│   │   ├── profile.js            # Company profile CRUD
│   │   ├── applications.js       # Application management
│   │   ├── alerts.js             # Deadline/relevance alerts
│   │   ├── projects.js           # Project definitions
│   │   ├── beneficiaries.js      # Past grant recipients
│   │   └── ai.js                 # Anthropic AI integration
│   └── jobs/                     # Background/scheduled jobs
│       ├── crawler.js            # EU Funding Portal scraper
│       ├── beneficiaryScraper.js # EU Kohesio API importer (53k+ records)
│       ├── recentDecisionsScraper.js  # DRE, Compete2030, PT2030
│       └── alertChecker.js       # Deadline/relevance alert generation
├── client/                       # Frontend (React + Vite)
│   ├── src/
│   │   ├── main.jsx              # Router setup
│   │   ├── App.jsx               # Route definitions
│   │   ├── index.css             # Design system (dark theme)
│   │   ├── components/           # Navbar, GrantCard, StatusBadge
│   │   └── pages/                # 11 page components
│   └── vite.config.js            # Dev proxy to backend :3333
├── railway.json                  # Railway deployment config
├── .env.example                  # Environment variable template
└── package.json                  # Root scripts and dependencies
```

## Development Setup

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Copy environment template
cp .env.example .env
# Set ANTHROPIC_API_KEY in .env

# Run backend (port 3333)
npm run dev

# Run frontend (port 5173, proxies /api → localhost:3333)
cd client && npm run dev
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend server (port 3333) |
| `npm run build` | Build frontend to /public |
| `npm start` | Production start (build + serve) |
| `cd client && npm run dev` | Start Vite dev server (port 5173) |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Required. Claude API key for AI features |
| `PORT` | Server port (default: 3333) |
| `DB_PATH` | SQLite database path (default: `./data/fundo.db`) |

## Database

SQLite with better-sqlite3. Schema is defined and migrated in `src/db/database.js`. No ORM — raw SQL with prepared statements.

**Tables:** `profile`, `grants`, `applications`, `alerts`, `projects`, `beneficiaries`, `notification_subscriptions`

**Key grant enums:**
- `funding_type`: fundo_perdido, reembolsavel, misto, equity, garantia, voucher, emprestimo
- `region`: todas, nacional, norte, centro, ams, alentejo, algarve, acores, madeira
- `category`: inovacao, digitalizacao, internacionalizacao, ambiente, energia, social, formacao, investigacao, agro, maritimo, turismo, cultura, emprego, saude, espacial
- `call_status`: open, closed, upcoming

**Conventions:**
- Use prepared statements (`db.prepare(...)`) for all queries — never interpolate user input
- JSON fields are stored as TEXT and parsed with `tryParse()` utility
- Timestamps use `datetime('now')` for created_at/updated_at
- Batch operations use transactions (`db.transaction(...)`)

## API Routes

All routes are prefixed with `/api`:

| Prefix | File | Description |
|--------|------|-------------|
| `/api/grants` | `routes/grants.js` | Search, filter, paginate grants |
| `/api/profile` | `routes/profile.js` | Single company profile GET/PUT |
| `/api/applications` | `routes/applications.js` | Application CRUD + drafts |
| `/api/alerts` | `routes/alerts.js` | Alert listing, read/unread |
| `/api/projects` | `routes/projects.js` | Project definitions CRUD |
| `/api/beneficiaries` | `routes/beneficiaries.js` | Past recipients + timeline |
| `/api/ai` | `routes/ai.js` | AI matching, analysis, drafts |
| `/api/health` | `server.js` | Health check endpoint |

## Frontend Architecture

- **SPA** with React Router — all routes defined in `App.jsx`
- **No state management library** — local useState per component
- **No fetch wrapper** — raw `fetch()` calls to `/api/*`
- **Dark theme** with CSS variables defined in `index.css`
- **All UI text is in Portuguese**
- **Fixed sidebar** navigation (Navbar component, 220px wide)

**Pages:** Landing, Dashboard, GrantSearch, GrantDetail, Applications, ApplicationDetail, Profile, Alerts, Projects, QuickMatch, Beneficiaries

## AI Integration

AI features use the Anthropic SDK in `routes/ai.js`:

- **QuickMatch:** 3-step flow — analyze website/NIF → extract profile → match grants
- **Grant Analysis:** Detailed AI evaluation of a specific grant for the user's profile
- **Draft Help:** AI-assisted application draft writing

**Error handling:** Custom parsing for Anthropic errors (NO_CREDITS, INVALID_KEY, OVERLOADED, RATE_LIMIT) with Portuguese user-facing messages.

## Background Jobs

Scheduled via `node-cron` in `server.js`:

- **Startup:** Seed grants, seed beneficiaries, run scrapers
- **Every 24h:** Recent decisions scraper, alert checker
- **On-demand:** Manual crawler/scraper triggers via API

## Code Conventions

- **Pure JavaScript** — no TypeScript, no JSX type annotations
- **No testing framework** — no jest, vitest, or test files
- **No linter config** — no ESLint or Prettier configuration
- **Express routers** — one file per domain in `src/routes/`
- **Prepared statements** — all SQL uses parameterized queries
- **Portuguese content** — UI text, error messages, grant data all in Portuguese
- **Error responses** return `{ error: "message" }` JSON
- **Success responses** return the entity or `{ success: true }`

## Deployment

Deployed on Railway.app:
- Builder: Nixpacks
- Start: `npm run build && node src/server.js`
- Health check: `/api/health`
- Restart policy: ON_FAILURE (max 3 retries)
- Frontend built to `/public`, served as static files by Express
