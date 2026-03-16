const express = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const db = require('../db/database')
const router = express.Router()

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Match all grants against company profile and score them
router.post('/match', async (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get()
    if (!profile || !profile.description) {
      return res.status(400).json({ error: 'Preenche o perfil da empresa primeiro' })
    }

    const grants = db.prepare('SELECT * FROM grants WHERE is_active = 1').all()
    if (!grants.length) return res.json({ scored: 0 })

    const grantsText = grants.map(g => `ID:${g.id} | ${g.title} (${g.source}) — ${g.description?.slice(0, 200)} | Setores: ${g.eligible_sectors} | Dimensões: ${g.eligible_sizes} | Valor máx: €${g.max_amount?.toLocaleString() || 'N/D'}`).join('\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `És um especialista em financiamentos e subsídios portugueses e europeus.

Perfil da empresa:
- Nome: ${profile.name || 'N/D'}
- Setor: ${profile.sector || 'N/D'}
- Dimensão: ${profile.size || 'N/D'}
- Localização: ${profile.location || 'N/D'}
- Fase: ${profile.stage || 'N/D'}
- Descrição: ${profile.description}
- Fundada em: ${profile.founded_year || 'N/D'}
- Colaboradores: ${profile.employees || 'N/D'}
- Volume de negócios anual: €${profile.annual_revenue?.toLocaleString() || 'N/D'}

Fundos disponíveis:
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
    if (!jsonMatch) throw new Error('AI response format error')
    const parsed = JSON.parse(jsonMatch[0])

    const update = db.prepare('UPDATE grants SET ai_relevance_score = ?, ai_relevance_reason = ?, updated_at = datetime(\'now\') WHERE id = ?')
    const updateMany = db.transaction((scores) => {
      for (const s of scores) update.run(s.score, s.reason, s.id)
    })
    updateMany(parsed.scores)

    res.json({ scored: parsed.scores.length })
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

Lista até 5 oportunidades de financiamento relevantes para esta pesquisa, incluindo fundos portugueses (PT2030, PRR, IAPMEI, ANI, FCT, AICEP) e europeus (Horizonte Europa, LIFE, COSME, InvestEU, etc.) que existam ou tenham existido recentemente.

Responde APENAS em JSON válido:
{
  "grants": [
    {
      "title": "Nome do fundo",
      "source": "Entidade financiadora",
      "description": "Descrição detalhada de 2-3 frases",
      "max_amount": 500000,
      "deadline": "2025-12-31",
      "eligible_sectors": ["setor1", "setor2"],
      "eligible_sizes": ["micro", "pequena", "média"],
      "url": "https://..."
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
      INSERT INTO grants (title, source, description, max_amount, deadline, eligible_sectors, eligible_sizes, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertMany = db.transaction((grants) => {
      const ids = []
      for (const g of grants) {
        const r = insert.run(g.title, g.source, g.description, g.max_amount, g.deadline,
          JSON.stringify(g.eligible_sectors || []), JSON.stringify(g.eligible_sizes || []), g.url)
        ids.push(r.lastInsertRowid)
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

module.exports = router
