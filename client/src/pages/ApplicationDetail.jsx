import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'

const STATUSES = ['rascunho', 'em_curso', 'submetida', 'aprovada', 'rejeitada']
const STATUS_LABELS = { rascunho: 'Rascunho', em_curso: 'Em Curso', submetida: 'Submetida', aprovada: 'Aprovada', rejeitada: 'Rejeitada' }

export default function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [draftLoading, setDraftLoading] = useState(null)
  const [newQuestion, setNewQuestion] = useState('')
  const [msg, setMsg] = useState('')
  const [activeTab, setActiveTab] = useState('content') // content | docs | tips
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [grantInfo, setGrantInfo] = useState({ questions: [], documents: [], tips: [] })
  const [docsChecked, setDocsChecked] = useState({})
  const saveTimerRef = useRef(null)
  const appRef = useRef(null)

  const load = () => {
    fetch(`/api/applications/${id}`)
      .then(r => r.json())
      .then(d => {
        setApp(d)
        appRef.current = d
        setLoading(false)
        // If no draft content yet, auto-generate questions
        const existing = d.draft_content || {}
        if (Object.keys(existing).length === 0 && d.grant_id) {
          generateQuestions(d.grant_id)
        }
      })
  }

  useEffect(() => { load() }, [id])

  const generateQuestions = async (grantId) => {
    setGeneratingQuestions(true)
    try {
      const r = await fetch('/api/ai/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_id: grantId })
      })
      const d = await r.json()
      if (!d.error) {
        setGrantInfo({ questions: d.questions || [], documents: d.documents || [], tips: d.tips || [] })
        // Pre-populate draft_content keys with empty strings
        if (d.questions?.length > 0) {
          setApp(prev => {
            if (!prev) return prev
            const existing = prev.draft_content || {}
            const hasContent = Object.keys(existing).some(k => existing[k]?.trim().length > 0)
            if (hasContent) return prev // don't overwrite if user already typed something
            const newContent = {}
            for (const q of d.questions) {
              newContent[q] = existing[q] || ''
            }
            return { ...prev, draft_content: newContent }
          })
        }
      }
    } catch {}
    finally { setGeneratingQuestions(false) }
  }

  const persistSave = useCallback(async (currentApp) => {
    if (!currentApp) return
    setSaving(true)
    try {
      await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentApp, draft_content: currentApp.draft_content || {} })
      })
      setSavedAt(new Date())
    } catch {}
    finally { setSaving(false) }
  }, [id])

  const scheduleSave = useCallback((updatedApp) => {
    appRef.current = updatedApp
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      persistSave(appRef.current)
    }, 1200)
  }, [persistSave])

  const saveNow = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    persistSave(appRef.current || app)
  }

  const updateStatus = async (status) => {
    const updated = { ...app, status }
    setApp(updated)
    appRef.current = updated
    await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updated, draft_content: updated.draft_content || {} })
    })
    setSavedAt(new Date())
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
        const updated = { ...app, draft_content: { ...(app.draft_content || {}), [question]: d.draft } }
        setApp(updated)
        scheduleSave(updated)
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
    const updated = { ...app, draft_content: { ...(app.draft_content || {}), [newQuestion]: '' } }
    setApp(updated)
    scheduleSave(updated)
    setNewQuestion('')
  }

  const deleteQuestion = (q) => {
    const newContent = { ...(app.draft_content || {}) }
    delete newContent[q]
    const updated = { ...app, draft_content: newContent }
    setApp(updated)
    scheduleSave(updated)
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><span>A carregar...</span></div>
  if (!app || app.error) return <div className="page"><p>Candidatura não encontrada.</p></div>

  const draftContent = app.draft_content || {}
  const allQuestions = [...new Set([
    ...Object.keys(draftContent),
    ...grantInfo.questions.filter(q => !draftContent.hasOwnProperty(q))
  ])]
  const answered = allQuestions.filter(q => draftContent[q] && draftContent[q].trim().length > 20).length
  const completion = allQuestions.length > 0 ? Math.round((answered / allQuestions.length) * 100) : 0
  const compColor = completion >= 70 ? 'var(--success)' : completion >= 40 ? 'var(--warning)' : 'var(--muted)'

  const daysLeft = app.deadline ? Math.ceil((new Date(app.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
  const isUrgent = daysLeft != null && daysLeft <= 14 && daysLeft > 0

  const exportText = () => {
    const lines = [
      `CANDIDATURA: ${app.grant_title}`,
      `Fonte: ${app.grant_source}`,
      `Estado: ${STATUS_LABELS[app.status]}`,
      app.deadline ? `Prazo: ${new Date(app.deadline).toLocaleDateString('pt-PT')}` : '',
      '',
      app.notes ? `NOTAS:\n${app.notes}\n` : '',
      '=== RESPOSTAS ===',
      '',
      ...allQuestions.map(q => `${q}:\n${draftContent[q] || '(sem resposta)'}\n`)
    ].filter(l => l !== undefined)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `candidatura-${app.grant_title?.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`
    a.click()
  }

  return (
    <div className="page">
      <button className="btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>← Voltar</button>

      {/* Header card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex-between" style={{ marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{app.grant_source}</div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>{app.grant_title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={app.status}
              onChange={e => updateStatus(e.target.value)}
              style={{ width: 'auto', padding: '6px 10px', borderRadius: 'var(--radius)', fontSize: 13 }}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <button className="btn-primary" onClick={saveNow} disabled={saving} style={{ minWidth: 90 }}>
              {saving ? '...' : '💾 Guardar'}
            </button>
            <button className="btn-ghost" onClick={exportText} title="Exportar candidatura como .txt">
              📄
            </button>
          </div>
        </div>

        {savedAt && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            Guardado às {savedAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* Deadline + urgency */}
        {isUrgent && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
            ⏰ Prazo em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} — {new Date(app.deadline).toLocaleDateString('pt-PT')}
          </div>
        )}
        {app.deadline && !isUrgent && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            📅 Prazo: {new Date(app.deadline).toLocaleDateString('pt-PT')}
            {daysLeft != null && daysLeft > 0 && <span style={{ marginLeft: 6, color: daysLeft <= 30 ? 'var(--warning)' : 'var(--muted)' }}>({daysLeft} dias)</span>}
          </div>
        )}

        {/* Completion bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Progresso da candidatura</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: compColor }}>{answered}/{allQuestions.length} respostas ({completion}%)</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 4 }}>
            <div style={{ height: '100%', width: `${completion}%`, borderRadius: 4, transition: 'width 0.4s', background: compColor }} />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 12 }}>
          <label className="label">Contexto / notas internas</label>
          <textarea placeholder="Contexto do projeto, pontos a destacar, informação relevante para as respostas..." value={app.notes || ''}
            rows={3}
            onChange={e => {
              const updated = { ...app, notes: e.target.value }
              setApp(updated)
              scheduleSave(updated)
            }} />
        </div>

        {/* Analyze button */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={analyzeApp} disabled={analyzing}>
            {analyzing ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />A analisar...</> : '🔍 Analisar Candidatura com IA'}
          </button>
          {generatingQuestions && (
            <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="spinner" style={{ width: 12, height: 12 }} /> A gerar questões específicas...
            </span>
          )}
        </div>
      </div>

      {/* AI Analysis */}
      {analysis && (
        <div className="card" style={{ marginBottom: 20, borderColor: analysis.score >= 70 ? 'var(--success)' : analysis.score >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
          <div className="flex-between" style={{ marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>📊 Análise IA</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: analysis.score >= 70 ? 'var(--success)' : analysis.score >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                {analysis.score}/100
              </span>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `conic-gradient(${analysis.score >= 70 ? 'var(--success)' : analysis.score >= 40 ? 'var(--warning)' : 'var(--danger)'} ${analysis.score * 3.6}deg, var(--bg3) 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg2)' }} />
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--muted)', marginBottom: 14, fontSize: 13 }}>{analysis.summary}</p>
          <div className="grid-2">
            {analysis.strengths?.length > 0 && (
              <div>
                <div className="label" style={{ color: 'var(--success)', marginBottom: 8 }}>Pontos Fortes</div>
                {analysis.strengths.map((s, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--text)' }}>✅ {s}</div>)}
              </div>
            )}
            {analysis.improvements?.length > 0 && (
              <div>
                <div className="label" style={{ color: 'var(--warning)', marginBottom: 8 }}>Melhorias</div>
                {analysis.improvements.map((s, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0', color: 'var(--text)' }}>💡 {s}</div>)}
              </div>
            )}
          </div>
          {analysis.missing?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="label" style={{ color: 'var(--danger)', marginBottom: 8 }}>Informação em Falta</div>
              {analysis.missing.map((s, i) => <div key={i} style={{ fontSize: 13, padding: '3px 0' }}>❌ {s}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Tips banner */}
      {grantInfo.tips?.length > 0 && (
        <div style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>💡 Dicas para esta candidatura</div>
          {grantInfo.tips.map((t, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text)', padding: '3px 0' }}>• {t}</div>
          ))}
        </div>
      )}

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: 4, width: 'fit-content' }}>
        {[
          { key: 'content', label: `📝 Respostas (${answered}/${allQuestions.length})` },
          { key: 'docs', label: `📁 Documentos${grantInfo.documents?.length ? ` (${grantInfo.documents.length})` : ''}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--muted)'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content tab */}
      {activeTab === 'content' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>📝 Respostas da Candidatura</h2>
            <button className="btn-secondary btn-sm" onClick={() => app.grant_id && generateQuestions(app.grant_id)} disabled={generatingQuestions}>
              {generatingQuestions ? '...' : '🔄 Regenerar questões'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input placeholder="Adicionar questão personalizada..." value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addQuestion()} />
            <button className="btn-secondary" onClick={addQuestion} style={{ whiteSpace: 'nowrap' }}>+ Adicionar</button>
          </div>

          {allQuestions.length === 0 && !generatingQuestions && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
              <p>Sem questões ainda.</p>
              <button className="btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => app.grant_id && generateQuestions(app.grant_id)}>
                ✨ Gerar questões com IA
              </button>
            </div>
          )}

          {allQuestions.map(q => {
            const answer = draftContent[q] || ''
            const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0
            const charCount = answer.length
            const isAnswered = answer.trim().length > 20
            const isCustom = !grantInfo.questions.includes(q)
            return (
              <div key={q} style={{ marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: isAnswered ? 'var(--success)' : 'var(--bg3)',
                      border: `1px solid ${isAnswered ? 'var(--success)' : 'var(--border)'}`
                    }} />
                    {q}
                    {isCustom && <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>(personalizada)</span>}
                  </label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 12, flexShrink: 0 }}>
                    {wordCount > 0 && (
                      <span style={{ fontSize: 10, color: charCount < 100 ? 'var(--danger)' : charCount < 300 ? 'var(--warning)' : 'var(--success)' }}>
                        {wordCount} palavras
                      </span>
                    )}
                    <button className="btn-secondary btn-sm" onClick={() => draftAnswer(q)} disabled={draftLoading === q} style={{ whiteSpace: 'nowrap' }}>
                      {draftLoading === q ? <><span className="spinner" style={{ width: 10, height: 10, marginRight: 4 }} />IA...</> : '✨ Redigir'}
                    </button>
                    {isCustom && (
                      <button onClick={() => deleteQuestion(q)} title="Remover questão"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: '2px 4px' }}>
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={answer}
                  onChange={e => {
                    const updated = { ...app, draft_content: { ...(app.draft_content || {}), [q]: e.target.value } }
                    setApp(updated)
                    scheduleSave(updated)
                  }}
                  placeholder={`Resposta à questão: "${q}"...`}
                  rows={answer ? Math.min(Math.max(answer.split('\n').length + 2, 4), 14) : 4}
                />
              </div>
            )
          })}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="btn-primary" onClick={saveNow} disabled={saving}>
              {saving ? '...' : '💾 Guardar tudo'}
            </button>
          </div>
        </div>
      )}

      {/* Documents tab */}
      {activeTab === 'docs' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>📁 Documentos Necessários</h2>
            {grantInfo.documents?.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {Object.values(docsChecked).filter(Boolean).length}/{grantInfo.documents.length} preparados
              </span>
            )}
          </div>

          {grantInfo.documents?.length === 0 && !generatingQuestions ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
              <p>Sem lista de documentos gerada ainda.</p>
              <button className="btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => app.grant_id && generateQuestions(app.grant_id)}>
                ✨ Gerar lista com IA
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grantInfo.documents.map((doc, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, background: docsChecked[i] ? 'rgba(34,197,94,0.06)' : 'var(--bg)', border: `1px solid ${docsChecked[i] ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`, transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={!!docsChecked[i]}
                    onChange={e => setDocsChecked(prev => ({ ...prev, [i]: e.target.checked }))}
                    style={{ marginTop: 2, width: 15, height: 15, accentColor: 'var(--success)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: docsChecked[i] ? 'var(--muted)' : 'var(--text)', textDecoration: docsChecked[i] ? 'line-through' : 'none' }}>
                    {doc}
                  </span>
                </label>
              ))}
            </div>
          )}

          {grantInfo.documents?.length > 0 && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
              💡 Esta lista foi gerada pela IA com base no tipo de fundo. Consulta sempre o regulamento oficial para verificar os requisitos exactos.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
