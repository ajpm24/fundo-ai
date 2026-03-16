import React from 'react'
import { useNavigate } from 'react-router-dom'

const fmt = (n) => n ? `€${Number(n).toLocaleString('pt-PT')}` : 'N/D'

const scoreColor = (score) => {
  if (!score) return 'var(--muted)'
  if (score >= 70) return 'var(--success)'
  if (score >= 40) return 'var(--warning)'
  return 'var(--danger)'
}

export default function GrantCard({ grant, showApply = false }) {
  const navigate = useNavigate()
  const sectors = Array.isArray(grant.eligible_sectors) ? grant.eligible_sectors : []

  const daysLeft = grant.deadline ? Math.ceil((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
      onClick={() => navigate(`/grants/${grant.id}`)}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>

      <div className="flex-between" style={{ marginBottom: 12 }}>
        <span className="badge badge-blue">{grant.source}</span>
        {grant.ai_relevance_score != null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(grant.ai_relevance_score) }}>
            {Math.round(grant.ai_relevance_score)}/100
          </span>
        )}
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{grant.title}</h3>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {grant.description}
      </p>

      {grant.ai_relevance_reason && (
        <div style={{ background: 'rgba(79,110,247,0.08)', borderRadius: 6, padding: '8px 10px', marginBottom: 12, fontSize: 12, color: '#8fa3ff', fontStyle: 'italic' }}>
          💡 {grant.ai_relevance_reason}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div className="text-muted text-sm">Valor máx.</div>
          <div style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(grant.max_amount)}</div>
        </div>
        {grant.deadline && (
          <div>
            <div className="text-muted text-sm">Prazo</div>
            <div style={{ fontWeight: 600, color: daysLeft != null && daysLeft <= 30 ? 'var(--warning)' : 'var(--text)' }}>
              {new Date(grant.deadline).toLocaleDateString('pt-PT')}
              {daysLeft != null && <span style={{ fontSize: 11, marginLeft: 6, color: 'var(--muted)' }}>({daysLeft}d)</span>}
            </div>
          </div>
        )}
      </div>

      {sectors.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sectors.slice(0, 3).map(s => (
            <span key={s} className="badge badge-gray">{s}</span>
          ))}
          {sectors.length > 3 && <span className="badge badge-gray">+{sectors.length - 3}</span>}
        </div>
      )}
    </div>
  )
}
