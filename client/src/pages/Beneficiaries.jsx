import React, { useState, useEffect, useCallback } from 'react'

const fmt = (v) => v != null ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v) : '—'
const fmtM = (v) => v != null ? (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M €` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K €` : `${v} €`) : '—'

const REGIONS = ['todas', 'norte', 'centro', 'ams', 'alentejo', 'algarve', 'acores', 'madeira']
const REGION_LABELS = { todas: 'Todas as regiões', norte: 'Norte', centro: 'Centro', ams: 'A.M. Lisboa', alentejo: 'Alentejo', algarve: 'Algarve', acores: 'Açores', madeira: 'Madeira' }
const YEARS = ['Todos', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018']

const SOURCE_COLORS = {
  'PT2030': '#4f6ef7', 'COMPETE2030': '#4f6ef7', 'Portugal 2020': '#8b5cf6',
  'PRR': '#22c55e', 'ANI': '#06b6d4', 'IAPMEI': '#f59e0b',
  'Horizonte Europa': '#ec4899', 'EIC': '#ec4899', 'Erasmus+': '#f97316',
  'MAR2030': '#0ea5e9', 'PDR': '#84cc16', 'InvestEU': '#a78bfa',
  'EU Cohesion': '#6366f1', 'Base.gov': '#94a3b8',
}

function getSourceColor(source) {
  for (const [key, color] of Object.entries(SOURCE_COLORS)) {
    if (source?.toLowerCase().includes(key.toLowerCase())) return color
  }
  return '#8b90a4'
}

function FundingTypeBadge({ type }) {
  const map = { fundo_perdido: ['🎁', 'Fundo Perdido', '#22c55e'], reembolsavel: ['↩️', 'Reembolsável', '#06b6d4'], misto: ['🔀', 'Misto', '#f59e0b'], equity: ['📈', 'Equity', '#ec4899'] }
  const [icon, label, color] = map[type] || ['💰', type || 'Financiamento', '#8b90a4']
  return <span style={{ fontSize: 11, background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 4, padding: '2px 7px' }}>{icon} {label}</span>
}

function StatCard({ icon, label, value, sub, color = '#4f6ef7' }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
    </div>
  )
}

function BeneficiaryRow({ b, highlight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏢</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{b.company_name}</div>
        {b.project_title && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.project_title}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {b.region && b.region !== 'todas' && <span style={{ fontSize: 11, background: 'var(--bg3)', color: 'var(--muted)', borderRadius: 4, padding: '2px 6px' }}>📍 {REGION_LABELS[b.region] || b.region}</span>}
          {b.sector && <span style={{ fontSize: 11, background: 'var(--bg3)', color: 'var(--muted)', borderRadius: 4, padding: '2px 6px' }}>🏭 {b.sector}</span>}
          {b.nif && <span style={{ fontSize: 11, color: 'var(--muted)' }}>NIF: {b.nif}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {b.amount_approved != null && <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14 }}>{fmt(b.amount_approved)}</div>}
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{b.approval_year}</div>
      </div>
    </div>
  )
}

function GrantBlock({ grant, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const color = getSourceColor(grant.source)

  return (
    <div style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderLeft: `4px solid ${color}`, borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{grant.grant_title}</span>
            <span style={{ fontSize: 11, background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 4, padding: '2px 8px', flexShrink: 0 }}>{grant.source}</span>
            {grant.funding_type && <FundingTypeBadge type={grant.funding_type} />}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--muted)' }}>
            <span>👥 <strong style={{ color: 'var(--text)' }}>{grant.count}</strong> beneficiário{grant.count !== 1 ? 's' : ''}</span>
            {grant.total_approved > 0 && <span>💶 <strong style={{ color: '#22c55e' }}>{fmtM(grant.total_approved)}</strong> aprovados</span>}
            <span>📅 Última decisão: <strong style={{ color: 'var(--text)' }}>{grant.latest_year}</strong></span>
            {grant.grant_id && <a href={`/grants/${grant.grant_id}`} onClick={e => e.stopPropagation()} style={{ color: '#4f6ef7', textDecoration: 'none', fontSize: 12 }}>Ver fundo →</a>}
            {grant.source_url && <a href={grant.source_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#4f6ef7', textDecoration: 'none', fontSize: 12 }}>Fonte oficial ↗</a>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>{open ? '▲' : '▼'}</span>
          {grant.cofinancing_rate && <span style={{ fontSize: 11, color: '#f59e0b' }}>até {grant.cofinancing_rate}% financiado</span>}
        </div>
      </div>

      {/* Beneficiary list */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0 20px' }}>
          {grant.beneficiaries.map((b, i) => <BeneficiaryRow key={b.id || i} b={b} />)}
          {grant.source_url && (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <a href={grant.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4f6ef7', fontSize: 13, textDecoration: 'none' }}>
                📋 Ver lista completa na fonte oficial ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Beneficiaries() {
  const [data, setData] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('todas')
  const [year, setYear] = useState('Todos')
  const [view, setView] = useState('grants') // 'grants' | 'flat'
  const [flatData, setFlatData] = useState(null)
  const [flatLoading, setFlatLoading] = useState(false)
  const [flatPage, setFlatPage] = useState(1)
  const FLAT_PAGE_SIZE = 30

  const loadStats = async () => {
    try {
      const r = await fetch('/api/beneficiaries/stats')
      const d = await r.json()
      if (!d.error) setStats(d)
    } catch {}
  }

  const loadGrantView = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: 200 })
      const r = await fetch(`/api/beneficiaries/recent?${params}`)
      const d = await r.json()
      if (!d.error) setData(d)
    } catch {}
    setLoading(false)
  }, [])

  const loadFlatView = useCallback(async (pg = 1) => {
    setFlatLoading(true)
    try {
      const params = new URLSearchParams({
        limit: FLAT_PAGE_SIZE,
        offset: (pg - 1) * FLAT_PAGE_SIZE,
        sort: 'recent',
      })
      if (search) params.set('search', search)
      if (region !== 'todas') params.set('region', region)
      if (year !== 'Todos') params.set('year', year)
      const r = await fetch(`/api/beneficiaries?${params}`)
      const d = await r.json()
      if (!d.error) setFlatData(d)
    } catch {}
    setFlatLoading(false)
  }, [search, region, year])

  useEffect(() => { loadStats(); loadGrantView() }, [])
  useEffect(() => { if (view === 'flat') { setFlatPage(1); loadFlatView(1) } }, [view, search, region, year])

  // Filter grant view client-side
  const filteredGrants = (data?.grants || []).filter(g => {
    const s = search.toLowerCase()
    if (s && !g.grant_title.toLowerCase().includes(s) && !g.source?.toLowerCase().includes(s) &&
      !g.beneficiaries.some(b => b.company_name.toLowerCase().includes(s) || b.project_title?.toLowerCase().includes(s))) return false
    if (year !== 'Todos' && g.latest_year !== parseInt(year)) return false
    if (region !== 'todas' && !g.beneficiaries.some(b => b.region === region)) return false
    return true
  })

  const runScraper = async () => {
    setScraping(true)
    try {
      const r = await fetch('/api/beneficiaries/scrape', { method: 'POST' })
      const d = await r.json()
      if (d.ok) { await loadStats(); await loadGrantView() }
    } catch {}
    setScraping(false)
  }

  const totalGrantAmount = filteredGrants.reduce((s, g) => s + (g.total_approved || 0), 0)
  const totalBeneficiaries = filteredGrants.reduce((s, g) => s + g.count, 0)

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>🏆 Decisões Recentes & Beneficiários</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Lista de empresas e entidades que receberam aprovação de financiamento público em Portugal e na UE.
          Fontes: PT2030, Compete2030, PRR, ANI, IAPMEI, MAR2030, PDR, Horizonte Europa.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <StatCard icon="🏢" label="Empresas beneficiárias" value={stats.total?.toLocaleString('pt-PT')} color="#4f6ef7" />
          <StatCard icon="💶" label="Total aprovado (conhecido)" value={fmtM(stats.total_amount)} color="#22c55e" />
          <StatCard icon="📅" label="Última decisão" value={stats.by_year?.[0]?.year || '—'} sub={`${stats.by_year?.[0]?.count || 0} aprovações`} color="#06b6d4" />
          <StatCard icon="🌍" label="Fontes" value={stats.by_source?.length || '—'} sub="programas distintos" color="#f59e0b" />
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Pesquisar empresa, fundo, projeto..."
          style={{ flex: '1 1 260px', minWidth: 200, padding: '9px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}
        />
        <select value={region} onChange={e => setRegion(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
          {REGIONS.map(r => <option key={r} value={r}>{REGION_LABELS[r]}</option>)}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
          {YEARS.map(y => <option key={y} value={y}>{y === 'Todos' ? 'Todos os anos' : y}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setView('grants')} style={{ padding: '9px 14px', background: view === 'grants' ? 'var(--accent)' : 'var(--bg2)', color: view === 'grants' ? '#fff' : 'var(--muted)', border: 'none', cursor: 'pointer', fontSize: 13 }}>📋 Por Fundo</button>
          <button onClick={() => setView('flat')} style={{ padding: '9px 14px', background: view === 'flat' ? 'var(--accent)' : 'var(--bg2)', color: view === 'flat' ? '#fff' : 'var(--muted)', border: 'none', cursor: 'pointer', fontSize: 13, borderLeft: '1px solid var(--border)' }}>📊 Lista Completa</button>
        </div>
        <button onClick={runScraper} disabled={scraping}
          style={{ padding: '9px 14px', background: scraping ? 'var(--bg3)' : 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: scraping ? 'wait' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          {scraping ? '⏳ A pesquisar...' : '🔄 Atualizar dados'}
        </button>
      </div>

      {/* Summary line */}
      {view === 'grants' && !loading && (
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <span><strong style={{ color: 'var(--text)' }}>{filteredGrants.length}</strong> fundos com decisões</span>
          <span><strong style={{ color: 'var(--text)' }}>{totalBeneficiaries}</strong> beneficiários</span>
          {totalGrantAmount > 0 && <span>Total aprovado: <strong style={{ color: '#22c55e' }}>{fmtM(totalGrantAmount)}</strong></span>}
        </div>
      )}

      {/* Grant view */}
      {view === 'grants' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>A carregar decisões...</div>
        ) : filteredGrants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ color: 'var(--muted)' }}>Sem resultados para os filtros selecionados.</div>
          </div>
        ) : (
          filteredGrants.map((g, i) => <GrantBlock key={g.grant_title} grant={g} defaultOpen={i < 2} />)
        )
      )}

      {/* Flat table view */}
      {view === 'flat' && (
        <>
          {flatLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>A carregar...</div>
          ) : (
            <>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Empresa</span><span>Fundo</span><span>Projeto</span><span>Região</span><span>Ano</span><span style={{ textAlign: 'right' }}>Montante</span>
                </div>
                {(flatData?.beneficiaries || []).map((b, i) => (
                  <div key={b.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, alignItems: 'center', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{b.company_name}</div>
                      {b.sector && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.sector}</div>}
                    </div>
                    <div>
                      <div style={{ color: 'var(--text)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.grant_title}</div>
                      <div style={{ fontSize: 11, color: getSourceColor(b.source) }}>{b.source}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.project_title || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{REGION_LABELS[b.region] || b.region || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.approval_year}</div>
                    <div style={{ textAlign: 'right', fontWeight: 700, color: b.amount_approved ? '#22c55e' : 'var(--muted)', fontSize: 13 }}>{b.amount_approved ? fmt(b.amount_approved) : '—'}</div>
                  </div>
                ))}
              </div>
              {/* Pagination */}
              {flatData && flatData.total > FLAT_PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                  <button disabled={flatPage === 1} onClick={() => { const p = flatPage - 1; setFlatPage(p); loadFlatView(p) }} style={{ padding: '7px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>← Anterior</button>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>Página {flatPage} de {Math.ceil(flatData.total / FLAT_PAGE_SIZE)}</span>
                  <button disabled={flatPage >= Math.ceil(flatData.total / FLAT_PAGE_SIZE)} onClick={() => { const p = flatPage + 1; setFlatPage(p); loadFlatView(p) }} style={{ padding: '7px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>Seguinte →</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Data notice */}
      <div style={{ marginTop: 40, padding: 16, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
        ℹ️ Dados provenientes de listas públicas oficiais: Compete2030, Portugal2030, PRR/Recuperar Portugal, ANI, IAPMEI, MAR2030, PDR2020, EU Cohesion Data Portal.
        Os montantes indicados são aprovações de financiamento público (fundo perdido ou cofinanciamento). Para dados completos, consulta a fonte oficial de cada programa.
      </div>
    </div>
  )
}
