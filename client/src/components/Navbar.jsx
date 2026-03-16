import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/grants', icon: '🔍', label: 'Fundos' },
  { to: '/applications', icon: '📋', label: 'Candidaturas' },
  { to: '/alerts', icon: '🔔', label: 'Alertas' },
  { to: '/profile', icon: '⚙', label: 'Perfil' },
]

export default function Navbar() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    fetch('/api/alerts/unread-count')
      .then(r => r.json())
      .then(d => setUnread(d.count || 0))
      .catch(() => {})
    const interval = setInterval(() => {
      fetch('/api/alerts/unread-count')
        .then(r => r.json())
        .then(d => setUnread(d.count || 0))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <nav style={{
      width: 220, minHeight: '100vh', background: 'var(--bg2)',
      borderRight: '1px solid var(--border)', position: 'fixed', left: 0, top: 0,
      display: 'flex', flexDirection: 'column', padding: '0 0 24px'
    }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>FundoAI</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Consultor de Fundos</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 12px', flex: 1 }}>
        {links.map(link => (
          <NavLink key={link.to} to={link.to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 8, marginBottom: 2, fontWeight: 500,
            color: isActive ? 'white' : 'var(--muted)',
            background: isActive ? 'var(--accent)' : 'transparent',
            transition: 'all 0.15s', position: 'relative'
          })}>
            <span style={{ fontSize: 16 }}>{link.icon}</span>
            <span>{link.label}</span>
            {link.to === '/alerts' && unread > 0 && (
              <span style={{
                marginLeft: 'auto', background: 'var(--danger)', color: 'white',
                borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700
              }}>{unread}</span>
            )}
          </NavLink>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          Powered by Claude AI
        </div>
      </div>
    </nav>
  )
}
