const express = require('express')
const db = require('../db/database')
const router = express.Router()

router.get('/', (req, res) => {
  const { sector, size, min_amount, max_amount, active, search } = req.query
  let sql = 'SELECT * FROM grants WHERE 1=1'
  const params = []

  if (active !== undefined) { sql += ' AND is_active = ?'; params.push(Number(active)) }
  if (search) { sql += ' AND (title LIKE ? OR description LIKE ? OR source LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  if (min_amount) { sql += ' AND max_amount >= ?'; params.push(Number(min_amount)) }
  if (max_amount) { sql += ' AND max_amount <= ?'; params.push(Number(max_amount)) }
  sql += ' ORDER BY ai_relevance_score DESC, deadline ASC'

  const grants = db.prepare(sql).all(...params)
  res.json(grants.map(g => ({
    ...g,
    eligible_sectors: tryParse(g.eligible_sectors),
    eligible_sizes: tryParse(g.eligible_sizes)
  })))
})

router.get('/:id', (req, res) => {
  const grant = db.prepare('SELECT * FROM grants WHERE id = ?').get(req.params.id)
  if (!grant) return res.status(404).json({ error: 'Not found' })
  res.json({ ...grant, eligible_sectors: tryParse(grant.eligible_sectors), eligible_sizes: tryParse(grant.eligible_sizes) })
})

router.post('/', (req, res) => {
  const { title, source, description, max_amount, deadline, eligible_sectors, eligible_sizes, url } = req.body
  const result = db.prepare(`
    INSERT INTO grants (title, source, description, max_amount, deadline, eligible_sectors, eligible_sizes, url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, source, description, max_amount, deadline,
    JSON.stringify(eligible_sectors || []), JSON.stringify(eligible_sizes || []), url)
  res.json({ id: result.lastInsertRowid })
})

router.put('/:id', (req, res) => {
  const { title, source, description, max_amount, deadline, eligible_sectors, eligible_sizes, url, is_active } = req.body
  db.prepare(`
    UPDATE grants SET title=?, source=?, description=?, max_amount=?, deadline=?, eligible_sectors=?, eligible_sizes=?, url=?, is_active=?, updated_at=datetime('now')
    WHERE id=?
  `).run(title, source, description, max_amount, deadline,
    JSON.stringify(eligible_sectors || []), JSON.stringify(eligible_sizes || []), url, is_active ?? 1, req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM grants WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

function tryParse(val) {
  try { return JSON.parse(val) } catch { return [] }
}

module.exports = router
