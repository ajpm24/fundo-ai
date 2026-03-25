/**
 * FundoAI Crawler v2 — fetches real grant data from multiple official sources
 * Sources:
 *   1. EU Funding & Tenders Portal (SEDIA REST API — POST)
 *   2. AI-powered bulk seed for PT national funds (PT2030, PRR, IAPMEI, ANI, FCT, etc.)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true })

const https = require('https')
const http = require('http')
const db = require('../db/database')

// ── HTTP helpers ───────────────────────────────────────────────────────────

function postJson(url, queryParams = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url)
    Object.entries(queryParams).forEach(([k, v]) => fullUrl.searchParams.set(k, v))
    const req = https.request(fullUrl.toString(), {
      method: 'POST',
      headers: {
        'User-Agent': 'FundoAI/2.0 (grant research platform)',
        'Accept': 'application/json',
        'Content-Length': 0
      }
    }, res => {
      let data = ''
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return postJson(res.headers.location, {}).then(resolve).catch(reject)
      }
      res.on('data', chunk => data += chunk)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } })
    })
    req.on('error', reject)
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const req = proto.get(url, {
      headers: { 'User-Agent': 'FundoAI/2.0', 'Accept': 'application/json' }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } })
    })
    req.on('error', reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// ── Insert helper ──────────────────────────────────────────────────────────

function normalizeTitle(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

function upsertGrant(g) {
  const callStatus = g.deadline
    ? (new Date(g.deadline) > new Date() ? 'open' : 'closed')
    : 'open'

  const title = (g.title || '').slice(0, 255)
  const norm = normalizeTitle(title)
  if (!norm || norm.length < 5) return 0

  // Skip if a grant with very similar title already exists
  const existing = db.prepare('SELECT id FROM grants WHERE lower(trim(title)) = ?').get(title.toLowerCase().trim())
  if (existing) return 0

  const r = db.prepare(`
    INSERT OR IGNORE INTO grants
      (title, source, description, max_amount, min_amount, deadline, eligible_sectors,
       eligible_sizes, eligible_countries, url, funding_type, region, category,
       cofinancing_rate, funding_rate, call_status, is_active)
    VALUES
      (@title, @source, @description, @max_amount, @min_amount, @deadline, @eligible_sectors,
       @eligible_sizes, @eligible_countries, @url, @funding_type, @region, @category,
       @cofinancing_rate, @funding_rate, @call_status, 1)
  `).run({
    title,
    source: (g.source || '').slice(0, 255),
    description: (g.description || '').slice(0, 2000),
    max_amount: g.max_amount || null,
    min_amount: g.min_amount || null,
    deadline: g.deadline || null,
    eligible_sectors: JSON.stringify(g.eligible_sectors || []),
    eligible_sizes: JSON.stringify(g.eligible_sizes || ['todos']),
    eligible_countries: JSON.stringify(g.eligible_countries || ['PT']),
    url: g.url || '',
    funding_type: g.funding_type || 'fundo_perdido',
    region: g.region || 'todas',
    category: g.category || 'inovacao',
    cofinancing_rate: g.cofinancing_rate || g.funding_rate || null,
    funding_rate: g.funding_rate || g.cofinancing_rate || null,
    call_status: g.call_status || callStatus
  })
  return r.changes
}

// ── EU Funding & Tenders Portal ────────────────────────────────────────────
// Official SEDIA API (POST). Fetches open calls with future deadlines.

const EU_PROGRAMMES = [
  { text: 'Horizon Europe', category: 'investigacao', funding_rate: 100 },
  { text: 'LIFE', category: 'ambiente', funding_rate: 60 },
  { text: 'Digital Europe', category: 'digitalizacao', funding_rate: 50 },
  { text: 'Erasmus', category: 'formacao', funding_rate: 80 },
  { text: 'Creative Europe', category: 'cultura', funding_rate: 70 },
  { text: 'InvestEU', category: 'inovacao', funding_rate: null },
  { text: 'COSME', category: 'inovacao', funding_rate: 50 },
  { text: 'EU4Health', category: 'saude', funding_rate: 60 },
  { text: 'CEF', category: 'digitalizacao', funding_rate: 50 },
  { text: 'Interreg', category: 'inovacao', funding_rate: 75 },
  { text: 'EIC Accelerator', category: 'inovacao', funding_rate: 70 },
  { text: 'EIC Pathfinder', category: 'investigacao', funding_rate: 100 },
  { text: 'ERC', category: 'investigacao', funding_rate: 100 },
  { text: 'Innovation Fund', category: 'energia', funding_rate: 60 },
  { text: 'IHI', category: 'saude', funding_rate: 100 }
]

async function crawlEUPortal() {
  console.log('[Crawler] EU Funding & Tenders Portal — paginated crawl...')
  const today = new Date().toISOString().split('T')[0]
  let totalAdded = 0

  for (const prog of EU_PROGRAMMES) {
    let page = 1
    let hasMore = true

    while (hasMore && page <= 4) { // max 4 pages × 50 = 200 per programme
      try {
        const data = await postJson(
          'https://api.tech.ec.europa.eu/search-api/prod/rest/search',
          { apiKey: 'SEDIA', text: prog.text, pageSize: 50, pageNumber: page, language: 'en' }
        )

        if (!data?.results?.length) { hasMore = false; break }

        let pageAdded = 0
        for (const item of data.results) {
          const m = item.metadata || {}
          const title = (m.title?.[0] || m.callTitle?.[0] || '').trim()
          if (!title || title.length < 5) continue

          // Only accept items that look like calls (have callIdentifier) or projects (have startDate)
          const callId = m.callIdentifier?.[0]
          const deadline = m.deadlineDate?.[0]
            ? new Date(m.deadlineDate[0]).toISOString().split('T')[0]
            : null

          // Skip if deadline already passed
          if (deadline && deadline < today) continue

          // Skip if status is explicitly closed
          const status = m.status?.[0]
          if (status === '31094503') continue // closed

          const desc = (m.description || m.descriptionByte || m.summary || [])
            .find(s => typeof s === 'string' && s.length > 20)?.replace(/<[^>]+>/g, '').slice(0, 800) || ''

          const added = upsertGrant({
            title,
            source: prog.text + (callId ? ` (${callId})` : ''),
            description: desc,
            deadline,
            eligible_countries: ['EU', 'PT'],
            url: item.url || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${callId || ''}`,
            funding_type: 'fundo_perdido',
            category: prog.category,
            funding_rate: prog.funding_rate,
            call_status: deadline ? 'open' : 'open'
          })
          if (added) { pageAdded++; totalAdded++ }
        }

        if (pageAdded === 0 && page > 1) { hasMore = false } // stop when no new results
        hasMore = data.results.length === 50 && page < 4
        page++
      } catch (err) {
        console.log(`[Crawler] EU Portal ${prog.text} p${page} error:`, err.message)
        hasMore = false
      }
    }
  }

  console.log(`[Crawler] EU Portal: +${totalAdded} new grants`)
  return totalAdded
}

// ── AI-powered PT national fund seeder ────────────────────────────────────
// Uses Claude to enumerate ALL currently active PT national grant programmes.

const PT_QUERIES = [
  'PT2030 fundos abertos 2025 2026 FEDER FSE empresas PME inovação digitalização',
  'PRR Plano Recuperação Resiliência Portugal fundos abertos 2025 2026 candidaturas',
  'IAPMEI apoios incentivos empresas startups 2025 2026 fundos perdidos vouchers',
  'ANI FCT investigação ciência tecnologia Portugal 2025 2026',
  'Banco de Fomento Portugal linhas crédito garantias PME 2025 2026',
  'EEA Grants Norway Grants Portugal 2025 2026 fundos abertos',
  'PDR2030 FEADER agricultura floresta Portugal 2025 2026',
  'FEAMPA pesca aquicultura Portugal 2025 2026',
  'IEFP emprego formação profissional apoios empresas 2025 2026',
  'Turismo Portugal apoios investimento 2025 2026',
  'PT2030 energia renovável hidrogénio eficiência energética Portugal 2025 2026',
  'PT2030 internacionalização exportação AICEP 2025 2026',
  'Horizonte Europa candidaturas Portugal 2025 2026 PME startups',
  'Interreg Portugal cooperação transfronteiriça 2025 2026',
  'Fundo Transição Justa Portugal Setúbal Alentejo 2025 2026'
]

async function crawlWithAI() {
  console.log('[Crawler] AI-powered PT national funds search...')

  const Anthropic = require('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let totalAdded = 0
  const today = new Date().toISOString().split('T')[0]

  for (const query of PT_QUERIES) {
    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8096,
        messages: [{
          role: 'user',
          content: `És um especialista em financiamentos portugueses e europeus com conhecimento actualizado até 2026.

Pesquisa: "${query}"

Lista TODOS os programas/fundos específicos relevantes para esta pesquisa que existam ou tenham chamadas previstas em 2025-2026 para entidades portuguesas.
Inclui programas nacionais (PT2030, PRR, IAPMEI, ANI, FCT, BFP, AICEP, IEFP, etc.) e europeus (Horizonte Europa, LIFE, Digital Europe, etc.).
Cada fundo deve ser um programa real e distinto, não uma repetição.

MUITO IMPORTANTE:
- "max_amount": indica o montante máximo elegível REAL desse programa específico (ex: SI Inovação até €25M, EIC Accelerator até €2.5M, etc.)
- "url": indica o URL DIRECTO e ESPECÍFICO da página do programa/aviso (ex: https://pt2030.pt/avisos/... ou https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator) — NÃO a homepage genérica
- "description": descreve especificamente O QUE financia, QUEM pode candidatar-se, QUAL a taxa de co-financiamento e QUAIS os sectores elegíveis
- "cofinancing_rate": percentagem real de co-financiamento (ex: SI Inovação = 45%, EIC = 70%, Horizonte Europa = 100%)

Responde APENAS em JSON válido:
{
  "grants": [
    {
      "title": "Nome exacto do programa/fundo",
      "source": "Entidade gestora (ex: IAPMEI, PT2030/COMPETE, PRR, etc.)",
      "description": "Descrição de 3-4 frases: o que financia, quem pode candidatar-se (PME, startups, grandes empresas, universidades), condições principais e sectores prioritários",
      "max_amount": 500000,
      "min_amount": 10000,
      "deadline": "2026-12-31",
      "eligible_sectors": ["setor1", "setor2"],
      "eligible_sizes": ["micro", "pequena", "média"],
      "funding_type": "fundo_perdido",
      "region": "todas",
      "category": "inovacao",
      "cofinancing_rate": 45,
      "url": "https://url-directo-especifico-do-programa.pt"
    }
  ]
}`
        }]
      })

      const raw = msg.content[0].text
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue

      let parsed
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch {
        // Try to recover truncated JSON — extract complete grant objects
        const grantMatches = [...jsonMatch[0].matchAll(/\{[^{}]*"title"[^{}]*"source"[^{}]*\}/g)]
        if (!grantMatches.length) continue
        parsed = { grants: grantMatches.map(m => { try { return JSON.parse(m[0]) } catch { return null } }).filter(Boolean) }
      }

      for (const g of parsed.grants || []) {
        if (!g.title || g.title.length < 5) continue
        const added = upsertGrant({
          ...g,
          eligible_countries: ['PT'],
          call_status: g.deadline && new Date(g.deadline) < new Date() ? 'upcoming' : 'open'
        })
        if (added) totalAdded++
      }

      console.log(`[Crawler] AI query "${query.slice(0, 40)}..." → added ${totalAdded} total so far`)
      await new Promise(r => setTimeout(r, 500)) // small delay between API calls

    } catch (err) {
      console.log('[Crawler] AI query error:', err.message)
    }
  }

  console.log(`[Crawler] AI PT seeder: +${totalAdded} new grants`)
  return totalAdded
}

// ── Real HTML scraper — official PT funding sites ──────────────────────────
// Fetches actual listing pages, extracts real URLs from HTML links,
// then uses Claude to structure the data. No invented URLs.

function fetchHtml(url) {
  return new Promise((resolve) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`
      const proto = fullUrl.startsWith('https') ? https : http
      const req = proto.get(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        }
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirect = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, fullUrl).toString()
          return fetchHtml(redirect).then(resolve)
        }
        let data = ''
        res.on('data', chunk => { data += chunk; if (data.length > 300000) res.destroy() })
        res.on('end', () => resolve({ html: data, finalUrl: fullUrl }))
        res.on('error', () => resolve({ html: '', finalUrl: fullUrl }))
      })
      req.on('error', () => resolve({ html: '', finalUrl: fullUrl }))
      req.setTimeout(15000, () => { req.destroy(); resolve({ html: '', finalUrl: fullUrl }) })
    } catch { resolve({ html: '', finalUrl: url }) }
  })
}

// Extract all anchor hrefs from HTML matching a pattern
function extractLinks(html, baseUrl, pattern) {
  const links = new Set()
  const re = /href=["']([^"'#?][^"']*?)["']/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const href = m[1]
    if (pattern.test(href)) {
      try {
        const abs = href.startsWith('http') ? href : new URL(href, baseUrl).toString()
        links.add(abs)
      } catch {}
    }
  }
  return [...links]
}

// Strip HTML tags and collapse whitespace
function htmlToText(html, maxLen = 6000) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

// Official PT sources to scrape
const OFFICIAL_SOURCES = [
  {
    name: 'Portugal 2030',
    listUrl: 'https://portugal2030.pt/avisos/',
    linkPattern: /portugal2030\.pt\/avisos\/[a-z0-9-]{5,}/,
    category: 'inovacao', region: 'nacional'
  },
  {
    name: 'ANI',
    listUrl: 'https://www.ani.pt/pt/financiamento/programas-nacionais/',
    linkPattern: /ani\.pt\/pt\/financiamento\/.+/,
    category: 'investigacao', region: 'nacional'
  },
  {
    name: 'IAPMEI',
    listUrl: 'https://www.iapmei.pt/PRODUTOS-E-SERVICOS/Financiamento-e-Capital.aspx',
    linkPattern: /iapmei\.pt\/PRODUTOS-E-SERVICOS\/.+\.aspx/,
    category: 'inovacao', region: 'nacional'
  },
  {
    name: 'Compete 2020 / PT2030',
    listUrl: 'https://www.compete2020.gov.pt/candidaturas',
    linkPattern: /compete2020\.gov\.pt\/candidaturas\/.+/,
    category: 'inovacao', region: 'nacional'
  },
  {
    name: 'Banco de Fomento',
    listUrl: 'https://www.bportugal.pt/page/linhas-de-credito',
    linkPattern: /bportugal\.pt\/page\/.+|bfp\.pt\/.+/,
    category: 'inovacao', region: 'nacional'
  },
  {
    name: 'FCT',
    listUrl: 'https://www.fct.pt/apoios/',
    linkPattern: /fct\.pt\/apoios\/.+/,
    category: 'investigacao', region: 'nacional'
  },
  {
    name: 'IEFP',
    listUrl: 'https://www.iefp.pt/apoios-emprego',
    linkPattern: /iefp\.pt\/(apoios|emprego|medidas)\/.+/,
    category: 'emprego', region: 'nacional'
  },
  {
    name: 'Turismo de Portugal',
    listUrl: 'https://business.turismodeportugal.pt/pt/Investir/Apoios/Paginas/default.aspx',
    linkPattern: /turismodeportugal\.pt\/.+\/Apoios\/.+/,
    category: 'turismo', region: 'nacional'
  }
]

async function crawlOfficialSites() {
  console.log('[Crawler] Real site scraper — fetching official PT sources...')
  const Anthropic = require('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let totalAdded = 0

  for (const source of OFFICIAL_SOURCES) {
    try {
      console.log(`[Scraper] → ${source.name}: ${source.listUrl}`)
      const { html: listHtml, finalUrl } = await fetchHtml(source.listUrl)
      if (!listHtml || listHtml.length < 500) {
        console.log(`[Scraper]   ${source.name}: empty response, skipping`)
        continue
      }

      // Extract real links from the listing page
      const links = extractLinks(listHtml, finalUrl, source.linkPattern).slice(0, 12)
      console.log(`[Scraper]   ${source.name}: found ${links.length} grant links`)

      // Also extract text from the listing page itself
      const listText = htmlToText(listHtml, 4000)

      // Fetch each detail page and collect text
      const detailTexts = []
      for (const link of links.slice(0, 8)) {
        try {
          const { html: detailHtml } = await fetchHtml(link)
          if (detailHtml && detailHtml.length > 500) {
            detailTexts.push({ url: link, text: htmlToText(detailHtml, 3000) })
          }
        } catch {}
        await new Promise(r => setTimeout(r, 300))
      }

      // Build context for Claude: real URLs + real page text
      const context = [
        `PÁGINA DE LISTAGEM (${source.listUrl}):\n${listText}`,
        ...detailTexts.map(d => `\nPÁGINA DO PROGRAMA (${d.url}):\n${d.text}`)
      ].join('\n\n---\n\n')

      // Ask Claude to extract structured grants from the REAL page content
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        messages: [{
          role: 'user',
          content: `Extrai todos os programas/fundos de financiamento do conteúdo REAL das páginas oficiais abaixo.

REGRAS OBRIGATÓRIAS:
- O campo "url" deve ser EXACTAMENTE um dos URLs que aparecem no conteúdo abaixo — nunca inventes um URL
- Se um programa não tem URL específico no conteúdo, omite o campo url (ou coloca null)
- Extrai apenas o que está EXPLICITAMENTE mencionado no conteúdo
- max_amount e cofinancing_rate apenas se estiverem mencionados no texto

CONTEÚDO REAL DAS PÁGINAS:
${context}

Responde APENAS em JSON:
{
  "grants": [
    {
      "title": "Nome exacto do programa como aparece na página",
      "source": "${source.name}",
      "description": "Descrição baseada no texto da página (2-3 frases)",
      "max_amount": null,
      "min_amount": null,
      "deadline": null,
      "eligible_sectors": [],
      "eligible_sizes": ["micro", "pequena", "média", "grande"],
      "funding_type": "fundo_perdido",
      "region": "${source.region}",
      "category": "${source.category}",
      "cofinancing_rate": null,
      "url": "https://url-exacto-que-aparece-na-pagina.pt"
    }
  ]
}`
        }]
      })

      const raw = msg.content[0].text
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue

      let parsed
      try { parsed = JSON.parse(jsonMatch[0]) } catch { continue }

      for (const g of parsed.grants || []) {
        if (!g.title || g.title.length < 5) continue
        // Only accept URLs that were actually in our scraped content
        const urlOk = !g.url || links.some(l => l === g.url) || g.url === source.listUrl
        const added = upsertGrant({
          ...g,
          url: urlOk ? (g.url || '') : '',
          eligible_countries: ['PT'],
          call_status: g.deadline && new Date(g.deadline) < new Date() ? 'closed' : 'open'
        })
        if (added) totalAdded++
      }

      console.log(`[Scraper]   ${source.name}: +${totalAdded} total so far`)
      await new Promise(r => setTimeout(r, 800))

    } catch (err) {
      console.log(`[Scraper] ${source.name} error:`, err.message)
    }
  }

  console.log(`[Crawler] Official sites scraper: +${totalAdded} new grants`)
  return totalAdded
}

// ── Alertas ────────────────────────────────────────────────────────────────

function insertCrawlAlert(count, source) {
  if (count <= 0) return
  db.prepare(`INSERT INTO alerts (type, message, is_read) VALUES ('new_grant', ?, 0)`)
    .run(`🕷️ Crawler descobriu ${count} novos fundos em ${source}`)
}

function checkReopenedGrants() {
  const subs = db.prepare(`
    SELECT ns.grant_id, ns.label, g.call_status, g.title
    FROM notification_subscriptions ns
    JOIN grants g ON ns.grant_id = g.id
    WHERE g.call_status = 'open'
  `).all()

  for (const sub of subs) {
    const existing = db.prepare(`
      SELECT id FROM alerts
      WHERE type = 'reopen_notification' AND grant_id = ?
      AND created_at > datetime('now', '-7 days')
    `).get(sub.grant_id)
    if (existing) continue
    db.prepare(`INSERT INTO alerts (type, message, grant_id, is_read) VALUES ('reopen_notification', ?, ?, 0)`)
      .run(`🔔 "${sub.title}" abriu candidaturas!`, sub.grant_id)
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function runCrawler() {
  console.log('[Crawler] Starting full crawl...')
  const t = Date.now()

  // Auto-update call_status before crawl
  db.prepare(`
    UPDATE grants SET call_status = CASE
      WHEN deadline IS NOT NULL AND deadline < date('now') THEN 'closed'
      WHEN deadline IS NOT NULL AND julianday(deadline) - julianday('now') > 365 THEN 'upcoming'
      ELSE 'open'
    END WHERE is_active = 1
  `).run()

  const countBefore = db.prepare('SELECT COUNT(*) as c FROM grants').get().c

  // Apenas EU Portal oficial — crawlWithAI desativado (gerava duplicados/inventados)
  const [euCount, scrapedCount] = await Promise.allSettled([
    crawlEUPortal(),
    crawlOfficialSites()
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : 0))

  insertCrawlAlert(euCount, 'EU Funding Portal')
  insertCrawlAlert(scrapedCount, 'Sites Oficiais PT')
  checkReopenedGrants()

  const countAfter = db.prepare('SELECT COUNT(*) as c FROM grants').get().c

  console.log(`[Crawler] Done in ${((Date.now() - t) / 1000).toFixed(1)}s. Total: ${countAfter} grants (+${countAfter - countBefore} new). EU=${euCount}, Scraped=${scrapedCount}`)
  return { eu: euCount, ai: 0, scraped: scrapedCount, total: countAfter, added: countAfter - countBefore }
}

module.exports = { runCrawler, crawlOfficialSites }
