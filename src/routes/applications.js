const express = require('express')
const db = require('../db/database')
const router = express.Router()

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, g.title as grant_title, g.source as grant_source, g.max_amount, g.deadline, g.url as grant_url
    FROM applications a
    LEFT JOIN grants g ON a.grant_id = g.id
    ORDER BY a.updated_at DESC
  `).all()
  res.json(rows.map(r => ({ ...r, draft_content: tryParse(r.draft_content) })))
})

router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT a.*, g.title as grant_title, g.source as grant_source, g.max_amount, g.deadline, g.description as grant_description, g.url as grant_url
    FROM applications a
    LEFT JOIN grants g ON a.grant_id = g.id
    WHERE a.id = ?
  `).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json({ ...row, draft_content: tryParse(row.draft_content) })
})

router.post('/', (req, res) => {
  const { grant_id, notes, draft_content, deadline_reminder } = req.body
  const existing = db.prepare('SELECT id FROM applications WHERE grant_id = ? AND status != ?').get(grant_id, 'rejeitada')
  if (existing) return res.status(409).json({ error: 'Já existe uma candidatura para este fundo', existing_id: existing.id })

  const result = db.prepare(`
    INSERT INTO applications (grant_id, notes, draft_content, deadline_reminder)
    VALUES (?, ?, ?, ?)
  `).run(grant_id, notes || '', JSON.stringify(draft_content || {}), deadline_reminder || null)
  res.json({ id: result.lastInsertRowid })
})

router.put('/:id', (req, res) => {
  const { status, notes, draft_content, submitted_at, deadline_reminder } = req.body
  db.prepare(`
    UPDATE applications SET status=?, notes=?, draft_content=?, submitted_at=?, deadline_reminder=?, updated_at=datetime('now')
    WHERE id=?
  `).run(status, notes, JSON.stringify(draft_content || {}), submitted_at || null, deadline_reminder || null, req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

function tryParse(val) {
  try { return val ? JSON.parse(val) : {} } catch { return {} }
}

module.exports = router
