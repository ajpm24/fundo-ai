import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/quickmatch', icon: '⚡', label: 'Quick Match' },
  { to: '/grants', icon: '🔍', label: 'Fundos' },
  { to: '/projects', icon: '📁', label: 'Projetos' },
  { to: '/applications', icon: '📋', label: 'Candidaturas' },
  { to: '/alerts', icon: '🔔', label: 'Alertas' },
  { to: '/profile', icon: '⚙', label: 'Perfil' },
]

export default function Navbar() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const fetchCount = () => {
      fetch('/api/alerts/unread-count')
        .then(r => r.json())
        .then(d => setUnread(d.count || 0))
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <nav style={{
      width: 220, minHeight: '100vh', background: 'var(--bg2)',
      borderRight: '1px solid var(--border)', position: 'fixed', left: 0, top: 0,
      display: 'flex', flexDirection: 'column', padding: '0 0 0'
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34,
            background: 'linear-gradient(135deg, #4f6ef7 0%, #7c3aed 100%)',
            borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 4px 12px rgba(79,110,247,0.4)', flexShrink: 0
          }}>💡</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>FundoAI</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>Consultor de Fundos</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ padding: '10px 10px', flex: 1 }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, marginBottom: 2, fontWeight: isActive ? 600 : 500, fontSize: 13,
              color: isActive ? 'white' : 'var(--muted)',
              background: isActive ? 'var(--accent)' : 'transparent',
              transition: 'all 0.15s', position: 'relative', textDecoration: 'none',
              boxShadow: isActive ? '0 2px 8px rgba(79,110,247,0.35)' : 'none',
            })}
            className="nav-link"
          >
            <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{link.icon}</span>
            <span style={{ flex: 1 }}>{link.label}</span>
            {link.to === '/alerts' && unread > 0 && (
              <span style={{
                background: 'var(--danger)', color: 'white',
                borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700
              }}>{unread > 9 ? '9+' : unread}</span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, background: 'var(--success)', borderRadius: '50%',
            display: 'inline-block', flexShrink: 0,
            boxShadow: '0 0 4px var(--success)', animation: 'dot-pulse 2s infinite'
          }} />
          Powered by Claude AI
        </div>
      </div>

      <style>{`
        .nav-link:hover:not([aria-current="page"]) {
          background: var(--bg3) !important;
          color: var(--text) !important;
        }
      `}</style>
    </nav>
  )
}
