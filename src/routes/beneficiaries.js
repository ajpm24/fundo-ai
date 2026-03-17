const express = require('express')
const db = require('../db/database')
const router = express.Router()

// GET /api/beneficiaries — list with filters + pagination
router.get('/', (req, res) => {
  try {
    const { search, region, sector, source, year, grant_id, limit = 50, offset = 0, sort = 'recent' } = req.query

    let sql = `SELECT b.*, g.title as matched_grant_title, g.category as grant_category,
                      g.funding_type, g.source as grant_source
               FROM beneficiaries b
               LEFT JOIN grants g ON b.grant_id = g.id
               WHERE 1=1`
    const params = []

    if (search) {
      sql += ` AND (LOWER(b.company_name) LIKE LOWER(?) OR LOWER(b.project_title) LIKE LOWER(?) OR LOWER(b.grant_title) LIKE LOWER(?))`
      const s = `%${search}%`
      params.push(s, s, s)
    }
    if (region && region !== 'todas') {
      sql += ` AND LOWER(b.region) = LOWER(?)`
      params.push(region)
    }
    if (sector) {
      sql += ` AND LOWER(b.sector) LIKE LOWER(?)`
      params.push(`%${sector}%`)
    }
    if (source) {
      sql += ` AND LOWER(b.source) LIKE LOWER(?)`
      params.push(`%${source}%`)
    }
    if (year) {
      sql += ` AND b.approval_year = ?`
      params.push(Number(year))
    }
    if (grant_id) {
      sql += ` AND b.grant_id = ?`
      params.push(Number(grant_id))
    }

    // Count total
    const countSql = sql.replace(/^SELECT b\.\*.*FROM/, 'SELECT COUNT(*) as total FROM')
    const total = db.prepare(countSql).get(...params)?.total ?? 0

    // Sort
    const sortMap = {
      recent: 'b.approval_year DESC, b.company_name ASC',
      amount_desc: 'b.amount_approved DESC',
      amount_asc: 'b.amount_approved ASC',
      company: 'b.company_name ASC',
    }
    sql += ` ORDER BY ${sortMap[sort] || sortMap.recent}`
    sql += ` LIMIT ? OFFSET ?`
    params.push(Number(limit), Number(offset))

    const rows = db.prepare(sql).all(...params)

    // Stats
    const statsSql = `SELECT
      COUNT(*) as total_records,
      COUNT(DISTINCT b.company_name) as unique_companies,
      SUM(b.amount_approved) as total_amount,
      MAX(b.approval_year) as latest_year,
      MIN(b.approval_year) as earliest_year
    FROM beneficiaries b LEFT JOIN grants g ON b.grant_id = g.id WHERE 1=1`
    const stats = db.prepare(statsSql).get()

    res.json({ beneficiaries: rows, total, stats, page: Math.floor(Number(offset) / Number(limit)) + 1, limit: Number(limit) })
  } catch (err) {
    console.error('Beneficiaries error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/beneficiaries/timeline — month-by-month summary of approvals
router.get('/timeline', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        CASE
          WHEN approval_date IS NOT NULL THEN strftime('%Y-%m', approval_date)
          ELSE approval_year || '-01'
        END as month,
        COUNT(*) as count,
        SUM(amount_approved) as total_amount,
        COUNT(DISTINCT source) as sources
      FROM beneficiaries
      GROUP BY month
      ORDER BY month DESC
      LIMIT 24
    `).all()
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/beneficiaries/recent — most recent decisions, grouped by grant
router.get('/recent', (req, res) => {
  try {
    const { limit = 100 } = req.query

    const rows = db.prepare(`
      SELECT b.*, g.category as grant_category, g.funding_type, g.cofinancing_rate,
             g.region as grant_region
      FROM beneficiaries b
      LEFT JOIN grants g ON b.grant_id = g.id
      ORDER BY b.approval_year DESC, b.amount_approved DESC
      LIMIT ?
    `).all(Number(limit))

    // Group by grant_title
    const byGrant = {}
    for (const row of rows) {
      const key = row.grant_title
      if (!byGrant[key]) {
        byGrant[key] = {
          grant_title: row.grant_title,
          grant_id: row.grant_id,
          grant_category: row.grant_category,
          funding_type: row.funding_type,
          cofinancing_rate: row.cofinancing_rate,
          source: row.source,
          source_url: row.source_url,
          latest_year: row.approval_year,
          total_approved: 0,
          count: 0,
          beneficiaries: []
        }
      }
      byGrant[key].total_approved += row.amount_approved || 0
      byGrant[key].count++
      if (row.approval_year > byGrant[key].latest_year) byGrant[key].latest_year = row.approval_year
      byGrant[key].beneficiaries.push(row)
    }

    const grants = Object.values(byGrant).sort((a, b) => b.latest_year - a.latest_year || b.total_approved - a.total_approved)

    res.json({ grants, total_beneficiaries: rows.length })
  } catch (err) {
    console.error('Recent beneficiaries error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/beneficiaries/stats — aggregated statistics
router.get('/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as c FROM beneficiaries').get().c
    const totalAmount = db.prepare('SELECT SUM(amount_approved) as s FROM beneficiaries').get().s || 0
    const byYear = db.prepare('SELECT approval_year as year, COUNT(*) as count, SUM(amount_approved) as amount FROM beneficiaries GROUP BY approval_year ORDER BY approval_year DESC').all()
    const byRegion = db.prepare('SELECT region, COUNT(*) as count, SUM(amount_approved) as amount FROM beneficiaries GROUP BY region ORDER BY count DESC').all()
    const bySector = db.prepare('SELECT sector, COUNT(*) as count, SUM(amount_approved) as amount FROM beneficiaries WHERE sector IS NOT NULL GROUP BY sector ORDER BY count DESC LIMIT 15').all()
    const bySource = db.prepare('SELECT source, COUNT(*) as count, SUM(amount_approved) as amount FROM beneficiaries GROUP BY source ORDER BY count DESC').all()
    const topAmounts = db.prepare('SELECT company_name, grant_title, amount_approved, approval_year, region, sector FROM beneficiaries WHERE amount_approved IS NOT NULL ORDER BY amount_approved DESC LIMIT 10').all()

    res.json({ total, total_amount: totalAmount, by_year: byYear, by_region: byRegion, by_sector: bySector, by_source: bySource, top_amounts: topAmounts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/beneficiaries/grant/:grantId — all beneficiaries for a grant
router.get('/grant/:grantId', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM beneficiaries WHERE grant_id = ?
      ORDER BY approval_year DESC, amount_approved DESC
    `).all(Number(req.params.grantId))
    const total = db.prepare('SELECT SUM(amount_approved) as s FROM beneficiaries WHERE grant_id = ?').get(Number(req.params.grantId))
    res.json({ beneficiaries: rows, count: rows.length, total_amount: total?.s || 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
