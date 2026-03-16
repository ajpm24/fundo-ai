import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'

const fmt = (n) => n ? `€${Number(n).toLocaleString('pt-PT')}` : '—'

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

  if (loading) return <div className="loading-center"><div className="spinner" /><span>A carregar...</span></div>

  const totalPotential = applications.reduce((sum, a) => sum + (a.max_amount || 0), 0)
  const approved = applications.filter(a => a.status === 'aprovada').length
  const topGrants = [...grants].sort((a, b) => (b.ai_relevance_score || 0) - (a.ai_relevance_score || 0)).slice(0, 3)

  const upcoming = grants
    .filter(g => g.deadline && new Date(g.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 3)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Bem-vindo{profile?.name ? ` — ${profile.name}` : ''}. Aqui tens o resumo da tua atividade.</p>
      </div>

      {!profile?.description && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--warning)' }}>⚠️ Preenche o perfil da empresa para obteres recomendações personalizadas.</span>
          <button className="btn-primary btn-sm" onClick={() => navigate('/profile')}>Configurar Perfil</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: 'Fundos Disponíveis', value: grants.length, icon: '📋', color: 'var(--accent)' },
          { label: 'Candidaturas Ativas', value: applications.filter(a => !['aprovada','rejeitada'].includes(a.status)).length, icon: '📝', color: 'var(--info)' },
          { label: 'Aprovadas', value: approved, icon: '✅', color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, background: `${s.color}22`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{s.value}</div>
              <div className="text-muted text-sm">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Top Matches */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>🎯 Top Correspondências IA</h2>
            <button className="btn-secondary btn-sm" onClick={() => navigate('/grants')}>Ver todos</button>
          </div>
          {topGrants.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <p>Vai a <strong>Fundos</strong> e clica em "Calcular Relevância"</p>
            </div>
          ) : topGrants.map(g => (
            <div key={g.id} onClick={() => navigate(`/grants/${g.id}`)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{g.title}</div>
                <div className="text-muted text-sm">{g.source}</div>
              </div>
              {g.ai_relevance_score != null && (
                <span style={{ fontWeight: 800, fontSize: 16, color: g.ai_relevance_score >= 70 ? 'var(--success)' : g.ai_relevance_score >= 40 ? 'var(--warning)' : 'var(--danger)', marginLeft: 12 }}>
                  {Math.round(g.ai_relevance_score)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>📅 Prazos Próximos</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}><p>Sem prazos iminentes</p></div>
          ) : upcoming.map(g => {
            const days = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24))
            return (
              <div key={g.id} onClick={() => navigate(`/grants/${g.id}`)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{g.title}</div>
                  <div className="text-muted text-sm">{new Date(g.deadline).toLocaleDateString('pt-PT')}</div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 12, color: days <= 7 ? 'var(--danger)' : days <= 30 ? 'var(--warning)' : 'var(--muted)', marginLeft: 12, whiteSpace: 'nowrap' }}>
                  {days}d restantes
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Applications */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>📝 Candidaturas Recentes</h2>
          <button className="btn-secondary btn-sm" onClick={() => navigate('/applications')}>Ver todas</button>
        </div>
        {applications.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <p>Nenhuma candidatura ainda. Começa por explorar os fundos disponíveis.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Fundo', 'Estado', 'Valor Máx.', 'Prazo', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.slice(0, 5).map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 0 12px', paddingRight: 16, fontWeight: 500 }}>{a.grant_title}</td>
                  <td style={{ paddingRight: 16 }}><StatusBadge status={a.status} /></td>
                  <td style={{ paddingRight: 16, color: 'var(--success)', fontWeight: 600 }}>{fmt(a.max_amount)}</td>
                  <td style={{ paddingRight: 16, color: 'var(--muted)', fontSize: 13 }}>
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
