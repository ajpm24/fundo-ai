import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TYPE_META = {
  deadline_urgent:    { icon: '🚨', color: 'var(--danger)',  label: 'Urgente' },
  deadline_approaching: { icon: '📅', color: 'var(--warning)', label: 'Prazo Próximo' },
  high_relevance:     { icon: '🎯', color: 'var(--success)', label: 'Alta Relevância' },
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = () => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(d => { setAlerts(d); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    await fetch(`/api/alerts/${id}/read`, { method: 'PUT' })
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: 1 } : a))
  }

  const markAllRead = async () => {
    await fetch('/api/alerts/read-all', { method: 'PUT' })
    setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })))
  }

  const unread = alerts.filter(a => !a.is_read)

  return (
    <div className="page">
      <div className="page-header flex-between">
        <div>
          <h1>Alertas</h1>
          <p>{unread.length > 0 ? `${unread.length} alerta${unread.length !== 1 ? 's' : ''} por ler` : 'Sem alertas por ler'}</p>
        </div>
        {unread.length > 0 && (
          <button className="btn-secondary" onClick={markAllRead}>Marcar todos como lidos</button>
        )}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>A carregar...</span></div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <h3>Sem alertas</h3>
          <p>Os alertas aparecem automaticamente quando há prazos próximos ou novos fundos relevantes. Preenche o perfil e usa "Calcular Relevância" em Fundos.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(a => {
            const meta = TYPE_META[a.type] || { icon: '🔔', color: 'var(--muted)', label: 'Alerta' }
            return (
              <div key={a.id} className="card" style={{ opacity: a.is_read ? 0.55 : 1, borderLeft: `3px solid ${meta.color}`, cursor: 'pointer' }}
                onClick={() => { markRead(a.id); if (a.grant_id) navigate(`/grants/${a.grant_id}`) }}>
                <div className="flex-between">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                    <span style={{ fontSize: 22 }}>{meta.icon}</span>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span className="badge" style={{ background: `${meta.color}22`, color: meta.color }}>{meta.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(a.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text)' }}>{a.message}</p>
                      {a.grant_title && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>→ {a.grant_title}</p>}
                    </div>
                  </div>
                  {!a.is_read && (
                    <div style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%', marginTop: 4, flexShrink: 0 }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
