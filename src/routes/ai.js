const express = require('express')
const https = require('https')
const http = require('http')
const Anthropic = require('@anthropic-ai/sdk')
const db = require('../db/database')
const router = express.Router()

function fetchRawHtml(url, extraHeaders = {}) {
  return new Promise((resolve) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`
      const proto = fullUrl.startsWith('https') ? https : http
      const req = proto.get(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
          ...extraHeaders
        }
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchRawHtml(res.headers.location, extraHeaders).then(resolve)
        }
        let data = ''
        res.on('data', chunk => { data += chunk; if (data.length > 150000) res.destroy() })
        res.on('end', () => resolve(data))
        res.on('error', () => resolve(''))
      })
      req.on('error', () => resolve(''))
      req.setTimeout(12000, () => { req.destroy(); resolve('') })
    } catch { resolve('') }
  })
}

function fetchWebsiteText(url) {
  return fetchRawHtml(url).then(html => {
    if (!html) return ''

    // Extract meta description / og tags / twitter cards
    const getMeta = (pattern) => (html.match(pattern) || [])[1]?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() || ''
    const metaDesc = getMeta(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']{0,400})["']/i)
      || getMeta(/<meta[^>]*content=["']([^"']{0,400})["'][^>]*name=["']description["']/i)
    const ogDesc = getMeta(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']{0,400})["']/i)
      || getMeta(/<meta[^>]*content=["']([^"']{0,400})["'][^>]*property=["']og:description["']/i)
    const ogTitle = getMeta(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']{0,200})["']/i)
      || getMeta(/<meta[^>]*content=["']([^"']{0,200})["'][^>]*property=["']og:title["']/i)
    const pageTitle = getMeta(/<title[^>]*>([^<]{0,200})<\/title>/i)

    // Extract JSON-LD structured data (schema.org — often has company/product details)
    const jsonLdParts = []
    const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let ldMatch
    while ((ldMatch = ldRe.exec(html)) !== null && jsonLdParts.length < 3) {
      try { jsonLdParts.push(JSON.stringify(JSON.parse(ldMatch[1]))) } catch {}
    }

    // Extract visible text
    const bodyText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const parts = [
      pageTitle && `Título da página: ${pageTitle}`,
      ogTitle && `Título OG: ${ogTitle}`,
      metaDesc && `Meta descrição: ${metaDesc}`,
      ogDesc && ogDesc !== metaDesc && `Descrição OG: ${ogDesc}`,
      jsonLdParts.length && `Dados estruturados (schema.org): ${jsonLdParts.join(' | ').slice(0, 2000)}`,
      `Conteúdo: ${bodyText.slice(0, 4000)}`
    ].filter(Boolean)

    return parts.join('\n').slice(0, 7000)
  })
}

// Lookup company data by NIF via public Portuguese sources
async function fetchNifData(nif) {
  const cleanNif = nif.replace(/\D/g, '')
  if (cleanNif.length !== 9) return null

  // Validate NIF checksum (Portuguese NIF validation)
  const digits = cleanNif.split('').map(Number)
  const checkDigit = digits[8]
  const sum = digits.slice(0, 8).reduce((acc, d, i) => acc + d * (9 - i), 0)
  const expected = 11 - (sum % 11)
  const valid = (expected >= 10 ? 0 : expected) === checkDigit
  if (!valid) return { nif: cleanNif, valid: false, error: 'NIF inválido' }

  try {
    // Try multiple sources in parallel
    const [racHtml, nifHtml] = await Promise.all([
      fetchRawHtml(`https://www.racius.com/empresa/${cleanNif}/`),
      fetchRawHtml(`https://www.nif.pt/${cleanNif}/`)
    ])

    // Extract text from whichever source has more company-specific data
    const extractText = (html) => html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const racText = extractText(racHtml)
    const nifText = extractText(nifHtml)

    // Pick the one with more relevant content (racius has more company data if available)
    const combined = [
      racText.length > 500 && !racText.includes('Não existem resultados') ? `Racius: ${racText.slice(0, 2000)}` : '',
      nifText.length > 200 ? `NIF.pt: ${nifText.slice(0, 1500)}` : ''
    ].filter(Boolean).join('\n')

    return {
      nif: cleanNif,
      valid: true,
      registry_text: combined.slice(0, 3000) || '(dados de registo não disponíveis via scraping — fontes usam JavaScript)'
    }
  } catch {
    return { nif: cleanNif, valid: true, registry_text: '(erro ao aceder aos registos)' }
  }
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Match all grants against company profile and score them (batched)
router.post('/match', async (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get()
    if (!profile || !profile.description) {
      return res.status(400).json({ error: 'Preenche o perfil da empresa primeiro' })
    }

    const grants = db.prepare('SELECT * FROM grants WHERE is_active = 1').all()
    if (!grants.length) return res.json({ scored: 0 })

    const profileText = `- Nome: ${profile.name || 'N/D'}
- Setor: ${profile.sector || 'N/D'}
- Dimensão: ${profile.size || 'N/D'}
- Localização: ${profile.location || 'N/D'}
- Fase: ${profile.stage || 'N/D'}
- Descrição: ${profile.description}
- Fundada em: ${profile.founded_year || 'N/D'}
- Colaboradores: ${profile.employees || 'N/D'}
- Volume de negócios anual: €${profile.annual_revenue?.toLocaleString() || 'N/D'}`

    const BATCH_SIZE = 60
    const allScores = []

    for (let i = 0; i < grants.length; i += BATCH_SIZE) {
      const batch = grants.slice(i, i + BATCH_SIZE)
      const grantsText = batch.map(g => `ID:${g.id} | ${g.title} (${g.source}) — ${g.description?.slice(0, 180)} | Setores: ${g.eligible_sectors} | Dimensões: ${g.eligible_sizes} | Valor máx: €${g.max_amount?.toLocaleString() || 'N/D'}`).join('\n')

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `És um especialista em financiamentos e subsídios portugueses e europeus.

Perfil da empresa:
${profileText}

Fundos disponíveis (lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(grants.length / BATCH_SIZE)}):
${grantsText}

Para cada fundo, atribui uma pontuação de relevância de 0 a 100 para esta empresa específica, com uma justificação curta (1-2 frases) em português.

Responde APENAS em JSON válido neste formato exato:
{
  "scores": [
    {"id": 1, "score": 85, "reason": "Justificação..."},
    {"id": 2, "score": 20, "reason": "Justificação..."}
  ]
}`
        }]
      })

      const raw = message.content[0].text
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue
      try {
        const parsed = JSON.parse(jsonMatch[0])
        allScores.push(...(parsed.scores || []))
      } catch {}
    }

    const update = db.prepare('UPDATE grants SET ai_relevance_score = ?, ai_relevance_reason = ?, updated_at = datetime(\'now\') WHERE id = ?')
    const updateMany = db.transaction((scores) => {
      for (const s of scores) update.run(s.score, s.reason, s.id)
    })
    updateMany(allScores)

    res.json({ scored: allScores.length })
  } catch (err) {
    console.error('AI match error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Search for grants (AI knowledge + save to DB)
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `És um especialista em financiamentos portugueses e europeus.

${profile ? `Perfil da empresa: setor=${profile.sector}, dimensão=${profile.size}, descrição=${profile.description}` : ''}

Pesquisa: "${query}"

Lista até 8 oportunidades de financiamento relevantes para esta pesquisa, incluindo fundos portugueses (PT2030, PRR, IAPMEI, ANI, FCT, AICEP) e europeus (Horizonte Europa, LIFE, COSME, InvestEU, etc.) que existam ou tenham existido recentemente.

Para cada fundo indica:
- "max_amount": o montante máximo REAL do programa (ex: EIC Accelerator = 2500000, SI Inovação = 25000000)
- "url": URL DIRECTO e ESPECÍFICO da página do programa (não homepage genérica)
- "description": 3 frases: o que financia, quem pode candidatar-se e taxa de co-financiamento
- "cofinancing_rate": taxa de co-financiamento real (ex: 45, 70, 100)

Responde APENAS em JSON válido:
{
  "grants": [
    {
      "title": "Nome exacto do fundo",
      "source": "Entidade financiadora",
      "description": "Descrição específica de 3 frases com elegibilidade e taxa",
      "max_amount": 500000,
      "min_amount": 10000,
      "cofinancing_rate": 45,
      "funding_type": "fundo_perdido",
      "category": "inovacao",
      "deadline": "2026-12-31",
      "eligible_sectors": ["setor1", "setor2"],
      "eligible_sizes": ["micro", "pequena", "média"],
      "url": "https://url-directo-especifico.pt"
    }
  ]
}`
      }]
    })

    const raw = message.content[0].text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI response format error')
    const parsed = JSON.parse(jsonMatch[0])

    const insert = db.prepare(`
      INSERT OR IGNORE INTO grants (title, source, description, max_amount, min_amount, deadline,
        eligible_sectors, eligible_sizes, eligible_countries, url, funding_type, category,
        cofinancing_rate, funding_rate, call_status, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 1)
    `)
    const insertMany = db.transaction((grants) => {
      const ids = []
      for (const g of grants) {
        const r = insert.run(
          g.title, g.source, g.description, g.max_amount || null, g.min_amount || null,
          g.deadline || null,
          JSON.stringify(g.eligible_sectors || []), JSON.stringify(g.eligible_sizes || []),
          JSON.stringify(['PT']),
          g.url || null,
          g.funding_type || 'fundo_perdido',
          g.category || 'inovacao',
          g.cofinancing_rate || null,
          g.funding_rate || g.cofinancing_rate || null
        )
        if (r.lastInsertRowid) ids.push(r.lastInsertRowid)
      }
      return ids
    })
    const ids = insertMany(parsed.grants || [])

    res.json({ added: ids.length, ids })
  } catch (err) {
    console.error('AI search error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Draft application answer for a specific grant question
router.post('/draft', async (req, res) => {
  try {
    const { grant_id, question, context } = req.body
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get()
    const grant = db.prepare('SELECT * FROM grants WHERE id = ?').get(grant_id)

    if (!grant) return res.status(404).json({ error: 'Fundo não encontrado' })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `És um consultor especialista em candidaturas a fundos e subsídios portugueses.

Empresa:
- Nome: ${profile?.name || 'N/D'}
- Setor: ${profile?.sector || 'N/D'}
- Dimensão: ${profile?.size || 'N/D'}
- Descrição: ${profile?.description || 'N/D'}
- Fase: ${profile?.stage || 'N/D'}
- Colaboradores: ${profile?.employees || 'N/D'}

Fundo: ${grant.title} (${grant.source})
Descrição do fundo: ${grant.description}

${context ? `Contexto adicional da empresa: ${context}` : ''}

Questão da candidatura: "${question}"

Escreve uma resposta completa, profissional e convincente em português europeu para esta questão. A resposta deve:
- Ser específica para esta empresa e este fundo
- Destacar pontos fortes e alinhamento com os objetivos do fundo
- Ter entre 150-400 palavras
- Usar linguagem formal e técnica apropriada

Escreve APENAS a resposta, sem introduções ou explicações.`
      }]
    })

    res.json({ draft: message.content[0].text })
  } catch (err) {
    console.error('AI draft error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Analyze application completeness
router.post('/analyze', async (req, res) => {
  try {
    const { application_id } = req.body
    const app = db.prepare(`
      SELECT a.*, g.title as grant_title, g.description as grant_description
      FROM applications a LEFT JOIN grants g ON a.grant_id = g.id
      WHERE a.id = ?
    `).get(application_id)
    if (!app) return res.status(404).json({ error: 'Candidatura não encontrada' })

    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get()
    const draftContent = app.draft_content ? JSON.parse(app.draft_content) : {}

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Analisa esta candidatura ao fundo "${app.grant_title}" e dá feedback construtivo.

Perfil da empresa: ${profile?.description || 'N/D'}
Fundo: ${app.grant_title} — ${app.grant_description?.slice(0, 300)}

Conteúdo da candidatura:
${Object.entries(draftContent).map(([k, v]) => `${k}: ${v}`).join('\n') || 'Sem conteúdo ainda'}

Notas adicionais: ${app.notes || 'Nenhuma'}

Dá um feedback estruturado em JSON:
{
  "score": 75,
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "improvements": ["melhoria 1", "melhoria 2"],
  "missing": ["informação em falta 1"],
  "summary": "Resumo geral de 2 frases"
}`
      }]
    })

    const raw = message.content[0].text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI response format error')
    res.json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('AI analyze error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Match grants for a specific project (more detailed than company-level match)
router.post('/match-project', async (req, res) => {
  try {
    const { project_id } = req.body
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id)
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' })

    const grants = db.prepare("SELECT * FROM grants WHERE is_active = 1").all()
    if (!grants.length) return res.json({ scored: 0 })

    const grantsText = grants.map(g =>
      `ID:${g.id} | ${g.title} (${g.source}) | Setores: ${g.eligible_sectors} | Entidades: ${g.eligible_entities || 'todos'} | TRL: ${g.trl_min || 1}-${g.trl_max || 9} | Taxa: ${g.funding_rate || g.cofinancing_rate || 'N/D'}% | Consórcio: ${g.consortium_required ? 'Sim' : 'Não'}`
    ).join('\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `És um especialista em fundos europeus e portugueses.

Projeto:
- Nome: ${project.name}
- Setor: ${project.sector || 'N/D'}
- Localização: ${project.location || 'N/D'}
- Orçamento: €${project.budget?.toLocaleString() || 'N/D'}
- TRL: ${project.trl || 'N/D'}
- Tipo de entidade: ${project.entity_type || 'N/D'}
- Consórcio: ${project.consortium ? 'Sim' : 'Não'}
- Descrição: ${project.description || 'N/D'}

Fundos disponíveis:
${grantsText}

Para cada fundo, avalia:
1. Compatibilidade de setor (0-100)
2. Compatibilidade de financiamento (taxa e montante adequados ao orçamento)
3. Elegibilidade (TRL, tipo de entidade, consórcio)
4. Score geral (0-100)

Responde APENAS em JSON:
{
  "scores": [
    {"id": 1, "score": 85, "sector_match": 90, "finance_match": 80, "eligibility": true, "reason": "Justificação em português"}
  ]
}`
      }]
    })

    const raw = message.content[0].text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI response format error')
    const parsed = JSON.parse(jsonMatch[0])

    // Enrich scores with grant titles and max_amount
    const grantMap = {}
    grants.forEach(g => { grantMap[g.id] = g })
    const enriched = parsed.scores.map(s => ({
      ...s,
      title: grantMap[s.id]?.title || null,
      max_amount: grantMap[s.id]?.max_amount || null,
      source: grantMap[s.id]?.source || null,
    }))

    res.json({ scored: enriched.length, scores: enriched })
  } catch (err) {
    console.error('AI match-project error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Quick Match — Step 1: analyze website (+ optional NIF) and suggest 3 projects
router.post('/quickmatch/analyze', async (req, res) => {
  try {
    const { website_url, nif } = req.body
    if (!website_url && !nif) return res.status(400).json({ error: 'website_url ou nif obrigatório' })

    // Fetch website content and NIF data in parallel
    const [websiteText, nifData] = await Promise.all([
      website_url ? fetchWebsiteText(website_url) : Promise.resolve(''),
      nif ? fetchNifData(nif) : Promise.resolve(null)
    ])

    const domain = website_url ? website_url.replace(/^https?:\/\//, '').split('/')[0] : ''

    // Build context sections
    const nifSection = nifData ? `
DADOS DE REGISTO DA EMPRESA (NIF ${nifData.nif}):
${nifData.valid === false ? `- NIF INVÁLIDO: ${nifData.error}` : `- NIF válido: ${nifData.nif}
- Dados dos registos públicos:
${nifData.registry_text || '(não disponível)'}`}
` : ''

    const websiteSection = websiteText ? `
CONTEÚDO DO WEBSITE (${domain}):
${websiteText}
` : `(website não disponível ou inacessível)`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `És um especialista em fundos europeus e portugueses. Analisa os dados abaixo sobre uma empresa portuguesa e extrai informação detalhada sobre o seu modelo de negócio.

${nifSection}
${websiteSection}

Com base nesta análise:
1. Identifica o nome, setor real e dimensão estimada da empresa
2. Determina o CAE principal (código de 4-5 dígitos): usa os dados de registo se disponíveis; caso contrário INFERE o CAE correto com base no modelo de negócio (ex: e-commerce = 47910, software = 62010, consultoria TI = 62020, turismo = 55110, restauração = 56101, construção = 41200, manufactura = usa CAE apropriado)
3. Descreve o modelo de negócio em 1-2 frases concretas (o que faz, para quem, como ganha dinheiro)
4. Sugere 3 projectos de investimento REAIS e específicos para ESTA empresa que sejam financiáveis por fundos PT/UE — baseados no que a empresa realmente faz, não em ideias genéricas

Os projectos devem ser:
- Específicos para o modelo de negócio desta empresa (não genéricos)
- Financiáveis pelo IAPMEI, PT2030, PRR, Horizonte Europa, etc.
- Com potencial real de criação de valor para a empresa
- Mencionam quais os fundos mais prováveis para esse tipo de projecto

IMPORTANTE: Todos os campos abaixo são OBRIGATÓRIOS. Para cae_code: usa dados de registo se disponíveis, caso contrário infere sempre com base no sector (NUNCA omitas este campo).

Responde APENAS em JSON válido com TODOS estes campos:
{
  "company_name": "Nome da empresa (usa o domínio se não detectado)",
  "company_summary": "O que a empresa faz concretamente em 1-2 frases",
  "sector": "setor principal (ex: comércio eletrónico, tecnologia, manufatura, turismo...)",
  "cae_code": "OBRIGATÓRIO: código CAE de 4-5 dígitos inferido ou do registo (ex: 47910 para e-commerce, 62010 para software, 62020 para consultoria TI, 56101 para restauração, 55110 para hotelaria, 41200 para construção)",
  "cae_description": "OBRIGATÓRIO: descrição do CAE (ex: Comércio a retalho por correspondência ou via internet)",
  "size_estimate": "micro|pequena|média|grande",
  "location": "localidade/região (ou 'Portugal' se não especificado)",
  "nif_confirmed": "${nif || ''}",
  "projects": [
    {
      "title": "Nome do projecto concreto e específico",
      "description": "2 frases sobre o que este projecto específico visa alcançar para ESTA empresa e como",
      "category": "inovacao|internacionalizacao|sustentabilidade|digital|formacao",
      "icon": "emoji relevante",
      "eligible_funds": ["PT2030", "IAPMEI", "Horizonte Europa"]
    }
  ]
}`
      }]
    })

    const raw = message.content[0].text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI response format error')
    const result = JSON.parse(jsonMatch[0])

    // Ensure NIF fields are always populated
    if (nif && nifData?.valid !== false) {
      result.nif_confirmed = result.nif_confirmed || nif.replace(/\D/g, '')
    }

    // If CAE was not returned, make a quick follow-up inference call
    if (!result.cae_code && result.sector) {
      const caeMsg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Para uma empresa portuguesa com o seguinte sector: "${result.sector}" e modelo de negócio: "${result.company_summary}", qual é o código CAE (Classificação Portuguesa de Atividades Económicas) mais provável?

Responde APENAS em JSON: {"cae_code": "XXXXX", "cae_description": "Descrição do CAE"}`
        }]
      })
      try {
        const caeRaw = caeMsg.content[0].text
        const caeMatch = caeRaw.match(/\{[\s\S]*\}/)
        if (caeMatch) {
          const caeData = JSON.parse(caeMatch[0])
          result.cae_code = caeData.cae_code
          result.cae_description = caeData.cae_description
        }
      } catch {}
    }

    res.json(result)
  } catch (err) {
    console.error('Quick Match analyze error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Quick Match — Step 2: match selected project against grants
router.post('/quickmatch/match', async (req, res) => {
  try {
    const { project_title, project_description, project_category, company_summary, company_sector, company_cae, company_size, company_location } = req.body
    if (!project_description) return res.status(400).json({ error: 'project_description obrigatório' })

    // Pre-filter grants by category if available, otherwise take all active
    const hasCategory = project_category && project_category !== 'todos'
    const grants = db.prepare(`
      SELECT id, title, source, description, max_amount, min_amount, deadline,
             eligible_sectors, eligible_sizes, funding_type, funding_rate, cofinancing_rate,
             call_status, url, category, region
      FROM grants
      WHERE is_active = 1 AND call_status != 'closed'
        AND (? = 0 OR LOWER(COALESCE(category,'')) = LOWER(?) OR category IS NULL)
      ORDER BY RANDOM()
      LIMIT 80
    `).all(hasCategory ? 1 : 0, project_category || '')

    if (!grants.length) return res.json({ matches: [] })

    const grantsText = grants.map(g =>
      `ID:${g.id} | "${g.title}" (${g.source}) | ${g.description?.slice(0, 150) || ''} | Máx: €${g.max_amount?.toLocaleString() || 'N/D'} | Taxa: ${g.funding_rate || g.cofinancing_rate || '?'}% | Prazo: ${g.deadline || 'aberto'}`
    ).join('\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      messages: [{
        role: 'user',
        content: `És um especialista em financiamentos PT/UE. Analisa o projecto abaixo e pontua cada fundo pela sua adequação.

PROJECTO:
- Título: ${project_title || 'Projecto empresarial'}
- Descrição: ${project_description}
- Empresa: ${company_summary || 'N/D'}
- Sector: ${company_sector || 'N/D'}
- CAE: ${company_cae || 'N/D'}
- Dimensão: ${company_size || 'N/D'}
- Localização: ${company_location || 'Portugal'}

FUNDOS DISPONÍVEIS:
${grantsText}

Para cada fundo, atribui uma pontuação de 0-100 baseada em:
- Alinhamento temático com o projecto (35%)
- Elegibilidade da empresa por sector/CAE/dimensão (35%)
- Condições financeiras e critérios de acesso (30%)

Usa o CAE (${company_cae || 'N/D'}) para verificar elegibilidade sectorial e a dimensão (${company_size || 'N/D'}) para filtrar fundos por tipologia de empresa.

Inclui APENAS os fundos com score >= 40. Ordena por score decrescente. Máximo 12 resultados.

Responde APENAS em JSON válido:
{
  "total_analyzed": 80,
  "matches": [
    {
      "id": 1,
      "score": 85,
      "reason": "Justificação curta de 1 frase em português"
    }
  ]
}`
      }]
    })

    const raw = message.content[0].text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI response format error')
    const parsed = JSON.parse(jsonMatch[0])

    // Enrich with full grant data
    const grantMap = Object.fromEntries(grants.map(g => [g.id, g]))
    const enriched = (parsed.matches || [])
      .filter(m => grantMap[m.id])
      .map(m => {
        const g = grantMap[m.id]
        return {
          ...g,
          score: m.score,
          reason: m.reason,
          eligible_sectors: tryParse(g.eligible_sectors),
          eligible_sizes: tryParse(g.eligible_sizes),
        }
      })
      .sort((a, b) => b.score - a.score)

    res.json({ total_analyzed: parsed.total_analyzed || grants.length, matches: enriched })
  } catch (err) {
    console.error('Quick Match error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Enrich grants with missing max_amount and specific URLs
router.post('/enrich', async (req, res) => {
  try {
    // Get grants missing max_amount or with generic/no URLs (process in batches of 10)
    const grants = db.prepare(`
      SELECT id, title, source, description, category, region, url FROM grants
      WHERE (
        max_amount IS NULL
        OR url IS NULL OR url = ''
        OR url LIKE '%opportunities/portal%'
        OR url NOT LIKE '%/%/%'
      )
        AND is_active = 1
      LIMIT 20
    `).all()

    if (!grants.length) return res.json({ enriched: 0, message: 'Todos os fundos já têm dados completos' })

    const grantsText = grants.map(g =>
      `ID:${g.id} | "${g.title}" | Fonte: ${g.source} | Categoria: ${g.category || 'N/D'} | URL actual: ${g.url || 'nenhum'}`
    ).join('\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `És um especialista em fundos europeus e portugueses com conhecimento detalhado de todos os programas activos até 2026.

Para cada fundo abaixo, fornece informação REAL e VERIFICÁVEL:

1. max_amount: montante máximo elegível exacto em euros (ex: 2500000 para €2.5M)
2. url: URL DIRECTO E ESPECÍFICO para a página oficial desse programa específico.
   - OBRIGATÓRIO: o URL deve ter um path com o nome/código do programa (ex: /programa/si-inovacao/candidaturas)
   - PROIBIDO: homepages genéricas como https://compete2030.pt/ ou https://www.iapmei.pt/ sem path
   - PROIBIDO: URLs inventados — só inclui URLs que existem de facto
   - Se não tens a certeza do URL exacto, coloca null
3. funding_rate: taxa de cofinanciamento a fundo perdido (%)
4. description_extra: 1 frase extra específica com condições ou elegibilidade

Fundos a enriquecer:
${grantsText}

Responde APENAS em JSON válido:
{
  "grants": [
    {
      "id": 1,
      "max_amount": 2500000,
      "min_amount": 25000,
      "url": "https://www.compete2020.gov.pt/candidaturas/detalhe/aviso-si-inovacao-2024",
      "funding_rate": 45,
      "description_extra": "Apoio a projectos de inovação produtiva em PMEs industriais com criação de emprego qualificado."
    }
  ]
}`
      }]
    })

    const raw = message.content[0].text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI response format error')

    let parsed
    try { parsed = JSON.parse(jsonMatch[0]) }
    catch { throw new Error('Failed to parse AI response') }

    const update = db.prepare(`
      UPDATE grants SET
        max_amount = COALESCE(?, max_amount),
        min_amount = COALESCE(?, min_amount),
        url = CASE WHEN (? IS NOT NULL AND ? != '') THEN ? ELSE url END,
        funding_rate = COALESCE(?, funding_rate),
        updated_at = datetime('now')
      WHERE id = ?
    `)
    const isSpecificUrl = (url) => {
      if (!url || typeof url !== 'string') return false
      try {
        const u = new URL(url.startsWith('http') ? url : 'https://' + url)
        return u.pathname.length > 1 && u.pathname !== '/'
      } catch { return false }
    }

    const updateMany = db.transaction((items) => {
      let count = 0
      for (const g of items) {
        // Only save URLs that have a real specific path
        const url = isSpecificUrl(g.url) ? g.url : null
        update.run(
          g.max_amount || null,
          g.min_amount || null,
          url, url, url,
          g.funding_rate || null,
          g.id
        )
        count++
      }
      return count
    })

    const enriched = updateMany(parsed.grants || [])
    res.json({ enriched, total_processed: grants.length })
  } catch (err) {
    console.error('AI enrich error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Trigger real site scraper (verified URLs only)
router.post('/scrape', async (req, res) => {
  try {
    const { crawlOfficialSites } = require('../jobs/crawler')
    const added = await crawlOfficialSites()
    res.json({ added, message: `Scraping real concluído: +${added} fundos com URLs verificados` })
  } catch (err) {
    console.error('Scrape error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Fix URLs: for each institution, scrape their real listing pages and match to existing grants
router.post('/fix-urls', async (req, res) => {
  // Known listing pages per institution domain
  const INSTITUTION_PAGES = {
    'recuperarportugal.gov.pt': [
      'https://recuperarportugal.gov.pt/investimentos/',
      'https://recuperarportugal.gov.pt/avisos/'
    ],
    'pdr2030.pt': [
      'https://www.pdr2030.pt/avisos/',
      'https://www.pdr2030.pt/candidaturas/'
    ],
    'compete2030.pt': [
      'https://www.compete2030.gov.pt/candidaturas',
      'https://www.compete2020.gov.pt/candidaturas'
    ],
    'ani.pt': [
      'https://www.ani.pt/pt/financiamento/',
      'https://www.ani.pt/pt/financiamento/programas-nacionais/',
      'https://www.ani.pt/pt/financiamento/programas-europeus/'
    ],
    'fct.pt': [
      'https://www.fct.pt/apoios/',
      'https://www.fct.pt/concursos/'
    ],
    'marie-sklodowska-curie-actions.ec.europa.eu': [
      'https://marie-sklodowska-curie-actions.ec.europa.eu/calls',
      'https://marie-sklodowska-curie-actions.ec.europa.eu/actions'
    ],
    'ifap.pt': [
      'https://www.ifap.pt/apoios',
      'https://www.ifap.pt/candidaturas'
    ],
    'iapmei.pt': [
      'https://www.iapmei.pt/PRODUTOS-E-SERVICOS/Financiamento-e-Capital.aspx',
      'https://www.iapmei.pt/PRODUTOS-E-SERVICOS/Empreendedorismo-Inovacao.aspx'
    ],
    'erc.europa.eu': [
      'https://erc.europa.eu/apply-grant/open-calls',
      'https://erc.europa.eu/funding'
    ],
    'eeagrants.gov.pt': [
      'https://www.eeagrants.gov.pt/programas/',
      'https://www.eeagrants.gov.pt/candidaturas/'
    ],
    'iefp.pt': [
      'https://www.iefp.pt/apoios-emprego',
      'https://www.iefp.pt/empregadores'
    ],
    'portugalglobal.pt': [
      'https://www.portugalglobal.pt/pt/InvestirEmPortugal/apoios/',
      'https://www.portugalglobal.pt/pt/internacionalizar/apoios/'
    ],
    'erasmus-plus.ec.europa.eu': [
      'https://erasmus-plus.ec.europa.eu/programme-guide/part-b',
      'https://erasmus-plus.ec.europa.eu/opportunities'
    ],
    'bfp.pt': [
      'https://www.bfp.pt/empresas/',
      'https://www.bfp.pt/produtos/'
    ],
    'centro2030.pt': [
      'https://www.centro2030.pt/candidaturas/',
      'https://www.centro2030.pt/avisos/'
    ]
  }

  try {
    // Find all grants with generic URLs (no real path)
    const grants = db.prepare(`SELECT id, title, source, url FROM grants WHERE is_active=1`).all()
    const genericGrants = grants.filter(g => {
      if (!g.url) return true
      try {
        const u = new URL(g.url.startsWith('http') ? g.url : 'https://' + g.url)
        return u.pathname === '/' || u.pathname.length <= 1
      } catch { return true }
    })

    if (!genericGrants.length) return res.json({ fixed: 0, message: 'Todos os fundos já têm URLs específicos' })

    // Group by institution domain
    const byDomain = {}
    for (const g of genericGrants) {
      let domain = 'unknown'
      try { domain = new URL(g.url?.startsWith('http') ? g.url : 'https://' + (g.url || 'x')).hostname.replace('www.', '') }
      catch { domain = 'unknown' }
      if (!byDomain[domain]) byDomain[domain] = []
      byDomain[domain].push(g)
    }

    let totalFixed = 0
    const updateStmt = db.prepare(`UPDATE grants SET url=?, updated_at=datetime('now') WHERE id=?`)

    for (const [domain, domainGrants] of Object.entries(byDomain)) {
      const pages = INSTITUTION_PAGES[domain]
      if (!pages) continue

      console.log(`[fix-urls] ${domain}: ${domainGrants.length} grants to fix, fetching ${pages.length} pages`)

      // Fetch all listing pages for this institution
      const allLinks = []
      for (const pageUrl of pages) {
        try {
          const html = await fetchRawHtml(pageUrl)
          if (!html || html.length < 500) continue
          // Extract all <a href> links with meaningful paths
          const re = /href=["']([^"'#?][^"']*?)["']/gi
          let m
          while ((m = re.exec(html)) !== null) {
            const href = m[1]
            try {
              const abs = href.startsWith('http') ? href : new URL(href, pageUrl).toString()
              const u = new URL(abs)
              if (u.pathname.length > 1 && u.pathname !== '/') {
                allLinks.push(abs)
              }
            } catch {}
          }
        } catch (e) {
          console.log(`[fix-urls] fetch error ${pageUrl}:`, e.message)
        }
        await new Promise(r => setTimeout(r, 400))
      }

      // Deduplicate links
      const uniqueLinks = [...new Set(allLinks)].slice(0, 80)
      if (!uniqueLinks.length) {
        console.log(`[fix-urls] ${domain}: no links found, skipping`)
        continue
      }

      // Ask Claude to match each grant title to the best link
      const grantList = domainGrants.map(g => `ID:${g.id} — "${g.title}"`).join('\n')
      const linkList = uniqueLinks.join('\n')

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Tens uma lista de fundos/programas e uma lista de URLs reais retirados do site oficial ${domain}.

Para cada fundo, encontra o URL mais específico e relevante da lista de URLs abaixo.
- Usa APENAS URLs que estão na lista fornecida
- Se nenhum URL da lista corresponde ao fundo, coloca null
- Prefere URLs com o título ou código do programa no path

FUNDOS:
${grantList}

URLs DISPONÍVEIS:
${linkList}

Responde APENAS em JSON:
{
  "matches": [
    { "id": 123, "url": "https://url-especifico-da-lista.pt/programa" }
  ]
}`
        }]
      })

      const raw = msg.content[0].text
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue

      let parsed
      try { parsed = JSON.parse(jsonMatch[0]) } catch { continue }

      for (const match of parsed.matches || []) {
        if (!match.id || !match.url) continue
        // Verify the URL was actually in our link list (prevent hallucination)
        if (!uniqueLinks.includes(match.url)) continue
        updateStmt.run(match.url, match.id)
        totalFixed++
      }

      console.log(`[fix-urls] ${domain}: fixed so far ${totalFixed}`)
      await new Promise(r => setTimeout(r, 600))
    }

    res.json({ fixed: totalFixed, checked: genericGrants.length, message: `${totalFixed} fundos actualizados com URLs específicos` })
  } catch (err) {
    console.error('fix-urls error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Generate specific questions for a grant application
router.post('/questions', async (req, res) => {
  try {
    const { grant_id } = req.body
    const grant = db.prepare('SELECT * FROM grants WHERE id = ?').get(grant_id)
    if (!grant) return res.status(404).json({ error: 'Fundo não encontrado' })

    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `És um consultor especialista em candidaturas a fundos portugueses e europeus.

Fundo: ${grant.title}
Fonte: ${grant.source}
Tipo: ${grant.funding_type || 'fundo_perdido'}
Descrição: ${grant.description?.slice(0, 400) || 'N/D'}
Setores elegíveis: ${grant.eligible_sectors || 'todos'}
Entidades elegíveis: ${grant.eligible_entities || 'todas'}
TRL: ${grant.trl_min || 1}-${grant.trl_max || 9}
Consórcio obrigatório: ${grant.consortium_required ? 'Sim' : 'Não'}

Empresa:
- Setor: ${profile?.sector || 'N/D'}
- Dimensão: ${profile?.size || 'N/D'}
- Fase: ${profile?.stage || 'N/D'}

Gera as questões específicas que ESTE fundo normalmente exige numa candidatura, com base no tipo de programa, entidade financiadora e objetivos.

Inclui também os documentos tipicamente necessários para este tipo de candidatura.

Responde APENAS em JSON válido:
{
  "questions": [
    "Questão específica 1 para este fundo",
    "Questão específica 2",
    "..."
  ],
  "documents": [
    "Documento obrigatório 1",
    "Documento obrigatório 2",
    "..."
  ],
  "tips": [
    "Dica importante para esta candidatura específica"
  ]
}`
      }]
    })

    const raw = message.content[0].text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI response format error')
    res.json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('AI questions error:', err)
    res.status(500).json({ error: err.message })
  }
})

function tryParse(val) {
  try { return val ? JSON.parse(val) : [] } catch { return [] }
}

module.exports = router
