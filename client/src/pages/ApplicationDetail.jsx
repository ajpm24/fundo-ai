import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'

const STATUSES = ['rascunho', 'em_curso', 'submetida', 'aprovada', 'rejeitada']

const COMMON_QUESTIONS = [
  'Descrição do projeto e objetivos principais',
  'Problema que a empresa resolve e proposta de valor',
  'Mercado-alvo e dimensão do mercado',
  'Equipa e competências relevantes',
  'Plano de implementação e calendarização',
  'Orçamento detalhado e justificação de custos',
  'Resultados esperados e indicadores de sucesso',
  'Impacto económico e social esperado',
  'Inovação e diferenciação face à concorrência',
  'Sustentabilidade do projeto após o financiamento',
]

export default function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeQ, setActiveQ] = useState(null)
  const [draftLoading, setDraftLoading] = useState(null)
  const [newQuestion, setNewQuestion] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => {
    fetch(`/api/applications/${id}`)
      .then(r => r.json())
      .then(d => { setApp(d); setLoading(false) })
  }

  useEffect(() => { load() }, [id])

  const save = async (updates = {}) => {
    setSaving(true)
    const payload = { ...app, ...updates, draft_content: app.draft_content || {} }
    await fetch(`/api/applications/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    setSaving(false)
    setMsg('✅ Guardado')
    setTimeout(() => setMsg(''), 2000)
  }

  const draftAnswer = async (question) => {
    setDraftLoading(question)
    try {
      const r = await fetch('/api/ai/draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_id: app.grant_id, question, context: app.notes })
      })
      const d = await r.json()
      if (d.draft) {
        setApp(prev => ({ ...prev, draft_content: { ...(prev.draft_content || {}), [question]: d.draft } }))
      }
    } catch {}
    finally { setDraftLoading(null) }
  }

  const analyzeApp = async () => {
    setAnalyzing(true)
    try {
      const r = await fetch('/api/ai/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: Number(id) })
      })
      const d = await r.json()
      setAnalysis(d)
    } catch {}
    finally { setAnalyzing(false) }
  }

  const addQuestion = () => {
    if (!newQuestion.trim()) return
    setApp(prev => ({ ...prev, draft_content: { ...(prev.draft_content || {}), [newQuestion]: '' } }))
    setActiveQ(newQuestion)
    setNewQuestion('')
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><span>A carregar...</span></div>
  if (!app || app.error) return <div className="page"><p>Candidatura não encontrada.</p></div>

  const draftContent = app.draft_content || {}
  const allQuestions = [...new Set([...COMMON_QUESTIONS, ...Object.keys(draftContent)])]

  return (
    <div className="page">
      <button className="btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>← Voltar</button>

      {/* Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{app.grant_source}</div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>{app.grant_title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={app.status} onChange={e => { setApp(p => ({ ...p, status: e.target.value })); save({ status: e.target.value }) }}
              style={{ width: 'auto', padding: '6px 10px' }}>
              {STATUSES.map(s => <option key={s} value={s}>{s === 'rascunho' ? 'Rascunho' : s === 'em_curso' ? 'Em Curso' : s === 'submetida' ? 'Submetida' : s === 'aprovada' ? 'Aprovada' : 'Rejeitada'}</option>)}
            </select>
            <button className="btn-primary" onClick={() => save()} disabled={saving}>
              {saving ? '...' : '💾 Guardar'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">Notas internas</label>
          <textarea placeholder="Contexto adicional sobre o projeto, pontos a destacar..." value={app.notes || ''}
            onChange={e => setApp(p => ({ ...p, notes: e.target.value }))} rows={3} />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn-secondary" onClick={analyzeApp} disabled={analyzing}>
            {analyzing ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />A analisar...</> : '🔍 Analisar Candidatura'}
          </button>
          {msg && <span style={{ fontSize: 13, color: 'var(--success)' }}>{msg}</span>}
        </div>
      </div>

      {/* AI Analysis */}
      {analysis && (
        <div className="card" style={{ marginBottom: 20, borderColor: analysis.score >= 70 ? 'var(--success)' : analysis.score >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
          <div className="flex-between" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>📊 Análise IA</h2>
            <span style={{ fontSize: 28, fontWeight: 800, color: analysis.score >= 70 ? 'var(--success)' : analysis.score >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
              {analysis.score}/100
            </span>
          </div>
          <p style={{ color: 'var(--muted)', marginBottom: 14 }}>{analysis.summary}</p>
          <div className="grid-2">
            {analysis.strengths?.length > 0 && (
              <div>
                <div className="label" style={{ color: 'var(--success)' }}>Pontos Fortes</div>
                {analysis.strengths.map((s, i) => <div key={i} style={{ fontSize: 13, padding: '4px 0', color: 'var(--text)' }}>✅ {s}</div>)}
              </div>
            )}
            {analysis.improvements?.length > 0 && (
              <div>
                <div className="label" style={{ color: 'var(--warning)' }}>Melhorias</div>
                {analysis.improvements.map((s, i) => <div key={i} style={{ fontSize: 13, padding: '4px 0', color: 'var(--text)' }}>💡 {s}</div>)}
              </div>
            )}
          </div>
          {analysis.missing?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="label" style={{ color: 'var(--danger)' }}>Informação em Falta</div>
              {analysis.missing.map((s, i) => <div key={i} style={{ fontSize: 13, padding: '4px 0' }}>❌ {s}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Questions & Draft Content */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📝 Conteúdo da Candidatura</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input placeholder="Adicionar questão personalizada..." value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addQuestion()} />
          <button className="btn-secondary" onClick={addQuestion} style={{ whiteSpace: 'nowrap' }}>+ Adicionar</button>
        </div>

        {allQuestions.map(q => (
          <div key={q} style={{ marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <label style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{q}</label>
              <button className="btn-secondary btn-sm" onClick={() => draftAnswer(q)} disabled={draftLoading === q}
                style={{ marginLeft: 12, whiteSpace: 'nowrap' }}>
                {draftLoading === q ? <><span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} />IA...</> : '✨ Redigir com IA'}
              </button>
            </div>
            <textarea
              value={draftContent[q] || ''}
              onChange={e => setApp(prev => ({ ...prev, draft_content: { ...(prev.draft_content || {}), [q]: e.target.value } }))}
              placeholder={`Resposta à questão: "${q}"...`}
              rows={draftContent[q] ? Math.min(Math.max(draftContent[q].split('\n').length + 2, 4), 12) : 3}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
