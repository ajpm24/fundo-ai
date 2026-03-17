import React from 'react'
import { useNavigate } from 'react-router-dom'

function isSpecificUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url)
    return u.pathname.length > 1 && u.pathname !== '/'
  } catch { return false }
}

const fmtK = (n) => {
  if (n == null) return null
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`
  return `€${Number(n).toLocaleString('pt-PT')}`
}

const scoreColor = (score) => {
  if (!score) return 'var(--muted)'
  if (score >= 70) return 'var(--success)'
  if (score >= 40) return 'var(--warning)'
  return 'var(--danger)'
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

const STATUS_CONFIG = {
  open: { label: 'Aberta', dotClass: 'status-dot-open', color: 'var(--success)' },
  upcoming: { label: 'Em breve', dotClass: 'status-dot-upcoming', color: 'var(--warning)' },
  closed: { label: 'Encerrada', dotClass: 'status-dot-closed', color: 'var(--muted)' },
}

export default function GrantCard({ grant }) {
  const navigate = useNavigate()
  const goToGrant = () => {
    sessionStorage.setItem('grantSearchScroll', String(window.scrollY))
    navigate(`/grants/${grant.id}`)
  }
  const sectors = Array.isArray(grant.eligible_sectors) ? grant.eligible_sectors : []
  const sizes = Array.isArray(grant.eligible_sizes) ? grant.eligible_sizes : []
  const daysLeft = grant.deadline ? Math.ceil((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
  const ftInfo = grant.funding_type ? FUNDING_TYPE_LABELS[grant.funding_type] : null
  const statusCfg = STATUS_CONFIG[grant.call_status] || STATUS_CONFIG.open

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s' }}
      onClick={goToGrant}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,110,247,0.15)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Header row */}
      <div className="flex-between" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="badge badge-blue" style={{ fontSize: 10 }}>{grant.source?.split('/')[0].trim()}</span>
          {/* Call status */}
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: statusCfg.color, fontWeight: 500 }}>
            <span className={`status-dot ${statusCfg.dotClass}`} />
            {statusCfg.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {ftInfo && (
            <span style={{ fontSize: 10, fontWeight: 600, color: ftInfo.color, background: ftInfo.bg, borderRadius: 10, padding: '2px 8px' }}>
              {ftInfo.label}
            </span>
          )}
          {grant.ai_relevance_score != null && (
            <span style={{
              fontSize: 12, fontWeight: 700, color: scoreColor(grant.ai_relevance_score),
              background: `${scoreColor(grant.ai_relevance_score)}18`,
              border: `1px solid ${scoreColor(grant.ai_relevance_score)}40`,
              borderRadius: 6, padding: '2px 7px'
            }}>
              {Math.round(grant.ai_relevance_score)}/100
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{grant.title}</h3>

      {/* Description */}
      <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
        {grant.description}
      </p>

      {/* AI reason */}
      {grant.ai_relevance_reason && (
        <div style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.15)', borderRadius: 6, padding: '6px 10px', marginBottom: 10, fontSize: 11, color: '#8fa3ff', fontStyle: 'italic', lineHeight: 1.5 }}>
          💡 {grant.ai_relevance_reason}
        </div>
      )}

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 8px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Valor máx.</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--success)' }}>{fmtK(grant.max_amount) ?? '—'}</div>
        </div>
        {(grant.cofinancing_rate || grant.funding_rate) && (
          <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Cofinanciamento</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{grant.cofinancing_rate || grant.funding_rate}%</div>
          </div>
        )}
        <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 8px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Prazo</div>
          {grant.deadline ? (
            <div style={{ fontWeight: 600, fontSize: 11, color: daysLeft != null && daysLeft <= 60 ? 'var(--warning)' : 'var(--text)' }}>
              {new Date(grant.deadline).toLocaleDateString('pt-PT')}
              {daysLeft != null && daysLeft <= 30 && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>({daysLeft}d)</span>}
            </div>
          ) : (
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--success)' }}>Em aberto</div>
          )}
        </div>
      </div>

      {/* Sizes */}
      {sizes.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', marginRight: 2 }}>Elegível:</span>
          {sizes.slice(0, 4).map(s => (
            <span key={s} style={{ fontSize: 10, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', borderRadius: 8, padding: '1px 6px' }}>{s}</span>
          ))}
          {sizes.length > 4 && <span style={{ fontSize: 10, color: 'var(--muted)' }}>+{sizes.length - 4}</span>}
        </div>
      )}

      {/* Sectors + link */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {sectors.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {sectors.slice(0, 3).map(s => (
              <span key={s} className="badge badge-gray" style={{ fontSize: 10 }}>{s}</span>
            ))}
            {sectors.length > 3 && <span className="badge badge-gray" style={{ fontSize: 10 }}>+{sectors.length - 3}</span>}
          </div>
        )}
        {isSpecificUrl(grant.url) && (
          <a
            href={grant.url.startsWith('http') ? grant.url : 'https://' + grant.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            🔗 Ver fundo →
          </a>
        )}
      </div>
    </div>
  )
}
