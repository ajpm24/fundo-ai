/**
 * Scraper de Decisões Recentes — fontes oficiais públicas
 *
 * Fontes:
 * 1. Diário da República Eletrónico API (dre.pt) — despachos de aprovação
 * 2. EU Cohesion Data Portal (cohesiondata.ec.europa.eu) — dados FEDER/FSE Portugal filtrados por data
 * 3. Compete2030.pt — beneficiários HTML (parsed)
 * 4. Portugal2030 RSS/Avisos — decisões recentes de candidaturas
 */

const https = require('https')
const http = require('http')
const db = require('../db/database')

function fetchText(url, headers = {}) {
  return new Promise((resolve) => {
    try {
      const proto = url.startsWith('https') ? https : http
      const req = proto.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FundoAI/2.0; +https://fundoai.pt)', ...headers },
        timeout: 12000
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchText(res.headers.location, headers).then(resolve)
        }
        let data = ''
        res.on('data', c => { data += c; if (data.length > 300000) res.destroy() })
        res.on('end', () => resolve(data))
        res.on('error', () => resolve(''))
      })
      req.on('error', () => resolve(''))
      req.on('timeout', () => { req.destroy(); resolve('') })
    } catch { resolve('') }
  })
}

function fetchJson(url, headers = {}) {
  return fetchText(url, headers).then(text => {
    try { return JSON.parse(text) } catch { return null }
  })
}

function htmlToText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

// ── 1. Diário da República API ────────────────────────────────────────────
// Publishes official despachos with beneficiary lists when programs approve projects
async function scrapeDRE(sinceDate) {
  const results = []
  try {
    const since = sinceDate || new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)
    const terms = ['beneficiários aprovados financiamento', 'aprovação candidaturas PT2030', 'lista beneficiários fundo perdido']

    for (const term of terms) {
      const url = `https://dre.pt/dre/api/search?q=${encodeURIComponent(term)}&fromDate=${since}&type=despacho&pageSize=20`
      const data = await fetchJson(url)
      if (!data || !Array.isArray(data.results)) continue

      for (const doc of data.results) {
        if (!doc.title) continue
        // Parse beneficiary names from the despacho title/summary
        const title = doc.title || ''
        const summary = doc.summary || doc.subtitle || ''
        const text = `${title} ${summary}`

        // Extract company-like names (capitalized words before financial mentions)
        const amountMatch = text.match(/(\d[\d.,]+)\s*(?:euros?|€|mil €|milhões)/i)
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.')) : null

        const sourceMatch = text.match(/SI\s+\w+|PT\s*2030|PRR|COMPETE|POSEUR|MAR\s*2030/i)
        const grantTitle = sourceMatch
          ? `${sourceMatch[0].trim()} — ${title.slice(0, 80)}`
          : title.slice(0, 100)

        const yearMatch = (doc.date || '').match(/(\d{4})/)
        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

        // Each despacho is one batch of approvals — store as a single record with the ministry as "company"
        if (doc.ministry || doc.issuer || doc.body) {
          results.push({
            grant_title: grantTitle,
            company_name: doc.issuer || doc.ministry || doc.body || 'Entidade pública',
            nif: null,
            amount_approved: amount,
            approval_year: year,
            approval_date: doc.date || null,
            project_title: summary.slice(0, 200) || null,
            region: null,
            sector: 'público',
            source: 'Diário da República',
            source_url: doc.url || `https://dre.pt${doc.path || ''}`,
          })
        }
      }
    }
  } catch (e) {
    console.warn('[RecentScraper] DRE error:', e.message)
  }
  return results
}

// ── 2. EU Cohesion Data — Portugal, filtered by date ─────────────────────
async function scrapeEUCohesionRecent(sinceDate) {
  const results = []
  try {
    const since = sinceDate || new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)
    // SoQL query: Portugal projects started after sinceDate, sorted by total investment desc
    const url = `https://cohesiondata.ec.europa.eu/resource/kus7-fg52.json?` +
      `$where=${encodeURIComponent(`ms_name='Portugal' AND start_date>'${since}'`)}` +
      `&$order=total_eligible_expenditure_eur+DESC&$limit=150`

    const data = await fetchJson(url)
    if (!Array.isArray(data)) return results

    for (const row of data) {
      if (!row.beneficiary_name || row.beneficiary_name.length < 2) continue
      const year = row.start_date ? parseInt(row.start_date.slice(0, 4)) : new Date().getFullYear()
      const amount = parseFloat(row.total_eligible_expenditure_eur) || null
      if (amount && amount < 1000) continue // filter noise

      results.push({
        grant_title: row.operation_name || row.fund_name || 'Fundo Europeu',
        company_name: row.beneficiary_name,
        nif: null,
        amount_approved: amount,
        approval_year: year,
        approval_date: row.start_date || null,
        project_title: row.operation_name || null,
        region: mapNuts(row.nuts2_name || row.nuts3_name || row.region || ''),
        sector: row.thematic_objective_name || row.intervention_field_description || null,
        source: `EU Cohesion / ${row.fund_name || row.fund || 'FEDER'}`,
        source_url: 'https://cohesiondata.ec.europa.eu/themes/Kohesion',
      })
    }
    console.log(`[RecentScraper] EU Cohesion (recent): ${results.length} registos`)
  } catch (e) {
    console.warn('[RecentScraper] EU Cohesion error:', e.message)
  }
  return results
}

// ── 3. Compete2030 Beneficiários HTML ─────────────────────────────────────
async function scrapeCompete2030() {
  const results = []
  try {
    // Compete2030 beneficiary list — updated quarterly
    const url = 'https://www.compete2030.pt/beneficiarios'
    const html = await fetchText(url)
    if (!html || html.length < 500) return results

    // Try to find table rows or list items with company names and amounts
    // Pattern: <tr> with NIF, company name, project, amount
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let match
    let count = 0
    while ((match = rowRe.exec(html)) !== null && count < 200) {
      const row = match[1]
      const cells = []
      const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let cellMatch
      while ((cellMatch = cellRe.exec(row)) !== null) {
        cells.push(htmlToText(cellMatch[1]))
      }
      if (cells.length < 3) continue

      // Typical Compete2030 table: NIF | Company | Project | Region | Amount | Year
      const nifCandidate = cells.find(c => /^\d{9}$/.test(c.replace(/\s/g, '')))
      const amountCandidate = cells.find(c => /[\d.,]+/.test(c) && c.includes('€'))
      const companyCandidate = cells.find(c => c.length > 5 && c.length < 100 && !/^\d+$/.test(c) && c !== nifCandidate)

      if (companyCandidate) {
        const amount = amountCandidate
          ? parseFloat(amountCandidate.replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.')) || null
          : null
        const yearCell = cells.find(c => /^20(2[0-9])$/.test(c.trim()))
        results.push({
          grant_title: 'PT2030 — COMPETE2030',
          company_name: companyCandidate,
          nif: nifCandidate || null,
          amount_approved: amount,
          approval_year: yearCell ? parseInt(yearCell) : new Date().getFullYear(),
          approval_date: null,
          project_title: cells[2]?.length > 5 ? cells[2] : null,
          region: cells.find(c => ['norte', 'centro', 'ams', 'alentejo', 'algarve', 'açores', 'madeira'].some(r => c.toLowerCase().includes(r))) || null,
          sector: null,
          source: 'PT2030 / COMPETE2030',
          source_url: 'https://www.compete2030.pt/beneficiarios',
        })
        count++
      }
    }
    console.log(`[RecentScraper] Compete2030: ${results.length} beneficiários`)
  } catch (e) {
    console.warn('[RecentScraper] Compete2030 error:', e.message)
  }
  return results
}

// ── 4. Portugal2030 Avisos Recentes ───────────────────────────────────────
async function scrapePortugal2030Avisos() {
  const results = []
  try {
    // Portugal2030 publishes lists of approved projects ("avisos" decisions)
    const url = 'https://portugal2030.pt/wp-json/wp/v2/posts?categories=avisos&per_page=20&orderby=date&order=desc'
    const posts = await fetchJson(url)
    if (!Array.isArray(posts)) return results

    for (const post of posts) {
      const title = htmlToText(post.title?.rendered || '')
      const excerpt = htmlToText(post.excerpt?.rendered || '')
      const date = (post.date || '').slice(0, 10)
      const year = date ? parseInt(date.slice(0, 4)) : new Date().getFullYear()

      // Only include posts that mention approvals/beneficiaries
      const text = `${title} ${excerpt}`.toLowerCase()
      if (!text.includes('aprovad') && !text.includes('beneficiár') && !text.includes('decisão') && !text.includes('selecionad')) continue

      const amountMatch = text.match(/(\d[\d.,]+)\s*(?:euros?|€|mil €|milhões)/i)
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(/[^\d.,]/g, '').replace(',', '.')) : null

      results.push({
        grant_title: 'Portugal2030 — ' + title.slice(0, 80),
        company_name: 'Ver lista na fonte oficial',
        nif: null,
        amount_approved: amount,
        approval_year: year,
        approval_date: date,
        project_title: excerpt.slice(0, 200),
        region: null,
        sector: null,
        source: 'Portugal2030',
        source_url: post.link || 'https://portugal2030.pt',
      })
    }
    console.log(`[RecentScraper] Portugal2030 avisos: ${results.length}`)
  } catch (e) {
    console.warn('[RecentScraper] Portugal2030 error:', e.message)
  }
  return results
}

// ── Helper: map NUTS region codes/names to our regions ───────────────────
function mapNuts(nuts) {
  const n = (nuts || '').toLowerCase()
  if (n.includes('norte') || n.includes('minho') || n.includes('braga') || n.includes('porto') || n.includes('viana')) return 'norte'
  if (n.includes('centro') || n.includes('coimbra') || n.includes('viseu') || n.includes('guarda') || n.includes('aveiro')) return 'centro'
  if (n.includes('lisboa') || n.includes('setúbal') || n.includes('metropolitan') || n.includes('setubal')) return 'ams'
  if (n.includes('alentejo') || n.includes('évora') || n.includes('beja') || n.includes('portalegre')) return 'alentejo'
  if (n.includes('algarve') || n.includes('faro')) return 'algarve'
  if (n.includes('açores') || n.includes('azores')) return 'acores'
  if (n.includes('madeira')) return 'madeira'
  return null
}

// ── Main runner ───────────────────────────────────────────────────────────
async function runRecentDecisionsScraper(sinceMonths = 6) {
  const since = new Date(Date.now() - sinceMonths * 30 * 86400000).toISOString().slice(0, 10)
  console.log(`[RecentScraper] A pesquisar decisões desde ${since}...`)

  const [dreData, cohesionData, compete2030Data, pt2030Data] = await Promise.allSettled([
    scrapeDRE(since),
    scrapeEUCohesionRecent(since),
    scrapeCompete2030(),
    scrapePortugal2030Avisos(),
  ])

  const allResults = [
    ...(dreData.status === 'fulfilled' ? dreData.value : []),
    ...(cohesionData.status === 'fulfilled' ? cohesionData.value : []),
    ...(compete2030Data.status === 'fulfilled' ? compete2030Data.value : []),
    ...(pt2030Data.status === 'fulfilled' ? pt2030Data.value : []),
  ]

  if (!allResults.length) {
    console.log('[RecentScraper] Sem novos dados encontrados')
    return { added: 0, sources: {} }
  }

  const findGrant = db.prepare("SELECT id FROM grants WHERE title LIKE ? LIMIT 1")
  const insert = db.prepare(`
    INSERT OR IGNORE INTO beneficiaries
      (grant_id, grant_title, company_name, nif, amount_approved, approval_year,
       project_title, region, sector, source, source_url)
    VALUES
      (@grant_id, @grant_title, @company_name, @nif, @amount_approved, @approval_year,
       @project_title, @region, @sector, @source, @source_url)
  `)

  const insertMany = db.transaction((rows) => {
    let added = 0
    for (const row of rows) {
      if (!row.company_name || row.company_name.length < 2) continue
      const keyword = (row.grant_title || '').split('—')[0].split('–')[0].trim().slice(0, 30)
      const grantMatch = keyword.length > 4 ? findGrant.get(`%${keyword}%`) : null
      const r = insert.run({ ...row, grant_id: grantMatch?.id || null })
      if (r.changes > 0) added++
    }
    return added
  })

  const added = insertMany(allResults)
  const sources = {
    dre: dreData.status === 'fulfilled' ? dreData.value.length : 'erro',
    eu_cohesion: cohesionData.status === 'fulfilled' ? cohesionData.value.length : 'erro',
    compete2030: compete2030Data.status === 'fulfilled' ? compete2030Data.value.length : 'erro',
    portugal2030: pt2030Data.status === 'fulfilled' ? pt2030Data.value.length : 'erro',
  }
  console.log(`[RecentScraper] ${added} novos registos adicionados | fontes:`, sources)
  return { added, total_found: allResults.length, sources, since }
}

module.exports = { runRecentDecisionsScraper }
