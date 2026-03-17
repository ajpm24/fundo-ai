import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const fmt = (n) => n != null ? `€${Number(n).toLocaleString('pt-PT')}` : 'N/D'

// Only show official link if URL has a real path (not just a homepage root)
function isSpecificUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url)
    return u.pathname.length > 1 && u.pathname !== '/'
  } catch { return false }
}

const STATUS_CONFIG = {
  open: { label: 'Aberta', color: 'var(--success)', dot: 'status-dot-open' },
  closed: { label: 'Encerrada', color: 'var(--danger)', dot: 'status-dot-closed' },
  upcoming: { label: 'Em breve', color: 'var(--warning)', dot: 'status-dot-upcoming' },
}

const FUNDING_TYPE_LABELS = {
  fundo_perdido: { label: 'Fundo Perdido', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  reembolsavel: { label: 'Reembolsável', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  misto: { label: 'Misto', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  equity: { label: 'Capital', color: '#0891b2', bg: 'rgba(8,145,178,0.12)' },
  garantia: { label: 'Garantia', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  voucher: { label: 'Voucher', color: '#db2777', bg: 'rgba(219,39,119,0.12)' },
  emprestimo: { label: 'Empréstimo', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
}

const scoreColor = (s) => s == null ? 'var(--muted)' : s >= 70 ? 'var(--success)' : s >= 40 ? 'var(--warning)' : 'var(--danger)'

export default function GrantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [grant, setGrant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [msg, setMsg] = useState('')
  // Funding estimator
  const [budget, setBudget] = useState('')
  const [estimate, setEstimate] = useState(null)
  const [estLoading, setEstLoading] = useState(false)
  // Notify me
  const [notified, setNotified] = useState(false)
  const [notifyLoading, setNotifyLoading] = useState(false)
  // AI Questions
  const [questions, setQuestions] = useState(null)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  // Beneficiaries
  const [beneficiaries, setBeneficiaries] = useState(null)

  useEffect(() => {
    fetch(`/api/grants/${id}`)
      .then(r => r.json())
      .then(d => { setGrant(d); setLoading(false) })
    fetch(`/api/beneficiaries/grant/${id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setBeneficiaries(d) })
      .catch(() => {})
  }, [id])

  const startApplication = async () => {
    setApplying(true); setMsg('')
    try {
      const r = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_id: Number(id) })
      })
      const d = await r.json()
      if (d.error) {
        if (d.existing_id) { navigate(`/applications/${d.existing_id}`) }
        else { setMsg('❌ ' + d.error) }
        return
      }
      navigate(`/applications/${d.id}`)
    } catch { setMsg('❌ Erro ao criar candidatura') }
    finally { setApplying(false) }
  }

  const calcEstimate = async () => {
    if (!budget) return
    setEstLoading(true)
    try {
      const r = await fetch(`/api/grants/${id}/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_budget: Number(budget.replace(/[^0-9]/g, '')) })
      })
      setEstimate(await r.json())
    } catch {}
    finally { setEstLoading(false) }
  }

  const loadQuestions = async () => {
    setQuestionsLoading(true)
    try {
      const r = await fetch('/api/ai/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_id: Number(id) })
      })
      const d = await r.json()
      if (!d.error) setQuestions(d)
    } catch {}
    finally { setQuestionsLoading(false) }
  }

  const activateNotification = async () => {
    setNotifyLoading(true)
    try {
      await fetch(`/api/grants/${id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dashboard', label: grant.title })
      })
      setNotified(true)
    } catch {}
    finally { setNotifyLoading(false) }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><span>A carregar...</span></div>
  if (!grant || grant.error) return <div className="page"><p>Fundo não encontrado.</p></div>

  const sectors = Array.isArray(grant.eligible_sectors) ? grant.eligible_sectors : []
  const sizes = Array.isArray(grant.eligible_sizes) ? grant.eligible_sizes : []
  const entities = Array.isArray(grant.eligible_entities) ? grant.eligible_entities : []
  const countries = Array.isArray(grant.eligible_countries) ? grant.eligible_countries : []
  const daysLeft = grant.deadline ? Math.ceil((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
  const status = grant.call_status || 'open'
  const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.open
  const fundingRate = grant.funding_rate || grant.cofinancing_rate
  const ftInfo = grant.funding_type ? FUNDING_TYPE_LABELS[grant.funding_type] : null
  const score = grant.ai_relevance_score != null ? Math.round(grant.ai_relevance_score) : null

  return (
    <div className="page">
      <button className="btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>← Voltar</button>

      {/* Main info card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge-blue">{grant.source}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 12, color: statusConf.color }}>
              <span className={`status-dot ${statusConf.dot}`} />
              {statusConf.label}
            </span>
            {ftInfo && (
              <span style={{ fontSize: 11, fontWeight: 600, color: ftInfo.color, background: ftInfo.bg, borderRadius: 10, padding: '2px 9px' }}>
                {ftInfo.label}
              </span>
            )}
            {grant.consortium_required ? <span className="badge badge-cyan">👥 Consórcio obrigatório</span> : null}
          </div>
          {score != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Relevância IA</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: scoreColor(score) }}>{score}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>/100</span></div>
              </div>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: `conic-gradient(${scoreColor(score)} ${score * 3.6}deg, var(--bg3) 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg2)' }} />
              </div>
            </div>
          )}
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{grant.title}</h1>

        {grant.ai_relevance_reason && (
          <div style={{ background: 'rgba(79,110,247,0.08)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#8fa3ff', fontStyle: 'italic' }}>
            💡 {grant.ai_relevance_reason}
          </div>
        )}

        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>{grant.description}</p>

        {/* Key numbers */}
        <div className="grid-3" style={{ marginBottom: 20 }}>
          <div>
            <div className="label">Valor Máximo</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{fmt(grant.max_amount)}</div>
            {grant.min_amount ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>Mín: {fmt(grant.min_amount)}</div> : null}
          </div>
          <div>
            <div className="label">Taxa de Financiamento</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>
              {fundingRate ? `${fundingRate}%` : 'N/D'}
            </div>
          </div>
          {grant.deadline ? (
            <div>
              <div className="label">Prazo</div>
              <div style={{ fontWeight: 700, color: daysLeft != null && daysLeft <= 30 ? 'var(--warning)' : 'var(--text)' }}>
                {new Date(grant.deadline).toLocaleDateString('pt-PT')}
              </div>
              {daysLeft != null && (
                <div style={{ fontSize: 12, color: daysLeft <= 7 ? 'var(--danger)' : daysLeft <= 30 ? 'var(--warning)' : 'var(--muted)' }}>
                  {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo expirado'}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="label">Prazo</div>
              <div style={{ color: 'var(--muted)' }}>Em aberto / contínuo</div>
            </div>
          )}
        </div>

        {/* TRL range */}
        {(grant.trl_min || grant.trl_max) && (
          <div style={{ marginBottom: 16 }}>
            <div className="label">TRL elegível</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              TRL {grant.trl_min || 1} → TRL {grant.trl_max || 9}
              <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>
                ({grant.trl_min <= 3 ? 'Investigação básica' : grant.trl_min <= 6 ? 'Demonstração' : 'Mercado'} até {grant.trl_max >= 8 ? 'produto final' : grant.trl_max >= 6 ? 'demonstração' : 'prova de conceito'})
              </span>
            </div>
          </div>
        )}

        {/* Predicted next open */}
        {status === 'closed' && grant.predicted_next_open && (
          <div style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            🔮 <strong>Previsão de reabertura:</strong> {new Date(grant.predicted_next_open).toLocaleDateString('pt-PT')}
            {' '}(baseado em {grant.history_years?.length || '?'} edições anteriores)
          </div>
        )}

        {/* Tags row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {sectors.length > 0 && (
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className="label">Setores elegíveis</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {sectors.map(s => <span key={s} className="badge badge-gray">{s}</span>)}
              </div>
            </div>
          )}
          {entities.length > 0 && (
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className="label">Entidades elegíveis</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {entities.map(e => <span key={e} className="badge badge-cyan">{e}</span>)}
              </div>
            </div>
          )}
          {sizes.length > 0 && (
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className="label">Dimensão</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {sizes.map(s => <span key={s} className="badge badge-cyan">{s}</span>)}
              </div>
            </div>
          )}
          {countries.length > 0 && (
            <div style={{ flex: 1, minWidth: 120 }}>
              <div className="label">Países</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {countries.map(c => <span key={c} className="badge badge-blue">{c}</span>)}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary btn-lg" onClick={startApplication} disabled={applying}>
            {applying ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />A criar...</> : '📝 Iniciar Candidatura'}
          </button>
          {isSpecificUrl(grant.url) ? (
            <a href={grant.url.startsWith('http') ? grant.url : 'https://' + grant.url} target="_blank" rel="noopener noreferrer">
              <button className="btn-secondary" title={grant.url}>🔗 Ver fundo oficial</button>
            </a>
          ) : grant.url ? (
            <a href={grant.url.startsWith('http') ? grant.url : 'https://' + grant.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center', textDecoration: 'underline dotted' }}
              title="Link genérico — pode não ir diretamente ao fundo">
              🌐 Portal ({(() => { try { return new URL(grant.url.startsWith('http') ? grant.url : 'https://' + grant.url).hostname } catch { return grant.url } })()})
            </a>
          ) : null}
          {(status === 'closed' || status === 'upcoming') && (
            <button className="btn-ghost" onClick={activateNotification} disabled={notifyLoading || notified}
              style={{ color: notified ? 'var(--success)' : 'var(--warning)', borderColor: notified ? 'var(--success)' : 'var(--warning)' }}>
              {notified ? '🔔 Notificação ativa!' : notifyLoading ? 'A ativar...' : '🔔 Notificar quando abrir'}
            </button>
          )}
        </div>
        {msg && <p style={{ marginTop: 10, fontSize: 13, color: 'var(--danger)' }}>{msg}</p>}
      </div>

      {/* AI Questions Panel */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>🤖 Questões típicas desta candidatura</h3>
          {!questions && (
            <button className="btn-secondary btn-sm" onClick={loadQuestions} disabled={questionsLoading}>
              {questionsLoading ? <><span className="spinner" style={{ width: 12, height: 12, marginRight: 6 }} />A gerar...</> : '✨ Gerar com IA'}
            </button>
          )}
        </div>
        {!questions && !questionsLoading && (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            A IA analisa este fundo e gera as questões, documentos e dicas típicas para esta candidatura.
          </p>
        )}
        {questionsLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 13 }}>
            <span className="spinner" style={{ width: 16, height: 16 }} /> A analisar o fundo e gerar questões...
          </div>
        )}
        {questions && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {questions.questions?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  📋 Questões da candidatura
                </div>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  {questions.questions.map((q, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5 }}>{q}</li>
                  ))}
                </ol>
              </div>
            )}
            {questions.documents?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  📎 Documentos necessários
                </div>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {questions.documents.map((d, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5 }}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            {questions.tips?.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  💡 Dicas importantes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {questions.tips.map((t, i) => (
                    <div key={i} style={{ background: 'rgba(79,110,247,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: '0 6px 6px 0', padding: '8px 12px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{t}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Beneficiaries */}
      {beneficiaries && beneficiaries.count > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3>🏆 Beneficiários Aprovados</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {beneficiaries.total_amount > 0 && <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Total: €{Number(beneficiaries.total_amount).toLocaleString('pt-PT')}</span>}
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{beneficiaries.count} empresa{beneficiaries.count !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div>
            {beneficiaries.beneficiaries.map((b, i) => (
              <div key={b.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < beneficiaries.beneficiaries.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏢</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.company_name}</div>
                  {b.project_title && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.project_title}</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {b.region && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {b.region}</span>}
                    {b.sector && <span style={{ fontSize: 11, color: 'var(--muted)' }}>🏭 {b.sector}</span>}
                    {b.source_url && <a href={b.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#4f6ef7' }}>fonte ↗</a>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {b.amount_approved != null && <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 13 }}>€{Number(b.amount_approved).toLocaleString('pt-PT')}</div>}
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.approval_year}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <a href="/beneficiaries" style={{ fontSize: 13, color: '#4f6ef7', textDecoration: 'none' }}>Ver todos os beneficiários →</a>
          </div>
        </div>
      )}

      {/* Funding Estimator */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>💶 Estimativa de Financiamento</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Introduz o orçamento do teu projeto para calcular o financiamento estimado com este fundo.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="label">Orçamento do projeto (€)</label>
            <input
              type="text"
              placeholder="Ex: 500000"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && calcEstimate()}
            />
          </div>
          <button className="btn-primary" onClick={calcEstimate} disabled={estLoading || !budget}>
            {estLoading ? 'A calcular...' : 'Calcular'}
          </button>
        </div>

        {estimate && !estimate.error && (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Financiamento estimado</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{fmt(estimate.estimated_funding)}</div>
            </div>
            <div style={{ background: 'rgba(79,110,247,0.1)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Taxa aplicada</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{estimate.funding_rate}%</div>
            </div>
            <div style={{ background: 'rgba(255,193,7,0.1)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Contribuição própria</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--warning)' }}>{fmt(estimate.own_contribution)}</div>
            </div>
            <div style={{ background: 'rgba(100,116,139,0.1)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Orçamento total</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(estimate.project_budget)}</div>
            </div>
            {!estimate.eligible && (
              <div style={{ gridColumn: '1/-1', background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: 10, fontSize: 13, color: 'var(--danger)' }}>
                ⚠️ O orçamento estimado ({fmt(estimate.estimated_funding)}) é inferior ao montante mínimo do fundo ({fmt(estimate.min_grant)}).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
