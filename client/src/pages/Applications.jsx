import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'

const STATUSES = ['rascunho', 'em_curso', 'submetida', 'aprovada', 'rejeitada']
const STATUS_LABELS = { rascunho: 'Rascunho', em_curso: 'Em Curso', submetida: 'Submetida', aprovada: 'Aprovada', rejeitada: 'Rejeitada' }
const STATUS_COLORS = { rascunho: 'var(--muted)', em_curso: 'var(--accent)', submetida: 'var(--info)', aprovada: 'var(--success)', rejeitada: 'var(--danger)' }
const fmt = (n) => n ? `€${Number(n).toLocaleString('pt-PT')}` : '—'

export default function Applications() {
  const [applications, setApplications] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/applications')
      .then(r => r.json())
      .then(d => { setApplications(d); setLoading(false) })
  }, [])

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter(a => a.status === s).length
    return acc
  }, {})

  const totalPotential = applications
    .filter(a => ['em_curso', 'submetida', 'aprovada'].includes(a.status))
    .reduce((s, a) => s + (a.max_amount || 0), 0)

  const approvedTotal = applications
    .filter(a => a.status === 'aprovada')
    .reduce((s, a) => s + (a.max_amount || 0), 0)

  return (
    <div className="page">
      <div className="page-header flex-between">
        <div>
          <h1>Candidaturas</h1>
          <p>Gere o estado de todas as tuas candidaturas a fundos.</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/grants')}>+ Nova Candidatura</button>
      </div>

      {/* Pipeline stats */}
      {applications.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
          {STATUSES.map(s => (
            <div key={s}
              onClick={() => setFilter(filter === s ? 'all' : s)}
              style={{
                background: 'var(--bg2)', border: `1px solid ${filter === s ? STATUS_COLORS[s] : 'var(--border)'}`,
                borderRadius: 'var(--radius)', padding: '12px 14px', cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.2s',
                transform: filter === s ? 'translateY(-2px)' : 'none',
                boxShadow: filter === s ? `0 4px 12px ${STATUS_COLORS[s]}30` : 'none'
              }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: STATUS_COLORS[s], lineHeight: 1 }}>{counts[s] || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{STATUS_LABELS[s]}</div>
            </div>
          ))}
          {totalPotential > 0 && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>{fmt(approvedTotal || totalPotential)}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{approvedTotal > 0 ? 'Aprovado' : 'Potencial ativo'}</div>
            </div>
          )}
        </div>
      )}

      {/* Pipeline funnel */}
      {applications.length > 1 && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--bg2)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {STATUSES.filter(s => counts[s] > 0).map((s, i, arr) => (
            <div key={s} style={{
              flex: counts[s], minWidth: 0, padding: '8px 12px',
              background: filter === s ? `${STATUS_COLORS[s]}25` : 'transparent',
              borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
              onClick={() => setFilter(filter === s ? 'all' : s)}>
              <div style={{ fontSize: 11, color: STATUS_COLORS[s], fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {STATUS_LABELS[s]}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{counts[s]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[{ key: 'all', label: `Todas (${applications.length})` }, ...STATUSES.map(s => ({ key: s, label: `${STATUS_LABELS[s]} (${counts[s] || 0})` }))].map(tab => (
          <button key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: filter === tab.key ? 'var(--accent)' : 'var(--bg3)', color: filter === tab.key ? 'white' : 'var(--muted)', border: `1px solid ${filter === tab.key ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>A carregar...</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>Sem candidaturas</h3>
          <p>Vai a <strong>Fundos</strong> e clica em "Iniciar Candidatura" num fundo de interesse.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(a => {
            const daysLeft = a.deadline ? Math.ceil((new Date(a.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
            const isUrgent = daysLeft != null && daysLeft <= 14 && daysLeft > 0
            const isExpired = daysLeft != null && daysLeft <= 0
            const activeStatuses = ['em_curso', 'rascunho']
            const showUrgency = isUrgent && activeStatuses.includes(a.status)
            return (
              <div key={a.id} className="card"
                style={{ cursor: 'pointer', borderLeft: `3px solid ${showUrgency ? 'var(--danger)' : STATUS_COLORS[a.status] || 'var(--border)'}`, position: 'relative', overflow: 'hidden' }}
                onClick={() => navigate(`/applications/${a.id}`)}>
                {showUrgency && (
                  <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderBottomLeftRadius: 6 }}>
                    ⏰ {daysLeft}d
                  </div>
                )}
                <div className="flex-between">
                  <div style={{ flex: 1 }}>
                    <div className="flex gap-12" style={{ marginBottom: 6 }}>
                      <StatusBadge status={a.status} />
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{a.grant_source}</span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 600 }}>{a.grant_title}</h3>
                    {a.notes && <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{a.notes.slice(0, 100)}{a.notes.length > 100 ? '...' : ''}</p>}
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 20, flexShrink: 0 }}>
                    {a.max_amount ? <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{fmt(a.max_amount)}</div> : null}
                    {a.deadline && (
                      <div style={{ fontSize: 12, marginTop: 4, color: isExpired ? 'var(--muted)' : isUrgent ? 'var(--danger)' : 'var(--muted)', fontWeight: isUrgent ? 600 : 400 }}>
                        {isExpired ? 'Prazo expirado' : `${daysLeft}d restantes`}
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{new Date(a.deadline).toLocaleDateString('pt-PT')}</div>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      Atualizado: {new Date(a.updated_at).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
