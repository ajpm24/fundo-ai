const express = require('express')
const db = require('../db/database')
const router = express.Router()

router.get('/', (req, res) => {
  const alerts = db.prepare(`
    SELECT a.*, g.title as grant_title FROM alerts a
    LEFT JOIN grants g ON a.grant_id = g.id
    ORDER BY a.created_at DESC
    LIMIT 50
  `).all()
  res.json(alerts)
})

router.get('/unread-count', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE is_read = 0').get()
  res.json({ count })
})

router.put('/:id/read', (req, res) => {
  db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.put('/read-all', (req, res) => {
  db.prepare('UPDATE alerts SET is_read = 1').run()
  res.json({ ok: true })
})

module.exports = router
