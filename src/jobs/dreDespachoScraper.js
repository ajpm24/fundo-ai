/**
 * DRE Despacho Scraper — Diário da República
 *
 * Pipeline:
 * 1. Poll DRE RSS (1ª e 2ª Série) a cada 6h
 * 2. Filtrar despachos relevantes (PT2030, PRR, FEDER, ANI, IAPMEI, etc.)
 * 3. Ir buscar o HTML completo de cada despacho novo
 * 4. Extrair tabela de beneficiários (NIF + empresa + montante + projeto)
 * 5. INSERT OR IGNORE na tabela beneficiaries
 * 6. Marcar despacho como processado em dre_despachos
 *
 * Resultado: dados ~1-5 dias após a assinatura do despacho (quase-live)
 */

const https = require('https')
const http  = require('http')
const db    = require('../db/database')

// ── HTTP ─────────────────────────────────────────────────────────────────────
function fetch(url, opts = {}) {
  return new Promise((resolve) => {
    try {
      const proto = url.startsWith('https') ? https : http
      const req = proto.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FundoAI/2.0; research-bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml,text/xml,*/*',
          'Accept-Language': 'pt-PT,pt;q=0.9',
          ...opts.headers
        },
        timeout: 20000
      }, (res) => {
        if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
          return fetch(res.headers.location, opts).then(resolve)
        }
        let body = ''
        res.on('data', c => { body += c; if (body.length > 2000000) res.destroy() })
        res.on('end', () => resolve({ ok: res.statusCode < 400, status: res.statusCode, body }))
        res.on('error', () => resolve({ ok: false, body: '' }))
      })
      req.on('error', () => resolve({ ok: false, body: '' }))
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, body: '' }) })
    } catch { resolve({ ok: false, body: '' }) }
  })
}

// ── RSS parser ────────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const items = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRe.exec(xml)) !== null) {
    const raw = m[1]
    const get = (tag) => {
      const r = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
      const match = r.exec(raw)
      return match ? (match[1] || match[2] || '').trim() : ''
    }
    items.push({
      title:   stripHtml(get('title')),
      desc:    stripHtml(get('description')),
      link:    get('link').replace(/^[\s\S]*?(https?:\/\/)/, '$1').trim(),
      pubDate: get('pubDate'),
      guid:    get('guid'),
    })
  }
  return items
}

// ── Relevance filter — only fetch despachos about grant approvals ─────────────
const GRANT_KEYWORDS = [
  'pt2030', 'portugal 2030', 'compete2030', 'compete 2030',
  'prr', 'plano de recuperação', 'recuperação e resiliência',
  'feder', 'fundo europeu', 'fse', 'fundo social',
  'iapmei', 'ani\b', 'aicep',
  'si inovação', 'si qualificação', 'si internacionalização',
  'digitalização pme', 'agenda mobilizadora',
  'vale inovação', 'vale i\\+d\\+i',
  'apoio à internacionalização',
  'eficiência energética',
  'mar2030', 'pdr2020',
  'horizonte europa', 'eic accelerator',
  'candidaturas aprovadas', 'projetos aprovados', 'lista de beneficiários',
  'beneficiários aprovados', 'financiamento aprovado', 'incentivos aprovados',
  'aviso n.º', 'aviso n\\.',
]
const GRANT_RE = new RegExp(GRANT_KEYWORDS.join('|'), 'i')

function isGrantRelevant(item) {
  const text = `${item.title} ${item.desc}`.toLowerCase()
  return GRANT_RE.test(text)
}

// ── Extract DRE document ID from URL ─────────────────────────────────────────
function extractDreId(url = '', title = '') {
  // URLs like: https://dre.pt/dre/detalhe/despacho/12345-2025/...
  // or: https://dre.pt/application/conteudo/123456789
  const m1 = url.match(/\/(\d{4,}-\d{4})\//)
  if (m1) return m1[1]
  const m2 = url.match(/\/conteudo\/(\d+)/)
  if (m2) return m2[1]
  const m3 = url.match(/\/(\d{6,})/)
  if (m3) return m3[1]
  // Fallback: use title + pubdate hash
  return title.slice(0, 60).replace(/\s+/g, '-')
}

// ── Parse beneficiary table from despacho HTML ────────────────────────────────
// Handles multiple formats used by different managing authorities
function extractBeneficiaries(html, meta) {
  const results = []

  // Clean up HTML
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')

  // ── Strategy 1: HTML <table> with NIF column ──────────────────────────────
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch
  while ((tableMatch = tableRe.exec(text)) !== null) {
    const tableHtml = tableMatch[1]
    if (!tableHtml.length) continue

    // Find all rows
    const rows = []
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch
    while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
      const cells = []
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      let cellMatch
      while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
        cells.push(stripHtml(cellMatch[1]).trim())
      }
      if (cells.length >= 2) rows.push(cells)
    }

    if (rows.length < 2) continue

    // Detect header row — look for NIF/beneficiário/montante headers
    const header = rows[0].map(c => c.toLowerCase())
    const nifCol      = header.findIndex(h => /nif|nipc|contribuinte/.test(h))
    const companyCol  = header.findIndex(h => /benefici|empresa|entidade|designação|nome/.test(h))
    const amountCol   = header.findIndex(h => /montante|apoio|incentivo|feder|fse|valor|financiamento/.test(h))
    const projectCol  = header.findIndex(h => /projeto|operação|título|designação do projeto/.test(h))
    const regionCol   = header.findIndex(h => /região|nuts|localiz/.test(h))

    // If no recognizable header, try to auto-detect by content of first data row
    const dataRows = (nifCol >= 0 || companyCol >= 0) ? rows.slice(1) : rows
    if (dataRows.length === 0) continue

    for (const row of dataRows) {
      if (row.length < 2) continue

      // Auto-detect NIF (9 digits)
      let nif = null
      let company = null
      let amount = null
      let project = null
      let region = null

      if (nifCol >= 0 && row[nifCol]) {
        nif = row[nifCol].replace(/\D/g, '').slice(0, 9)
        if (nif.length !== 9) nif = null
      }
      if (companyCol >= 0 && row[companyCol]) {
        company = row[companyCol].replace(/^\d{9}\s*[-–—]?\s*/, '').trim()
      }
      if (amountCol >= 0 && row[amountCol]) {
        amount = parseAmount(row[amountCol])
      }
      if (projectCol >= 0 && row[projectCol]) {
        project = row[projectCol].slice(0, 200)
      }
      if (regionCol >= 0 && row[regionCol]) {
        region = mapRegion(row[regionCol])
      }

      // Auto-detect: scan all cells
      if (!nif) {
        for (const cell of row) {
          const digits = cell.replace(/\D/g, '')
          if (digits.length === 9 && /^[125689]/.test(digits)) { nif = digits; break }
        }
      }
      if (!company) {
        // Largest text cell that's not a number/amount
        company = row
          .filter(c => c.length > 5 && !/^[\d.,\s€%]+$/.test(c) && !/^\d{9}$/.test(c.replace(/\D/g, '')))
          .sort((a, b) => b.length - a.length)[0] || null
      }
      if (!amount) {
        for (const cell of row) {
          const a = parseAmount(cell)
          if (a && a > 1000) { amount = a; break }
        }
      }

      if (!company || company.length < 3) continue
      // Skip header-like rows
      if (/^(nif|nipc|benefici|empresa|entidade|montante|apoio|projeto|região)/i.test(company)) continue

      results.push({
        company_name: company.slice(0, 200),
        nif: nif || null,
        amount_approved: amount,
        project_title: project,
        region: region || mapRegion(meta.region || ''),
      })
    }
  }

  // ── Strategy 2: Text lines with NIF pattern ───────────────────────────────
  if (results.length === 0) {
    const plainText = stripHtml(html)
    // Pattern: NIF followed by company name and optional amount
    // e.g. "500123456 — Empresa X, S.A. — 250.000,00 €"
    // e.g. "NIF: 500123456, Empresa X"
    const linePatterns = [
      /(\d{9})\s*[-–—]\s*([^€\d\n]{5,80}?)(?:\s*[-–—]\s*([\d.,]+\s*(?:€|EUR)?))?/g,
      /NIF[:\s]+(\d{9})[,;\s]+([^€\n]{5,80}?)(?:[,;\s]+([\d.,]+\s*(?:€|EUR)?))?/gi,
    ]
    for (const re of linePatterns) {
      let lm
      while ((lm = re.exec(plainText)) !== null) {
        const nif = lm[1]
        const company = lm[2]?.trim()
        const amountStr = lm[3] || ''
        if (!company || company.length < 3) continue
        if (!/^[125689]/.test(nif)) continue // invalid PT NIF start
        results.push({
          company_name: company.slice(0, 200),
          nif,
          amount_approved: parseAmount(amountStr),
          project_title: null,
          region: mapRegion(meta.region || ''),
        })
      }
      if (results.length > 0) break
    }
  }

  // ── Strategy 3: Paragraph lists — "Entidade: X\nMontante: Y €" ───────────
  if (results.length === 0) {
    const plainText = stripHtml(html)
    const blocks = plainText.split(/\n\s*\n/)
    for (const block of blocks) {
      if (block.length < 20) continue
      const nifMatch = block.match(/(?:NIF|NIPC)[:\s]*(\d{9})/)
      const amountMatch = block.match(/([\d.]+(?:,\d+)?)\s*(?:€|euros?)/i)
      const nameMatch = block.match(/(?:Entidade|Empresa|Beneficiário|Designação)[:\s]*([^\n]{5,100})/)
      if (nifMatch || (nameMatch && amountMatch)) {
        results.push({
          company_name: (nameMatch?.[1] || '').trim().slice(0, 200),
          nif: nifMatch?.[1] || null,
          amount_approved: amountMatch ? parseAmount(amountMatch[0]) : null,
          project_title: null,
          region: mapRegion(meta.region || ''),
        })
      }
    }
  }

  return results.filter(r => r.company_name && r.company_name.length > 3)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripHtml(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function parseAmount(str = '') {
  if (!str) return null
  // Handle "1.234.567,89 €" (PT format) and "1,234,567.89 €" (EN format)
  // Also "3,2 milhões" / "850 mil €"
  let s = String(str).replace(/[€$\s]/g, '')
  const milMatch = s.match(/([\d.,]+)\s*milh[oõ]/i)
  const kMatch   = s.match(/([\d.,]+)\s*mil\b/i)
  if (milMatch) {
    const n = parseFloat(milMatch[1].replace(/\./g, '').replace(',', '.'))
    return isNaN(n) ? null : n * 1000000
  }
  if (kMatch) {
    const n = parseFloat(kMatch[1].replace(/\./g, '').replace(',', '.'))
    return isNaN(n) ? null : n * 1000
  }
  // Remove thousand separators, normalize decimal
  // PT: 1.234.567,89 → 1234567.89
  s = s.replace(/^([\d.]+),([\d]{2})$/, (_, a, b) => a.replace(/\./g, '') + '.' + b)
  s = s.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) || n <= 0 ? null : n
}

function mapRegion(s = '') {
  const v = s.toLowerCase()
  if (/norte|braga|porto|minho|douro|tâmega|tamega|cávado|cavado|trás|tras|viana/.test(v)) return 'norte'
  if (/centro|coimbra|viseu|leiria|aveiro|guarda|castelo branco|oeste|beiras|tejo/.test(v)) return 'centro'
  if (/lisboa|setúbal|setubal|metropolit|lezíria|leziria|peninsula/.test(v)) return 'ams'
  if (/alentejo|évora|evora|beja|portalegre/.test(v)) return 'alentejo'
  if (/algarve|faro/.test(v)) return 'algarve'
  if (/açores|acores|azores/.test(v)) return 'acores'
  if (/madeira/.test(v)) return 'madeira'
  return null
}

function extractGrantInfo(title = '', desc = '') {
  const text = `${title} ${desc}`
  // Detect program
  let program = 'Desconhecido'
  if (/pt2030|portugal 2030|compete2030/i.test(text)) program = 'PT2030 / COMPETE2030'
  else if (/prr|recuperação e resiliência/i.test(text)) program = 'PRR'
  else if (/horizonte europa|eic/i.test(text)) program = 'Horizonte Europa'
  else if (/ani\b/i.test(text)) program = 'ANI'
  else if (/iapmei/i.test(text)) program = 'IAPMEI'
  else if (/mar2030/i.test(text)) program = 'MAR2030'
  else if (/pdr2020/i.test(text)) program = 'PDR2020'
  else if (/feder|fundo europeu de desenvolvimento/i.test(text)) program = 'FEDER'

  // Detect aviso number
  const avisoMatch = text.match(/aviso\s+n\.?[oº]?\s*([\w.-]+\/\d{4})/i)
  const aviso = avisoMatch ? avisoMatch[1] : null

  return { program, aviso }
}

function parsePubDate(s = '') {
  try {
    const d = new Date(s)
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  } catch {}
  return null
}

// ── Main: process one RSS feed ────────────────────────────────────────────────
async function processFeed(rssUrl, series) {
  const { ok, body } = await fetch(rssUrl)
  if (!ok || !body) {
    console.warn(`[DRE] Não foi possível aceder ao RSS: ${rssUrl}`)
    return 0
  }

  const items = parseRSS(body)
  const relevant = items.filter(isGrantRelevant)
  console.log(`[DRE] ${series}: ${items.length} entradas, ${relevant.length} relevantes`)

  const checkProcessed = db.prepare('SELECT id FROM dre_despachos WHERE dre_id = ?')
  const markProcessed  = db.prepare(`
    INSERT OR REPLACE INTO dre_despachos (dre_id, title, pub_date, url, series, beneficiaries_found)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const insertBeneficiary = db.prepare(`
    INSERT OR IGNORE INTO beneficiaries
      (grant_id, grant_title, company_name, nif, amount_approved, approval_year, approval_date,
       project_title, region, sector, source, source_url)
    VALUES
      (@grant_id, @grant_title, @company_name, @nif, @amount_approved, @approval_year, @approval_date,
       @project_title, @region, @sector, @source, @source_url)
  `)
  const findGrant = db.prepare('SELECT id FROM grants WHERE title LIKE ? LIMIT 1')

  let totalAdded = 0

  for (const item of relevant) {
    const dreId = extractDreId(item.link, item.title)
    if (!dreId) continue

    // Skip already processed
    if (checkProcessed.get(dreId)) {
      console.log(`[DRE] Já processado: ${item.title.slice(0, 60)}`)
      continue
    }

    const pubDate = parsePubDate(item.pubDate)
    const { program, aviso } = extractGrantInfo(item.title, item.desc)

    console.log(`[DRE] A processar: ${item.title.slice(0, 80)}`)
    console.log(`[DRE]   URL: ${item.link}`)

    // Fetch full despacho HTML
    let beneficiaries = []

    if (item.link && item.link.startsWith('http')) {
      const { ok: pageOk, body: pageHtml } = await fetch(item.link)

      if (pageOk && pageHtml.length > 500) {
        const meta = { region: null }
        beneficiaries = extractBeneficiaries(pageHtml, meta)
        console.log(`[DRE]   Extraídos: ${beneficiaries.length} beneficiários`)
      }
    }

    // If no beneficiaries found in HTML, still store the despacho as a reference
    if (beneficiaries.length === 0) {
      // Store the despacho itself as a single record with source info
      const year = pubDate ? parseInt(pubDate.slice(0, 4)) : new Date().getFullYear()
      const keyword = program.split('/')[0].trim().slice(0, 30)
      const grantMatch = keyword.length > 4 ? findGrant.get(`%${keyword}%`) : null

      // Only store if title strongly indicates an approval list
      if (/aprovad|beneficiár|lista|selecionad|decisão.*financiamento/i.test(item.title + item.desc)) {
        insertBeneficiary.run({
          grant_id: grantMatch?.id || null,
          grant_title: `${program}${aviso ? ' — Aviso ' + aviso : ''} — ${item.title.slice(0, 80)}`,
          company_name: 'Ver lista completa no Diário da República',
          nif: null,
          amount_approved: null,
          approval_year: year,
          approval_date: pubDate,
          project_title: item.desc.slice(0, 200) || null,
          region: null,
          sector: null,
          source: 'Diário da República',
          source_url: item.link,
        })
      }

      markProcessed.run(dreId, item.title.slice(0, 200), pubDate, item.link, series, 0)
      // Be polite
      await new Promise(r => setTimeout(r, 500))
      continue
    }

    // Insert all found beneficiaries
    const year = pubDate ? parseInt(pubDate.slice(0, 4)) : new Date().getFullYear()
    const grantTitle = `${program}${aviso ? ' — Aviso ' + aviso : ''}`
    const keyword = program.split('/')[0].trim().slice(0, 30)
    const grantMatch = keyword.length > 4 ? findGrant.get(`%${keyword}%`) : null

    const insertMany = db.transaction((rows) => {
      let added = 0
      for (const b of rows) {
        const r = insertBeneficiary.run({
          grant_id: grantMatch?.id || null,
          grant_title: grantTitle,
          company_name: b.company_name,
          nif: b.nif,
          amount_approved: b.amount_approved,
          approval_year: b.amount_approved ? year : null,
          approval_date: pubDate,
          project_title: b.project_title,
          region: b.region,
          sector: null,
          source: `Diário da República / ${program}`,
          source_url: item.link,
        })
        if (r.changes > 0) added++
      }
      return added
    })

    const added = insertMany(beneficiaries)
    totalAdded += added
    console.log(`[DRE]   ✅ ${added} novos beneficiários inseridos`)

    markProcessed.run(dreId, item.title.slice(0, 200), pubDate, item.link, series, beneficiaries.length)

    // Polite delay
    await new Promise(r => setTimeout(r, 800))
  }

  return totalAdded
}

// ── Public API ────────────────────────────────────────────────────────────────
async function runDREDespachoScraper() {
  console.log('[DRE] A iniciar scraper de despachos...')

  const feeds = [
    { url: 'https://dre.pt/rss/rss-1a-serie.xml', series: '1ª Série' },
    { url: 'https://dre.pt/rss/rss-2a-serie.xml', series: '2ª Série' },
  ]

  let total = 0
  for (const feed of feeds) {
    try {
      const added = await processFeed(feed.url, feed.series)
      total += added
    } catch (e) {
      console.warn(`[DRE] Erro no feed ${feed.series}:`, e.message)
    }
  }

  console.log(`[DRE] Concluído: ${total} novos beneficiários adicionados`)
  return { added: total, source: 'DRE Despachos' }
}

// Expose list of recent despachos processed
function getRecentDespachos(limit = 20) {
  return db.prepare(`
    SELECT * FROM dre_despachos
    ORDER BY pub_date DESC, processed_at DESC
    LIMIT ?
  `).all(limit)
}

module.exports = { runDREDespachoScraper, getRecentDespachos }
