import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'

const fmt = (n) => n ? `€${Number(n).toLocaleString('pt-PT')}` : '—'
const fmtK = (n) => {
  if (!n) return '—'
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`
  return fmt(n)
}

export default function Dashboard() {
  const [grants, setGrants] = useState([])
  const [applications, setApplications] = useState([])
  const [alerts, setAlerts] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      fetch('/api/grants').then(r => r.json()),
      fetch('/api/applications').then(r => r.json()),
      fetch('/api/alerts').then(r => r.json()),
      fetch('/api/profile').then(r => r.json()),
    ]).then(([g, a, al, p]) => {
      setGrants(g)
      setApplications(a)
      setAlerts(al.filter(x => !x.is_read).slice(0, 5))
      setProfile(p)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <span style={{ fontSize: 14 }}>A carregar dashboard...</span>
    </div>
  )

  const totalPotential = grants
    .filter(g => g.ai_relevance_score >= 60)
    .reduce((sum, g) => sum + (g.max_amount || 0), 0)

  const activeApps = applications.filter(a => !['aprovada', 'rejeitada'].includes(a.status))
  const approved = applications.filter(a => a.status === 'aprovada').length
  const openGrants = grants.filter(g => g.call_status !== 'closed').length

  const topGrants = [...grants]
    .sort((a, b) => (b.ai_relevance_score || 0) - (a.ai_relevance_score || 0))
    .slice(0, 4)

  const upcoming = grants
    .filter(g => g.deadline && new Date(g.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 4)

  const stats = [
    { label: 'Fundos Abertos', value: openGrants, icon: '📋', color: 'var(--accent)', bg: 'rgba(79,110,247,0.12)' },
    { label: 'Candidaturas Ativas', value: activeApps.length, icon: '📝', color: 'var(--info)', bg: 'rgba(6,182,212,0.12)' },
    { label: 'Aprovadas', value: approved, icon: '✅', color: 'var(--success)', bg: 'rgba(34,197,94,0.12)' },
    { label: 'Potencial (score ≥60)', value: fmtK(totalPotential), icon: '💶', color: 'var(--warning)', bg: 'rgba(245,158,11,0.12)', isText: true },
  ]

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Bem-vindo{profile?.name ? ` — ${profile.name}` : ''}. Aqui tens o resumo da tua atividade.</p>
      </div>

      {/* Profile warning */}
      {!profile?.description && (
        <div className="alert-banner alert-warning">
          <span style={{ color: 'var(--warning)', fontSize: 13 }}>
            ⚠️ Preenche o perfil da empresa para obteres recomendações personalizadas da IA.
          </span>
          <button className="btn-primary btn-sm" onClick={() => navigate('/profile')}>Configurar Perfil</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div>
              <div className="stat-value" style={{ color: s.color, fontSize: s.isText ? 20 : 28 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="alert-banner alert-info" style={{ cursor: 'pointer' }} onClick={() => navigate('/alerts')}>
          <span style={{ fontSize: 13 }}>
            🔔 <strong>{alerts.length}</strong> alerta{alerts.length > 1 ? 's' : ''} não lido{alerts.length > 1 ? 's' : ''} — {alerts[0]?.message}
          </span>
          <button className="btn-ghost btn-sm">Ver →</button>
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Top AI Matches */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>🎯 Top Correspondências IA</h2>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/grants')}>Ver todos →</button>
          </div>
          {topGrants.filter(g => g.ai_relevance_score != null).length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
              <p style={{ fontSize: 13 }}>Vai a <strong>Fundos</strong> e clica em <br />"Calcular Relevância" para ver matches</p>
            </div>
          ) : topGrants.map(g => {
            const score = Math.round(g.ai_relevance_score || 0)
            const scoreColor = score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--muted)'
            return (
              <div key={g.id} onClick={() => navigate(`/grants/${g.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Score ring */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${scoreColor}`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, fontWeight: 800, color: scoreColor
                }}>{score}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</div>
                  <div className="text-muted text-sm">{g.source?.split('/')[0]}</div>
                </div>
                {g.max_amount && (
                  <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {fmtK(g.max_amount)}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>📅 Prazos Próximos</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <p style={{ fontSize: 13 }}>Sem prazos iminentes</p>
            </div>
          ) : upcoming.map(g => {
            const days = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24))
            const urgency = days <= 7 ? 'var(--danger)' : days <= 30 ? 'var(--warning)' : 'var(--muted)'
            return (
              <div key={g.id} onClick={() => navigate(`/grants/${g.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                {/* Days badge */}
                <div style={{
                  minWidth: 44, height: 40, borderRadius: 8, background: `${urgency}18`,
                  border: `1px solid ${urgency}40`, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: urgency, lineHeight: 1 }}>{days}</div>
                  <div style={{ fontSize: 9, color: urgency, fontWeight: 600 }}>DIAS</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</div>
                  <div className="text-muted text-sm">{new Date(g.deadline).toLocaleDateString('pt-PT')}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Applications */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>📝 Candidaturas Recentes</h2>
          <button className="btn-ghost btn-sm" onClick={() => navigate('/applications')}>Ver todas →</button>
        </div>
        {applications.length === 0 ? (
          <div className="empty-state" style={{ padding: '28px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <h3>Nenhuma candidatura ainda</h3>
            <p style={{ marginBottom: 16, fontSize: 13 }}>Começa por explorar os fundos disponíveis ou usa o Quick Match.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary btn-sm" onClick={() => navigate('/quickmatch')}>⚡ Quick Match</button>
              <button className="btn-secondary btn-sm" onClick={() => navigate('/grants')}>🔍 Ver Fundos</button>
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Fundo', 'Estado', 'Valor Máx.', 'Prazo', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingRight: 16 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.slice(0, 5).map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 0', paddingRight: 16, fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.grant_title}</td>
                  <td style={{ paddingRight: 16 }}><StatusBadge status={a.status} /></td>
                  <td style={{ paddingRight: 16, color: 'var(--success)', fontWeight: 600, whiteSpace: 'nowrap' }}>{a.max_amount ? fmtK(a.max_amount) : '—'}</td>
                  <td style={{ paddingRight: 16, color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {a.deadline ? new Date(a.deadline).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  <td>
                    <button className="btn-secondary btn-sm" onClick={() => navigate(`/applications/${a.id}`)}>Abrir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
