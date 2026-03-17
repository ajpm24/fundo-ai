const express = require('express')
const db = require('../db/database')
const router = express.Router()

router.get('/', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all()
  res.json(projects.map(p => ({ ...p, countries: tryParse(p.countries) })))
})

router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json({ ...p, countries: tryParse(p.countries) })
})

router.post('/', (req, res) => {
  const { name, description, sector, location, budget, trl, entity_type, countries, consortium } = req.body
  const result = db.prepare(`
    INSERT INTO projects (name, description, sector, location, budget, trl, entity_type, countries, consortium)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, description, sector, location, budget, trl, entity_type,
    JSON.stringify(countries || []), consortium ? 1 : 0)
  res.json({ id: result.lastInsertRowid })
})

router.put('/:id', (req, res) => {
  const { name, description, sector, location, budget, trl, entity_type, countries, consortium } = req.body
  db.prepare(`
    UPDATE projects SET name=?, description=?, sector=?, location=?, budget=?, trl=?, entity_type=?, countries=?, consortium=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, description, sector, location, budget, trl, entity_type,
    JSON.stringify(countries || []), consortium ? 1 : 0, req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// Estimate funding for a project against all matching grants
router.get('/:id/estimate', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'Not found' })

  const grants = db.prepare("SELECT * FROM grants WHERE is_active = 1 AND call_status != 'closed'").all()
  const results = grants.map(g => {
    const rate = (g.funding_rate || g.cofinancing_rate || 0) / 100
    const gross = (project.budget || 0) * rate
    const capped = g.max_amount ? Math.min(gross, g.max_amount) : gross
    return {
      grant_id: g.id,
      grant_title: g.title,
      source: g.source,
      funding_rate: g.funding_rate || g.cofinancing_rate,
      estimated_funding: Math.round(capped),
      max_amount: g.max_amount,
      deadline: g.deadline,
      call_status: g.call_status
    }
  }).filter(r => r.estimated_funding > 0).sort((a, b) => b.estimated_funding - a.estimated_funding)

  res.json({
    project_budget: project.budget,
    top_opportunities: results.slice(0, 10),
    total_potential: results.reduce((sum, r) => sum + r.estimated_funding, 0)
  })
})

function tryParse(val) {
  try { return val ? JSON.parse(val) : [] } catch { return [] }
}

module.exports = router
