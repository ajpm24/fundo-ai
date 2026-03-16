const express = require('express')
const db = require('../db/database')
const router = express.Router()

router.get('/', (req, res) => {
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get()
  res.json(profile || {})
})

router.put('/', (req, res) => {
  const { name, sector, size, location, description, website, nif, stage, founded_year, employees, annual_revenue } = req.body
  const existing = db.prepare('SELECT id FROM profile WHERE id = 1').get()
  if (existing) {
    db.prepare(`
      UPDATE profile SET name=?, sector=?, size=?, location=?, description=?, website=?, nif=?, stage=?, founded_year=?, employees=?, annual_revenue=?, updated_at=datetime('now')
      WHERE id = 1
    `).run(name, sector, size, location, description, website, nif, stage, founded_year, employees, annual_revenue)
  } else {
    db.prepare(`
      INSERT INTO profile (id, name, sector, size, location, description, website, nif, stage, founded_year, employees, annual_revenue, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(name, sector, size, location, description, website, nif, stage, founded_year, employees, annual_revenue)
  }
  res.json({ ok: true })
})

module.exports = router
