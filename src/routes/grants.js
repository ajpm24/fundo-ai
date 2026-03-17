const express = require('express')
const db = require('../db/database')
const router = express.Router()

// Auto-update call_status based on deadline
function computeCallStatus(grant) {
  if (!grant.deadline) return grant.call_status || 'open'
  const now = new Date()
  const deadline = new Date(grant.deadline)
  if (deadline < now) return 'closed'
  const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24)
  if (daysLeft > 365) return 'upcoming'
  return 'open'
}

// Predict next open from history
function predictNextOpen(grant) {
  if (grant.expected_next_open) return grant.expected_next_open
  if (!grant.history_years) return null
  const years = tryParse(grant.history_years)
  if (!years || years.length < 2) return null
  const sorted = years.slice().sort()
  const gaps = []
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1])
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const lastYear = sorted[sorted.length - 1]
  const predicted = Math.round(lastYear + avgGap)
  return `${predicted}-01-01`
}

// Calculate estimated funding
function estimateFunding(grant, projectBudget) {
  if (!projectBudget) return null
  const rate = (grant.funding_rate || grant.cofinancing_rate || 70) / 100
  const estimated = projectBudget * rate
  if (grant.max_amount) return Math.min(estimated, grant.max_amount)
  return estimated
}

router.get('/', (req, res) => {
  const {
    search, source, funding_type, region, category, size,
    min_amount, max_amount, active, sort,
    trl, entity_type, country, min_funding_rate, call_status, open_only,
    project_budget, limit, offset
  } = req.query

  // Auto-refresh call_status in DB
  db.prepare(`
    UPDATE grants SET call_status = CASE
      WHEN deadline IS NOT NULL AND deadline < datetime('now') THEN 'closed'
      WHEN deadline IS NOT NULL AND julianday(deadline) - julianday('now') > 365 THEN 'upcoming'
      ELSE 'open'
    END WHERE is_active = 1
  `).run()

  let sql = 'SELECT * FROM grants WHERE 1=1'
  const params = []

  if (active !== undefined) { sql += ' AND is_active = ?'; params.push(Number(active)) }
  if (open_only === 'true') { sql += ' AND call_status != ?'; params.push('closed') }
  if (call_status) { sql += ' AND call_status = ?'; params.push(call_status) }
  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ? OR source LIKE ? OR category LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (source) { sql += ' AND source LIKE ?'; params.push(`%${source}%`) }
  if (funding_type) { sql += ' AND LOWER(COALESCE(funding_type,\'\')) = LOWER(?)'; params.push(funding_type) }
  if (region && region !== 'todas') { sql += ' AND (LOWER(region) = LOWER(?) OR region = "todas" OR region = "nacional")'; params.push(region) }
  if (category) { sql += ' AND LOWER(COALESCE(category,\'\')) = LOWER(?)'; params.push(category) }
  if (size) { sql += ' AND (eligible_sizes LIKE ? OR eligible_sizes LIKE ?)'; params.push(`%${size}%`, '%todos%') }
  if (min_amount) { sql += ' AND (max_amount IS NULL OR max_amount >= ?)'; params.push(Number(min_amount)) }
  if (max_amount) { sql += ' AND (max_amount IS NULL OR max_amount <= ?)'; params.push(Number(max_amount)) }
  if (trl) { sql += ' AND (trl_min IS NULL OR trl_min <= ?) AND (trl_max IS NULL OR trl_max >= ?)'; params.push(Number(trl), Number(trl)) }
  if (entity_type) { sql += ' AND (eligible_entities IS NULL OR eligible_entities LIKE ? OR eligible_entities LIKE ?)'; params.push(`%${entity_type}%`, '%todos%') }
  if (country) { sql += ' AND (eligible_countries IS NULL OR eligible_countries LIKE ? OR eligible_countries LIKE ?)'; params.push(`%${country}%`, '%todas%') }
  if (min_funding_rate) { sql += ' AND (funding_rate >= ? OR cofinancing_rate >= ?)'; params.push(Number(min_funding_rate), Number(min_funding_rate)) }

  const sortMap = {
    relevance: 'ai_relevance_score DESC, deadline ASC',
    deadline: 'CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC',
    amount_desc: 'max_amount DESC',
    amount_asc: 'max_amount ASC',
    funding_rate: 'COALESCE(funding_rate, cofinancing_rate) DESC',
    title: 'title ASC'
  }
  // Total count for pagination (before ORDER BY and LIMIT)
  const countSql = sql.replace(/^SELECT \*/, 'SELECT COUNT(*) as total')
  const total = db.prepare(countSql).get(...params)?.total ?? 0

  sql += ` ORDER BY ${sortMap[sort] || 'ai_relevance_score DESC, deadline ASC'}`

  // Pagination
  const pageLimit = limit ? Math.min(Number(limit), 200) : null
  const pageOffset = offset ? Number(offset) : 0
  if (pageLimit) {
    sql += ` LIMIT ? OFFSET ?`
    params.push(pageLimit, pageOffset)
  }

  const grants = db.prepare(sql).all(...params)
  const mapped = grants.map(g => {
    const status = computeCallStatus(g)
    const nextOpen = predictNextOpen(g)
    const estimated = project_budget ? estimateFunding(g, Number(project_budget)) : null
    return {
      ...g,
      eligible_sectors: tryParse(g.eligible_sectors),
      eligible_sizes: tryParse(g.eligible_sizes),
      eligible_entities: tryParse(g.eligible_entities),
      eligible_countries: tryParse(g.eligible_countries),
      history_years: tryParse(g.history_years),
      call_status: status,
      predicted_next_open: nextOpen,
      estimated_funding: estimated,
      effective_funding_rate: g.funding_rate || g.cofinancing_rate
    }
  })

  if (pageLimit) {
    res.json({ grants: mapped, total, page: Math.floor(pageOffset / pageLimit) + 1, limit: pageLimit })
  } else {
    res.json(mapped)
  }
})

router.get('/meta', (req, res) => {
  const sources = db.prepare("SELECT DISTINCT source FROM grants WHERE source IS NOT NULL ORDER BY source").all().map(r => r.source)
  const categories = db.prepare("SELECT DISTINCT category FROM grants WHERE category IS NOT NULL ORDER BY category").all().map(r => r.category)
  const funding_types = db.prepare("SELECT DISTINCT funding_type FROM grants WHERE funding_type IS NOT NULL ORDER BY funding_type").all().map(r => r.funding_type)
  res.json({ sources, categories, funding_types })
})

router.get('/:id', (req, res) => {
  const grant = db.prepare('SELECT * FROM grants WHERE id = ?').get(req.params.id)
  if (!grant) return res.status(404).json({ error: 'Not found' })
  const status = computeCallStatus(grant)
  const nextOpen = predictNextOpen(grant)
  res.json({
    ...grant,
    eligible_sectors: tryParse(grant.eligible_sectors),
    eligible_sizes: tryParse(grant.eligible_sizes),
    eligible_entities: tryParse(grant.eligible_entities),
    eligible_countries: tryParse(grant.eligible_countries),
    history_years: tryParse(grant.history_years),
    call_status: status,
    predicted_next_open: nextOpen,
    effective_funding_rate: grant.funding_rate || grant.cofinancing_rate
  })
})

router.post('/', (req, res) => {
  const {
    title, source, description, max_amount, min_amount, deadline,
    eligible_sectors, eligible_sizes, eligible_entities, eligible_countries,
    url, funding_type, funding_rate, region, category, cofinancing_rate,
    trl_min, trl_max, consortium_required, call_status, expected_next_open, history_years
  } = req.body
  const result = db.prepare(`
    INSERT INTO grants (title, source, description, max_amount, min_amount, deadline,
      eligible_sectors, eligible_sizes, eligible_entities, eligible_countries,
      url, funding_type, funding_rate, region, category, cofinancing_rate,
      trl_min, trl_max, consortium_required, call_status, expected_next_open, history_years)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, source, description, max_amount, min_amount, deadline,
    JSON.stringify(eligible_sectors || []), JSON.stringify(eligible_sizes || []),
    JSON.stringify(eligible_entities || []), JSON.stringify(eligible_countries || []),
    url, funding_type, funding_rate, region, category, cofinancing_rate,
    trl_min, trl_max, consortium_required ? 1 : 0,
    call_status || 'open', expected_next_open,
    JSON.stringify(history_years || []))
  res.json({ id: result.lastInsertRowid })
})

router.put('/:id', (req, res) => {
  const {
    title, source, description, max_amount, min_amount, deadline,
    eligible_sectors, eligible_sizes, eligible_entities, eligible_countries,
    url, is_active, funding_type, funding_rate, region, category, cofinancing_rate,
    trl_min, trl_max, consortium_required, call_status, expected_next_open, history_years
  } = req.body
  db.prepare(`
    UPDATE grants SET title=?, source=?, description=?, max_amount=?, min_amount=?, deadline=?,
      eligible_sectors=?, eligible_sizes=?, eligible_entities=?, eligible_countries=?,
      url=?, is_active=?, funding_type=?, funding_rate=?, region=?, category=?, cofinancing_rate=?,
      trl_min=?, trl_max=?, consortium_required=?, call_status=?, expected_next_open=?, history_years=?,
      updated_at=datetime('now')
    WHERE id=?
  `).run(title, source, description, max_amount, min_amount, deadline,
    JSON.stringify(eligible_sectors || []), JSON.stringify(eligible_sizes || []),
    JSON.stringify(eligible_entities || []), JSON.stringify(eligible_countries || []),
    url, is_active ?? 1, funding_type, funding_rate, region, category, cofinancing_rate,
    trl_min, trl_max, consortium_required ? 1 : 0,
    call_status || 'open', expected_next_open,
    JSON.stringify(history_years || []),
    req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM grants WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// Funding estimation endpoint
router.post('/:id/estimate', (req, res) => {
  const { project_budget } = req.body
  const grant = db.prepare('SELECT * FROM grants WHERE id = ?').get(req.params.id)
  if (!grant) return res.status(404).json({ error: 'Not found' })
  if (!project_budget) return res.status(400).json({ error: 'project_budget required' })

  const rate = (grant.funding_rate || grant.cofinancing_rate || 70) / 100
  const gross = Number(project_budget) * rate
  const capped = grant.max_amount ? Math.min(gross, grant.max_amount) : gross
  const minGrant = grant.min_amount || 0

  res.json({
    project_budget: Number(project_budget),
    funding_rate: grant.funding_rate || grant.cofinancing_rate || 70,
    gross_funding: Math.round(gross),
    estimated_funding: Math.round(capped),
    eligible: capped >= minGrant,
    min_grant: minGrant,
    max_grant: grant.max_amount,
    own_contribution: Math.round(Number(project_budget) - capped)
  })
})

// Notify me subscription
router.post('/:id/notify', (req, res) => {
  const { email, label } = req.body
  const grant = db.prepare('SELECT id, title FROM grants WHERE id = ?').get(req.params.id)
  if (!grant) return res.status(404).json({ error: 'Not found' })
  try {
    db.prepare(`
      INSERT OR REPLACE INTO notification_subscriptions (grant_id, email, label)
      VALUES (?, ?, ?)
    `).run(req.params.id, email || 'dashboard', label || grant.title)
    res.json({ ok: true, message: 'Notificação ativada' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id/notify', (req, res) => {
  const subs = db.prepare('SELECT * FROM notification_subscriptions WHERE grant_id = ?').all(req.params.id)
  res.json(subs)
})

function tryParse(val) {
  try { return val ? JSON.parse(val) : [] } catch { return [] }
}

module.exports = router
