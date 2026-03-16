import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const fmt = (n) => n ? `€${Number(n).toLocaleString('pt-PT')}` : 'N/D'

export default function GrantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [grant, setGrant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`/api/grants/${id}`)
      .then(r => r.json())
      .then(d => { setGrant(d); setLoading(false) })
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
        if (d.existing_id) {
          navigate(`/applications/${d.existing_id}`)
        } else {
          setMsg('❌ ' + d.error)
        }
        return
      }
      navigate(`/applications/${d.id}`)
    } catch { setMsg('❌ Erro ao criar candidatura') }
    finally { setApplying(false) }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><span>A carregar...</span></div>
  if (!grant || grant.error) return <div className="page"><p>Fundo não encontrado.</p></div>

  const sectors = Array.isArray(grant.eligible_sectors) ? grant.eligible_sectors : []
  const sizes = Array.isArray(grant.eligible_sizes) ? grant.eligible_sizes : []
  const daysLeft = grant.deadline ? Math.ceil((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="page">
      <button className="btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>← Voltar</button>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <span className="badge badge-blue">{grant.source}</span>
          {grant.ai_relevance_score != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Relevância IA</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: grant.ai_relevance_score >= 70 ? 'var(--success)' : grant.ai_relevance_score >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                {Math.round(grant.ai_relevance_score)}/100
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

        <div className="grid-3" style={{ marginBottom: 20 }}>
          <div>
            <div className="label">Valor Máximo</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{fmt(grant.max_amount)}</div>
          </div>
          {grant.deadline && (
            <div>
              <div className="label">Prazo</div>
              <div style={{ fontWeight: 700, color: daysLeft != null && daysLeft <= 30 ? 'var(--warning)' : 'var(--text)' }}>
                {new Date(grant.deadline).toLocaleDateString('pt-PT')}
              </div>
              {daysLeft != null && (
                <div style={{ fontSize: 12, color: daysLeft <= 7 ? 'var(--danger)' : 'var(--muted)' }}>
                  {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo expirado'}
                </div>
              )}
            </div>
          )}
          <div>
            <div className="label">Estado</div>
            <span className={`badge ${grant.is_active ? 'badge-green' : 'badge-gray'}`}>
              {grant.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        {sectors.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="label">Setores elegíveis</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {sectors.map(s => <span key={s} className="badge badge-gray">{s}</span>)}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="label">Dimensão elegível</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {sizes.map(s => <span key={s} className="badge badge-cyan">{s}</span>)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary btn-lg" onClick={startApplication} disabled={applying}>
            {applying ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />A criar candidatura...</> : '📝 Iniciar Candidatura'}
          </button>
          {grant.url && (
            <a href={grant.url} target="_blank" rel="noopener noreferrer">
              <button className="btn-secondary">🔗 Ver informação oficial</button>
            </a>
          )}
        </div>
        {msg && <p style={{ marginTop: 10, fontSize: 13, color: 'var(--danger)' }}>{msg}</p>}
      </div>
    </div>
  )
}
