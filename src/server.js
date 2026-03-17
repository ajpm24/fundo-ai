require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true })
const express = require('express')
const cors = require('cors')
const path = require('path')
const db = require('./db/database')
const { seedGrants } = require('./db/seed')
const { seedBeneficiaries } = require('./db/seedBeneficiaries')
const { startAlertJobs } = require('./jobs/alertChecker')

const app = express()
const PORT = process.env.PORT || 3333

app.use(cors())
app.use(express.json())

// API routes
app.use('/api/profile', require('./routes/profile'))
app.use('/api/grants', require('./routes/grants'))
app.use('/api/applications', require('./routes/applications'))
app.use('/api/alerts', require('./routes/alerts'))
app.use('/api/ai', require('./routes/ai'))
app.use('/api/projects', require('./routes/projects'))
app.use('/api/beneficiaries', require('./routes/beneficiaries'))

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }))

// Manual crawler trigger
app.post('/api/crawler/run', async (req, res) => {
  try {
    const { runCrawler } = require('./jobs/crawler')
    const result = await runCrawler()
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Manual beneficiary scraper trigger
app.post('/api/beneficiaries/scrape', async (req, res) => {
  try {
    const { runBeneficiaryScraper } = require('./jobs/beneficiaryScraper')
    const result = await runBeneficiaryScraper()
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Recent decisions scraper — fetches last N months from DRE, EU Cohesion, Compete2030, PT2030
app.post('/api/beneficiaries/scrape-recent', async (req, res) => {
  try {
    const { runRecentDecisionsScraper } = require('./jobs/recentDecisionsScraper')
    const months = Math.min(parseInt(req.body?.months || 6), 24)
    const result = await runRecentDecisionsScraper(months)
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Recent decisions endpoint — returns beneficiaries filtered by date
app.get('/api/beneficiaries/since/:months', (req, res) => {
  try {
    const months = Math.min(parseInt(req.params.months || 6), 24)
    const since = new Date(Date.now() - months * 30 * 86400000).toISOString().slice(0, 10)
    const rows = db.prepare(`
      SELECT b.*, g.category as grant_category, g.funding_type
      FROM beneficiaries b
      LEFT JOIN grants g ON b.grant_id = g.id
      WHERE (b.approval_date >= ? OR (b.approval_date IS NULL AND b.approval_year >= ?))
      ORDER BY b.approval_date DESC, b.approval_year DESC, b.amount_approved DESC
      LIMIT 200
    `).all(since, new Date().getFullYear() - Math.ceil(months / 12))
    const total_amount = rows.reduce((s, r) => s + (r.amount_approved || 0), 0)
    res.json({ beneficiaries: rows, count: rows.length, total_amount, since, months })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Serve built React app
const publicDir = path.join(__dirname, '../public')
app.use(express.static(publicDir))
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

// Seed DB and start jobs
seedGrants()
seedBeneficiaries()
startAlertJobs()
// Run beneficiary scraper on startup
const { runBeneficiaryScraper } = require('./jobs/beneficiaryScraper')
runBeneficiaryScraper().catch(() => {})
// Run recent decisions scraper on startup + every 24h
const { runRecentDecisionsScraper } = require('./jobs/recentDecisionsScraper')
runRecentDecisionsScraper(6).catch(() => {})
setInterval(() => runRecentDecisionsScraper(1).catch(() => {}), 24 * 60 * 60 * 1000)

app.listen(PORT, () => {
  console.log(`FundoAI running on http://localhost:${PORT}`)
})
