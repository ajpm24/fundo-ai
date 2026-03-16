import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'

const STATUSES = ['rascunho', 'em_curso', 'submetida', 'aprovada', 'rejeitada']
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

  return (
    <div className="page">
      <div className="page-header flex-between">
        <div>
          <h1>Candidaturas</h1>
          <p>Gere o estado de todas as tuas candidaturas a fundos.</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/grants')}>+ Nova Candidatura</button>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[{ key: 'all', label: `Todas (${applications.length})` }, ...STATUSES.map(s => ({ key: s, label: `${s === 'rascunho' ? 'Rascunho' : s === 'em_curso' ? 'Em Curso' : s === 'submetida' ? 'Submetida' : s === 'aprovada' ? 'Aprovada' : 'Rejeitada'} (${counts[s] || 0})` }))].map(tab => (
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
          {filtered.map(a => (
            <div key={a.id} className="card" style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/applications/${a.id}`)}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
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
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{fmt(a.max_amount)}</div>
                  {a.deadline && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      Prazo: {new Date(a.deadline).toLocaleDateString('pt-PT')}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    Atualizado: {new Date(a.updated_at).toLocaleDateString('pt-PT')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
