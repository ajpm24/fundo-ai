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

// POST /api/beneficiaries/import — import CSV/JSON from official portals
router.post('/import', express.json({ limit: '10mb' }), express.text({ limit: '10mb', type: 'text/plain' }), (req, res) => {
  try {
    let rows = []

    // Accept JSON array or CSV text
    if (typeof req.body === 'string') {
      rows = parseCSV(req.body)
    } else if (Array.isArray(req.body)) {
      rows = req.body
    } else if (req.body?.rows) {
      rows = req.body.rows
    } else if (req.body?.csv) {
      rows = parseCSV(req.body.csv)
    }

    if (!rows.length) return res.status(400).json({ error: 'Nenhum registo encontrado no ficheiro' })

    const findGrant = db.prepare("SELECT id FROM grants WHERE title LIKE ? LIMIT 1")
    const insert = db.prepare(`
      INSERT OR IGNORE INTO beneficiaries
        (grant_id, grant_title, company_name, nif, amount_approved, approval_year, approval_date,
         project_title, region, sector, source, source_url)
      VALUES
        (@grant_id, @grant_title, @company_name, @nif, @amount_approved, @approval_year, @approval_date,
         @project_title, @region, @sector, @source, @source_url)
    `)

    const importMany = db.transaction((items) => {
      let added = 0, skipped = 0
      for (const row of items) {
        const mapped = mapImportRow(row)
        if (!mapped?.company_name || mapped.company_name.length < 2) { skipped++; continue }
        const keyword = (mapped.grant_title || '').split(/[—–]/)[0].trim()
        const grantMatch = keyword ? findGrant.get(`%${keyword}%`) : null
        const r = insert.run({ ...mapped, grant_id: grantMatch?.id || null })
        if (r.changes > 0) added++; else skipped++
      }
      return { added, skipped }
    })

    const { added, skipped } = importMany(rows)
    const total = db.prepare('SELECT COUNT(*) as c FROM beneficiaries').get().c
    res.json({ ok: true, added, skipped, total_records: rows.length, total_in_db: total })
  } catch (err) {
    console.error('Import error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── CSV parser — handles fundos2020.pt, compete2030.pt, custom formats ────
function parseCSV(text) {
  // Detect separator
  const firstLine = text.split('\n')[0] || ''
  const sep = firstLine.includes(';') ? ';' : ','

  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  // Parse header — normalize: trim, lowercase, remove BOM/quotes
  const header = lines[0].split(sep).map(h => h.replace(/^\uFEFF/, '').replace(/^["']|["']$/g, '').trim().toLowerCase())

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i], sep)
    if (values.length < 2) continue
    const obj = {}
    header.forEach((h, idx) => { obj[h] = (values[idx] || '').replace(/^["']|["']$/g, '').trim() })
    rows.push(obj)
  }
  return rows
}

function splitCSVLine(line, sep) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === sep && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

// Map various portal column names → our schema
function mapImportRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const val = row[k] || row[k.toLowerCase()] || ''
      if (val && val !== '-' && val !== 'n.d.' && val !== 'nd') return val
    }
    return null
  }

  const parseAmount = (v) => {
    if (!v) return null
    const n = parseFloat(String(v).replace(/[€$\s]/g, '').replace(/\./g, '').replace(',', '.'))
    return isNaN(n) ? null : n
  }

  const parseYear = (v) => {
    if (!v) return null
    const m = String(v).match(/(\d{4})/)
    return m ? parseInt(m[1]) : null
  }

  const mapRegion = (v) => {
    if (!v) return null
    const s = v.toLowerCase()
    if (s.includes('norte')) return 'norte'
    if (s.includes('centro')) return 'centro'
    if (s.includes('lisboa') || s.includes('setubal') || s.includes('setúbal') || s.includes('ams') || s.includes('peninsula') || s.includes('metropolitana')) return 'ams'
    if (s.includes('alentejo')) return 'alentejo'
    if (s.includes('algarve')) return 'algarve'
    if (s.includes('açores') || s.includes('acores') || s.includes('azores')) return 'acores'
    if (s.includes('madeira')) return 'madeira'
    return v
  }

  // fundos2020.pt columns (various versions)
  const company_name =
    get('beneficiário', 'beneficiario', 'entidade beneficiária', 'entidade', 'empresa', 'designação do beneficiário', 'nome do beneficiário', 'nome beneficiário', 'nome', 'company_name', 'beneficiary') || ''

  const project_title =
    get('designação do projeto', 'designação', 'projeto', 'título do projeto', 'titulo do projeto', 'operação', 'titulo', 'título', 'project_title', 'operation') || null

  const grant_title =
    get('programa', 'fundo', 'tipologia', 'instrumento', 'programa operacional', 'grant_title', 'program') || null

  const nif =
    get('nif', 'nipc', 'número de identificação fiscal', 'numero de identificacao fiscal') || null

  const amount_approved = parseAmount(
    get('financiamento público aprovado', 'financiamento aprovado', 'incentivo aprovado', 'dotação aprovada', 'feder', 'fse', 'fc', 'fundo aprovado', 'subsídio aprovado', 'apoio aprovado', 'valor aprovado', 'montante aprovado', 'amount_approved', 'eu_funding', 'eu amount')
  )

  const dateRaw =
    get('data de aprovação', 'data aprovação', 'data inicio', 'data de início', 'data', 'approval_date', 'start_date', 'data decisão')
  const approval_date = dateRaw ? (() => {
    // Try dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
    const m1 = dateRaw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`
    const m2 = dateRaw.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/)
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
    return null
  })() : null

  const approval_year = approval_date ? parseInt(approval_date.slice(0, 4)) :
    parseYear(get('ano', 'ano de aprovação', 'approval_year', 'year')) ||
    parseYear(dateRaw)

  const region = mapRegion(
    get('nuts ii', 'nuts_ii', 'nuts2', 'região', 'regiao', 'region', 'nuts')
  )

  const sector =
    get('sector', 'setor', 'tipologia', 'area', 'área', 'atividade', 'actividade') || null

  const source =
    get('fonte', 'programa', 'source', 'fundo', 'programa operacional') || 'Importação'

  const source_url =
    get('url', 'link', 'ligação', 'fonte url', 'source_url') || null

  if (!company_name) return null

  return {
    company_name,
    project_title,
    grant_title: grant_title || 'Importação manual',
    nif: nif?.replace(/[^0-9]/g, '') || null,
    amount_approved,
    approval_year,
    approval_date,
    region,
    sector,
    source,
    source_url,
    grant_id: null,
  }
}

module.exports = router
