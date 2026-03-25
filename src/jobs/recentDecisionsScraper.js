/**
 * Scraper de Decisões Recentes — fontes oficiais portuguesas + EU
 *
 * Fontes:
 * 1. recuperarportugal.gov.pt WP API  — decisões PRR (candidaturas + posts)
 * 2. EU Kohesio (557j-pmg8)           — operações PT filtradas por data de início
 * 3. DRE RSS / API                    — despachos de aprovação no Diário da República
 * 4. ANI / Portugal2030               — projetos I&D e avisos recentes
 */

const https = require('https')
const http  = require('http')
const db    = require('../db/database')

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function fetchRaw(url, headers = {}) {
  return new Promise((resolve) => {
    try {
      const proto = url.startsWith('https') ? https : http
      const req = proto.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FundoAI/2.0; +https://fundoai.pt)',
          'Accept': 'application/json, text/html, application/xml, */*',
          ...headers
        },
        timeout: 15000
      }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          return fetchRaw(res.headers.location, headers).then(resolve)
        }
        let data = ''
        res.on('data', c => { data += c; if (data.length > 500000) res.destroy() })
        res.on('end', () => resolve({ status: res.statusCode, body: data }))
        res.on('error', () => resolve({ status: 0, body: '' }))
      })
      req.on('error', () => resolve({ status: 0, body: '' }))
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '' }) })
    } catch { resolve({ status: 0, body: '' }) }
  })
}

async function fetchJson(url, headers = {}) {
  const { body } = await fetchRaw(url, headers)
  try { return JSON.parse(body) } catch { return null }
}

function htmlToText(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/\s+/g, ' ').trim()
}

// ── 1. recuperarportugal.gov.pt — PRR decisions ───────────────────────────────
async function scrapePRRPortal(sinceDate) {
  const results = []
  try {
    // A) Custom post type "candidatura" — formal candidature/aviso entries
    const candidaturas = await fetchJson(
      `https://recuperarportugal.gov.pt/wp-json/wp/v2/candidatura?per_page=50&orderby=date&order=desc&after=${sinceDate}T00:00:00`
    )
    if (Array.isArray(candidaturas)) {
      for (const p of candidaturas) {
        const title = htmlToText(p.title?.rendered || '')
        const content = htmlToText(p.content?.rendered || '').slice(0, 400)
        const date = (p.date || '').slice(0, 10)
        const year = date ? parseInt(date) : new Date().getFullYear()
        const isApproval = /aprovad|selecionad|beneficiár|decisão|adjudic/i.test(title + content)

        results.push({
          grant_title: 'PRR — ' + title.slice(0, 100),
          company_name: isApproval ? 'Ver lista na fonte oficial' : 'Candidatura aberta',
          nif: null,
          amount_approved: extractAmount(content),
          approval_year: year,
          approval_date: date || null,
          project_title: content.slice(0, 200) || null,
          region: null,
          sector: extractSector(title + ' ' + content),
          source: 'PRR / recuperarportugal.gov.pt',
          source_url: p.link || 'https://recuperarportugal.gov.pt',
        })
      }
    }

    // B) Regular posts about aprovações/beneficiários
    const posts = await fetchJson(
      `https://recuperarportugal.gov.pt/wp-json/wp/v2/posts?per_page=30&orderby=date&order=desc&after=${sinceDate}T00:00:00&search=aprovad`
    )
    if (Array.isArray(posts)) {
      for (const p of posts) {
        const title = htmlToText(p.title?.rendered || '')
        const excerpt = htmlToText(p.excerpt?.rendered || '').slice(0, 300)
        const date = (p.date || '').slice(0, 10)
        const text = title + ' ' + excerpt

        // Skip if not about approvals
        if (!/aprovad|beneficiár|financiad|apoiad|selecionad/i.test(text)) continue

        results.push({
          grant_title: 'PRR — ' + title.slice(0, 100),
          company_name: 'Ver lista na fonte oficial',
          nif: null,
          amount_approved: extractAmount(text),
          approval_year: date ? parseInt(date) : new Date().getFullYear(),
          approval_date: date || null,
          project_title: excerpt.slice(0, 200) || null,
          region: null,
          sector: extractSector(text),
          source: 'PRR / recuperarportugal.gov.pt',
          source_url: p.link || 'https://recuperarportugal.gov.pt',
        })
      }
    }

    console.log(`[RecentScraper] PRR Portal: ${results.length} entradas`)
  } catch (e) {
    console.warn('[RecentScraper] PRR error:', e.message)
  }
  return results
}

// ── 2. EU Kohesio — recent PT operations (correct dataset: 557j-pmg8) ────────
async function scrapeEUKohesioRecent(sinceDate) {
  const results = []
  try {
    // Dataset 557j-pmg8 has: country, beneficiary_name, total_eligible_expenditure_amount,
    // operation_name_programme_language, region, category_label, fund_name, programme_name,
    // operation_start_date, operation_end_date
    const where = encodeURIComponent(
      `country='Portugal' AND operation_start_date>'${sinceDate}T00:00:00.000' AND total_eligible_expenditure_amount > '10000'`
    )
    const url = `https://cohesiondata.ec.europa.eu/resource/557j-pmg8.json?$where=${where}&$order=total_eligible_expenditure_amount+DESC&$limit=200`

    const data = await fetchJson(url)
    if (!Array.isArray(data)) {
      console.warn('[RecentScraper] EU Kohesio: resposta inválida')
      return results
    }

    for (const r of data) {
      if (!r.beneficiary_name || r.beneficiary_name.length < 2) continue
      const amount = parseFloat(r.total_eligible_expenditure_amount) || null
      const startDate = r.operation_start_date ? r.operation_start_date.slice(0, 10) : null
      const year = startDate ? parseInt(startDate) : null
      const progName = r.programme_name || ''

      results.push({
        grant_title: (r.operation_name_programme_language || r.operation_name_english || progName).slice(0, 200),
        company_name: r.beneficiary_name,
        nif: null,
        amount_approved: amount,
        approval_year: year,
        approval_date: startDate,
        project_title: (r.operation_name_programme_language || r.operation_name_english || '').slice(0, 200),
        region: mapNuts(r.region || ''),
        sector: mapCategory(r.category_label || ''),
        source: `EU Kohesio / ${r.fund_name || r.fund_code || 'FEDER'} — ${progName.slice(0, 50)}`,
        source_url: 'https://kohesio.ec.europa.eu',
      })
    }
    console.log(`[RecentScraper] EU Kohesio recent: ${results.length} registos`)
  } catch (e) {
    console.warn('[RecentScraper] EU Kohesio error:', e.message)
  }
  return results
}

// ── 3. DRE — Diário da República RSS + search ─────────────────────────────────
async function scrapeDRE(sinceDate) {
  const results = []
  try {
    // Try DRE RSS feed for recent publications related to grants/beneficiaries
    // DRE RSS: https://dre.pt/rss/rss-1a-serie.xml (1st series — laws and despachos)
    const rssFeeds = [
      'https://dre.pt/rss/rss-1a-serie.xml',
      'https://dre.pt/rss/rss-2a-serie.xml',
    ]

    for (const rssUrl of rssFeeds) {
      const { body } = await fetchRaw(rssUrl)
      if (!body || body.length < 200) continue

      // Parse RSS XML — extract items with grant-related content
      const itemRe = /<item>([\s\S]*?)<\/item>/g
      let match
      while ((match = itemRe.exec(body)) !== null) {
        const item = match[1]
        const title = stripXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')
        const desc  = stripXml(htmlToText(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || ''))
        const link  = stripXml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim()
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || ''
        const date = parsePubDate(pubDate)

        if (date && date < sinceDate) continue // too old

        const text = (title + ' ' + desc).toLowerCase()
        // Only include items related to grants, beneficiaries, or fund approvals
        const isRelevant = /beneficiár|aprovação|financiamento|incentivo|candidatura|pt2030|prr|feder|fse|apoio|subvenção|fundo|iapmei|ani\b|compete/.test(text)
        if (!isRelevant) continue

        results.push({
          grant_title: title.slice(0, 150),
          company_name: extractMinistry(title) || 'Ver despacho no DRE',
          nif: null,
          amount_approved: extractAmount(desc),
          approval_year: date ? parseInt(date.slice(0, 4)) : new Date().getFullYear(),
          approval_date: date || null,
          project_title: desc.slice(0, 200) || null,
          region: null,
          sector: extractSector(text),
          source: 'Diário da República',
          source_url: link || 'https://dre.pt',
        })

        if (results.length >= 30) break
      }
    }
    console.log(`[RecentScraper] DRE RSS: ${results.length} despachos relevantes`)
  } catch (e) {
    console.warn('[RecentScraper] DRE error:', e.message)
  }
  return results
}

// ── 4. ANI + Portugal2030 portais ─────────────────────────────────────────────
async function scrapeANIAndPT2030(sinceDate) {
  const results = []

  // ANI — Agência Nacional de Inovação: publishes approved projects
  try {
    // ANI has a WP-based site
    const aniPosts = await fetchJson(
      `https://www.ani.pt/wp-json/wp/v2/posts?per_page=20&orderby=date&order=desc&after=${sinceDate}T00:00:00&categories=projetos`
    )
    if (Array.isArray(aniPosts)) {
      for (const p of aniPosts) {
        const title = htmlToText(p.title?.rendered || '')
        const excerpt = htmlToText(p.excerpt?.rendered || '')
        const date = (p.date || '').slice(0, 10)
        const text = title + ' ' + excerpt
        if (!/aprovad|financiad|selecionad|projeto|contrato/i.test(text)) continue

        results.push({
          grant_title: 'ANI — ' + title.slice(0, 100),
          company_name: 'Ver lista na fonte oficial',
          nif: null,
          amount_approved: extractAmount(text),
          approval_year: date ? parseInt(date) : new Date().getFullYear(),
          approval_date: date || null,
          project_title: excerpt.slice(0, 200),
          region: null,
          sector: extractSector(text),
          source: 'ANI / Portugal2030',
          source_url: p.link || 'https://www.ani.pt',
        })
      }
      console.log(`[RecentScraper] ANI posts: ${aniPosts.length} encontrados`)
    }
  } catch (e) {
    console.warn('[RecentScraper] ANI error:', e.message)
  }

  // Portugal2030 portal — WP posts about approved decisions
  try {
    const pt2030Posts = await fetchJson(
      `https://portugal2030.pt/wp-json/wp/v2/posts?per_page=20&orderby=date&order=desc&after=${sinceDate}T00:00:00`
    )
    if (Array.isArray(pt2030Posts)) {
      for (const p of pt2030Posts) {
        const title = htmlToText(p.title?.rendered || '')
        const excerpt = htmlToText(p.excerpt?.rendered || '')
        const date = (p.date || '').slice(0, 10)
        const text = title + ' ' + excerpt

        if (!/aprovad|beneficiár|decisão|selecionad|lista|resultado/i.test(text)) continue

        results.push({
          grant_title: 'PT2030 — ' + title.slice(0, 100),
          company_name: 'Ver lista na fonte oficial',
          nif: null,
          amount_approved: extractAmount(text),
          approval_year: date ? parseInt(date) : new Date().getFullYear(),
          approval_date: date || null,
          project_title: excerpt.slice(0, 200),
          region: null,
          sector: extractSector(text),
          source: 'PT2030 / portugal2030.pt',
          source_url: p.link || 'https://portugal2030.pt',
        })
      }
    }
    console.log(`[RecentScraper] PT2030 posts: ${results.length}`)
  } catch (e) {
    console.warn('[RecentScraper] PT2030 error:', e.message)
  }

  return results
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripXml(s = '') {
  return s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim()
}

function parsePubDate(s = '') {
  try {
    const d = new Date(s)
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  } catch {}
  return null
}

function extractAmount(text = '') {
  // Matches: "3.200.000 euros", "3,2 milhões", "850 mil €", "€ 2.500.000"
  const patterns = [
    /(\d{1,3}(?:[.,]\d{3})+)\s*(?:euros?|€)/i,
    /(\d+(?:[.,]\d+)?)\s*milh[oõ]es?\s*(?:de\s*)?(?:euros?|€)/i,
    /(\d+(?:[.,]\d+)?)\s*mil\s*(?:euros?|€)/i,
    /€\s*(\d{1,3}(?:[.,]\d{3})+)/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (!m) continue
    let n = parseFloat(m[1].replace(/\./g, '').replace(',', '.'))
    if (/milh[oõ]/i.test(text.slice(m.index, m.index + 30))) n *= 1000000
    else if (/\bmil\b/i.test(text.slice(m.index, m.index + 20))) n *= 1000
    if (!isNaN(n) && n > 0) return n
  }
  return null
}

function extractMinistry(title = '') {
  // "Despacho n.º 1234/2025 — Ministério da Economia"
  const m = title.match(/Minist[ée]rio\s+d[aeo]\s+[\w\s]+/i)
  return m ? m[0].trim().slice(0, 80) : null
}

function extractSector(text = '') {
  const t = (text || '').toLowerCase()
  if (/intelig[eê]ncia artificial|ia\b|machine learning|deep learning/.test(t)) return 'IA / Tecnologia'
  if (/digital|software|app\b|plataforma|cloud|dado|ciberseg/.test(t)) return 'Digitalização'
  if (/inova[çc][aã]o|i\s*[&e]\s*d|investiga[çc][aã]o|i&dt|inovação/.test(t)) return 'I&D e Inovação'
  if (/pme|pequena.+m[eé]dia|startup|empreend/.test(t)) return 'PME e Empreendedorismo'
  if (/exporta[çc][aã]o|internacionaliza[çc][aã]o/.test(t)) return 'Internacionalização'
  if (/energia|solar|e[oó]lica|renov[aá]vel|hidrog[eê]nio|efici[eê]ncia energ/.test(t)) return 'Energia e Clima'
  if (/sa[úu]de|sa\x FAde|hospital|cl[ií]nica|f[aá]rmac|medic/.test(t)) return 'Saúde'
  if (/educa[çc][aã]o|ensino|escola|universidade|forma[çc][aã]o|emprego/.test(t)) return 'Educação e Emprego'
  if (/agro|agricultur|vinho|azeite|pesca|rural|floresta/.test(t)) return 'Agro-alimentar e Mar'
  if (/constru[çc][aã]o|habitação|urban|infraestrutura/.test(t)) return 'Construção e Habitação'
  if (/turismo|hotelaria|restaura[çc][aã]o|cultura|patrimônio/.test(t)) return 'Turismo e Cultura'
  if (/transporte|mobilidade|ferrovi[aá]ria|porto|aeroporto/.test(t)) return 'Transportes'
  if (/ambiente|clima|res[ií]duo|[áa]gua|biodiversidade/.test(t)) return 'Ambiente'
  if (/social|inclus[aã]o|igualdade|pobreza/.test(t)) return 'Inclusão Social'
  return null
}

function mapNuts(nuts = '') {
  const n = nuts.toLowerCase()
  if (n.includes('norte') || n.includes('braga') || n.includes('porto') || n.includes('minho') ||
      n.includes('douro') || n.includes('tamega') || n.includes('tâmega') || n.includes('ave') ||
      n.includes('cávado') || n.includes('cavado') || n.includes('trás') || n.includes('tras')) return 'norte'
  if (n.includes('centro') || n.includes('coimbra') || n.includes('viseu') || n.includes('leiria') ||
      n.includes('aveiro') || n.includes('oeste') || n.includes('beiras') || n.includes('tejo') ||
      n.includes('baixo') || n.includes('guarda') || n.includes('castelo branco')) return 'centro'
  if (n.includes('lisboa') || n.includes('setúbal') || n.includes('setubal') || n.includes('metropolitan') ||
      n.includes('lezíria') || n.includes('leziria') || n.includes('peninsula')) return 'ams'
  if (n.includes('alentejo') || n.includes('évora') || n.includes('evora') || n.includes('beja') || n.includes('portalegre')) return 'alentejo'
  if (n.includes('algarve') || n.includes('faro')) return 'algarve'
  if (n.includes('açores') || n.includes('acores') || n.includes('azores')) return 'acores'
  if (n.includes('madeira')) return 'madeira'
  return null
}

function mapCategory(cat = '') {
  const s = cat.toLowerCase()
  if (s.includes('sme') || s.includes('pme') || s.includes('enterprise')) return 'PME e Empreendedorismo'
  if (s.includes('research') || s.includes('innovation') || s.includes('i&d') || s.includes('rtd')) return 'I&D e Inovação'
  if (s.includes('digital') || s.includes('ict') || s.includes('broadband') || s.includes('ai')) return 'Digitalização'
  if (s.includes('transport') || s.includes('rail') || s.includes('road')) return 'Transportes'
  if (s.includes('energy') || s.includes('renew') || s.includes('low carbon')) return 'Energia e Clima'
  if (s.includes('environment') || s.includes('climate') || s.includes('water')) return 'Ambiente'
  if (s.includes('health')) return 'Saúde'
  if (s.includes('education') || s.includes('training') || s.includes('employ')) return 'Educação e Emprego'
  if (s.includes('social') || s.includes('inclusion')) return 'Inclusão Social'
  if (s.includes('tourism') || s.includes('culture')) return 'Turismo e Cultura'
  if (s.includes('agriculture') || s.includes('food') || s.includes('rural')) return 'Agro-alimentar e Mar'
  return cat.slice(0, 60) || null
}

// ── Main runner ───────────────────────────────────────────────────────────────
async function runRecentDecisionsScraper(sinceMonths = 3) {
  const since = new Date(Date.now() - sinceMonths * 30 * 86400000).toISOString().slice(0, 10)
  console.log(`[RecentScraper] A pesquisar decisões desde ${since} (${sinceMonths} meses)...`)

  const [prrRes, euRes, dreRes, aniRes] = await Promise.allSettled([
    scrapePRRPortal(since),
    scrapeEUKohesioRecent(since),
    scrapeDRE(since),
    scrapeANIAndPT2030(since),
  ])

  const allResults = [
    ...(prrRes.status   === 'fulfilled' ? prrRes.value   : []),
    ...(euRes.status    === 'fulfilled' ? euRes.value    : []),
    ...(dreRes.status   === 'fulfilled' ? dreRes.value   : []),
    ...(aniRes.status   === 'fulfilled' ? aniRes.value   : []),
  ]

  if (!allResults.length) {
    console.log('[RecentScraper] Sem novos dados encontrados')
    return { added: 0, total_found: 0, sources: {}, since }
  }

  // Dedup by company_name + grant_title
  const seen = new Set()
  const unique = allResults.filter(r => {
    const key = `${r.company_name}|${r.grant_title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const findGrant = db.prepare('SELECT id FROM grants WHERE title LIKE ? LIMIT 1')
  const insert = db.prepare(`
    INSERT OR IGNORE INTO beneficiaries
      (grant_id, grant_title, company_name, nif, amount_approved, approval_year, approval_date,
       project_title, region, sector, source, source_url)
    VALUES
      (@grant_id, @grant_title, @company_name, @nif, @amount_approved, @approval_year, @approval_date,
       @project_title, @region, @sector, @source, @source_url)
  `)

  const insertMany = db.transaction((rows) => {
    let added = 0
    for (const row of rows) {
      if (!row.company_name || row.company_name.length < 2) continue
      const keyword = (row.grant_title || '').split(/[—–]/)[0].trim().slice(0, 30)
      const grantMatch = keyword.length > 4 ? findGrant.get(`%${keyword}%`) : null
      const r = insert.run({ ...row, grant_id: grantMatch?.id || null })
      if (r.changes > 0) added++
    }
    return added
  })

  const added = insertMany(unique)
  const sources = {
    prr:       prrRes.status === 'fulfilled'  ? prrRes.value.length   : 'erro',
    eu_kohesio: euRes.status === 'fulfilled'  ? euRes.value.length    : 'erro',
    dre:        dreRes.status === 'fulfilled' ? dreRes.value.length   : 'erro',
    ani_pt2030: aniRes.status === 'fulfilled' ? aniRes.value.length   : 'erro',
  }

  console.log(`[RecentScraper] ${added} novos registos | total encontrados: ${unique.length} | fontes:`, sources)
  return { added, total_found: unique.length, sources, since }
}

module.exports = { runRecentDecisionsScraper }
