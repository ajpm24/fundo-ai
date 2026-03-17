import React, { useState, useEffect, useCallback } from 'react'

const fmt = (v) => v != null ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v) : '—'
const fmtM = (v) => v != null ? (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M €` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K €` : `${Math.round(v)} €`) : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : null

const REGIONS = ['todas', 'norte', 'centro', 'ams', 'alentejo', 'algarve', 'acores', 'madeira']
const REGION_LABELS = { todas: 'Todas as regiões', norte: 'Norte', centro: 'Centro', ams: 'A.M. Lisboa', alentejo: 'Alentejo', algarve: 'Algarve', acores: 'Açores', madeira: 'Madeira' }

const SOURCE_COLORS = {
  'PT2030': '#4f6ef7', 'COMPETE2030': '#4f6ef7', 'Portugal 2020': '#8b5cf6',
  'PRR': '#22c55e', 'ANI': '#06b6d4', 'IAPMEI': '#f59e0b',
  'Horizonte Europa': '#ec4899', 'EIC': '#ec4899', 'Erasmus+': '#f97316',
  'MAR2030': '#0ea5e9', 'PDR': '#84cc16', 'InvestEU': '#a78bfa',
  'EU Cohesion': '#6366f1', 'Diário da República': '#ef4444', 'DRE': '#ef4444',
  'Base.gov': '#94a3b8', 'Portugal2030': '#4f6ef7',
}
function getSourceColor(source) {
  for (const [k, c] of Object.entries(SOURCE_COLORS)) {
    if (source?.toLowerCase().includes(k.toLowerCase())) return c
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
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.8 }}>{sub}</div>}
    </div>
  )
}

function BeneficiaryRow({ b }) {
  const color = getSourceColor(b.source)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏢</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{b.company_name}</div>
        {b.project_title && b.project_title !== b.company_name && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.project_title}</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {b.approval_date && <span style={{ fontSize: 11, background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderRadius: 4, padding: '2px 6px' }}>📅 {fmtDate(b.approval_date)}</span>}
          {b.region && b.region !== 'todas' && <span style={{ fontSize: 11, background: 'var(--bg3)', color: 'var(--muted)', borderRadius: 4, padding: '2px 6px' }}>📍 {REGION_LABELS[b.region] || b.region}</span>}
          {b.sector && <span style={{ fontSize: 11, background: 'var(--bg3)', color: 'var(--muted)', borderRadius: 4, padding: '2px 6px' }}>🏭 {b.sector}</span>}
          {b.nif && <span style={{ fontSize: 11, color: 'var(--muted)' }}>NIF: {b.nif}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {b.amount_approved != null && <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14 }}>{fmt(b.amount_approved)}</div>}
        <div style={{ fontSize: 11, color: getSourceColor(b.source), marginTop: 2 }}>{b.source?.split('/')[0]?.trim()}</div>
        {b.source_url && (
          <a href={b.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#4f6ef7', textDecoration: 'none' }}>fonte ↗</a>
        )}
      </div>
    </div>
  )
}

function GrantBlock({ grant, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const color = getSourceColor(grant.source)
  return (
    <div style={{ background: 'var(--bg2)', border: `1px solid var(--border)`, borderLeft: `4px solid ${color}`, borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{grant.grant_title}</span>
            <span style={{ fontSize: 11, background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 4, padding: '2px 8px' }}>{grant.source}</span>
            {grant.funding_type && <FundingTypeBadge type={grant.funding_type} />}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, color: 'var(--muted)' }}>
            <span>👥 <strong style={{ color: 'var(--text)' }}>{grant.count}</strong> beneficiário{grant.count !== 1 ? 's' : ''}</span>
            {grant.total_approved > 0 && <span>💶 <strong style={{ color: '#22c55e' }}>{fmtM(grant.total_approved)}</strong></span>}
            <span>📅 <strong style={{ color: 'var(--text)' }}>{grant.latest_year}</strong></span>
            {grant.grant_id && <a href={`/grants/${grant.grant_id}`} onClick={e => e.stopPropagation()} style={{ color: '#4f6ef7', textDecoration: 'none', fontSize: 12 }}>Ver fundo →</a>}
            {grant.source_url && <a href={grant.source_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#4f6ef7', textDecoration: 'none', fontSize: 12 }}>Fonte ↗</a>}
          </div>
        </div>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0 20px' }}>
          {grant.beneficiaries.map((b, i) => <BeneficiaryRow key={b.id || i} b={b} />)}
          {grant.source_url && (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <a href={grant.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4f6ef7', fontSize: 13, textDecoration: 'none' }}>📋 Ver lista completa na fonte oficial ↗</a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Recent tab — timeline of recent decisions ─────────────────────────────
function RecentTab() {
  const [months, setMonths] = useState(3)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async (m) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/beneficiaries/since/${m}`)
      const d = await r.json()
      if (!d.error) setData(d)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load(months) }, [months])

  const runScraper = async () => {
    setScraping(true); setScrapeResult(null)
    try {
      const r = await fetch('/api/beneficiaries/scrape-recent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months })
      })
      const d = await r.json()
      setScrapeResult(d)
      if (d.ok) await load(months)
    } catch { setScrapeResult({ ok: false, error: 'Erro de ligação' }) }
    setScraping(false)
  }

  const filtered = (data?.beneficiaries || []).filter(b => {
    if (!search) return true
    const s = search.toLowerCase()
    return b.company_name?.toLowerCase().includes(s) || b.grant_title?.toLowerCase().includes(s) || b.project_title?.toLowerCase().includes(s)
  })

  // Group by source for summary
  const bySource = filtered.reduce((acc, b) => {
    const k = b.source?.split('/')[0]?.trim() || 'Outro'
    if (!acc[k]) acc[k] = { count: 0, amount: 0 }
    acc[k].count++
    acc[k].amount += b.amount_approved || 0
    return acc
  }, {})

  return (
    <div>
      {/* Period selector + scraper button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[1, 3, 6, 12].map(m => (
            <button key={m} onClick={() => setMonths(m)}
              style={{ padding: '9px 16px', background: months === m ? 'var(--accent)' : 'var(--bg2)', color: months === m ? '#fff' : 'var(--muted)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: months === m ? 600 : 400, borderRight: m !== 12 ? '1px solid var(--border)' : 'none' }}>
              {m === 1 ? 'Último mês' : m === 12 ? '12 meses' : `${m} meses`}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Pesquisar empresa ou fundo..."
          style={{ flex: '1 1 220px', padding: '9px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
        <button onClick={runScraper} disabled={scraping}
          style={{ padding: '9px 16px', background: scraping ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: scraping ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {scraping ? '⏳ A pesquisar fontes...' : '🔄 Atualizar dados'}
        </button>
      </div>

      {/* Scrape result */}
      {scrapeResult && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: scrapeResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${scrapeResult.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, fontSize: 13 }}>
          {scrapeResult.ok
            ? `✅ ${scrapeResult.added} novos registos adicionados de ${scrapeResult.total_found} encontrados (DRE: ${scrapeResult.sources?.dre || 0}, EU Cohesion: ${scrapeResult.sources?.eu_cohesion || 0}, Compete2030: ${scrapeResult.sources?.compete2030 || 0}, Portugal2030: ${scrapeResult.sources?.portugal2030 || 0})`
            : `❌ ${scrapeResult.error || 'Erro ao pesquisar'}`}
        </div>
      )}

      {/* Summary by source */}
      {!loading && Object.keys(bySource).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {Object.entries(bySource).sort((a, b) => b[1].count - a[1].count).map(([src, d]) => {
            const color = getSourceColor(src)
            return (
              <div key={src} style={{ background: color + '15', border: `1px solid ${color}40`, borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                <span style={{ color, fontWeight: 600 }}>{src}</span>
                <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{d.count} aprovações</span>
                {d.amount > 0 && <span style={{ color: '#22c55e', marginLeft: 8 }}>{fmtM(d.amount)}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* Stats bar */}
      {data && !loading && (
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
          <span>🏢 <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> aprovações</span>
          {data.total_amount > 0 && <span>💶 <strong style={{ color: '#22c55e' }}>{fmtM(data.total_amount)}</strong> aprovados</span>}
          <span style={{ color: 'var(--muted)' }}>Desde {data.since}</span>
        </div>
      )}

      {/* Main list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>A carregar decisões recentes...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Sem dados para este período</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
            Clica "Atualizar dados" para pesquisar nas fontes oficiais (DRE, EU Cohesion, Compete2030).
          </div>
          <button onClick={runScraper} disabled={scraping}
            style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            {scraping ? '⏳ A pesquisar...' : '🔄 Pesquisar fontes agora'}
          </button>
        </div>
      ) : (
        <div>
          {filtered.map((b, i) => (
            <div key={b.id || i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
              {/* Date column */}
              <div style={{ textAlign: 'center', minWidth: 56, flexShrink: 0 }}>
                {b.approval_date ? (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{new Date(b.approval_date).getDate().toString().padStart(2, '0')}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>{new Date(b.approval_date).toLocaleDateString('pt-PT', { month: 'short' })}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(b.approval_date).getFullYear()}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--muted)', lineHeight: 1 }}>{b.approval_year}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>ano</div>
                  </>
                )}
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{b.company_name}</div>
                    {b.project_title && b.project_title !== b.company_name && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.project_title}</div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: 11, background: getSourceColor(b.source) + '20', color: getSourceColor(b.source), borderRadius: 4, padding: '2px 7px' }}>{b.grant_title?.slice(0, 50)}</span>
                      {b.region && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {REGION_LABELS[b.region] || b.region}</span>}
                      {b.sector && <span style={{ fontSize: 11, color: 'var(--muted)' }}>🏭 {b.sector}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {b.amount_approved != null && <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14 }}>{fmt(b.amount_approved)}</div>}
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{b.source?.split('/')[0]?.trim()}</div>
                    {b.source_url && <a href={b.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#4f6ef7', textDecoration: 'none' }}>fonte ↗</a>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Data sources explanation */}
      <div style={{ marginTop: 32, padding: '14px 18px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
        <strong style={{ color: 'var(--text)' }}>Fontes de dados para decisões recentes:</strong>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>🔴 <strong style={{ color: 'var(--text)' }}>Diário da República (DRE)</strong> — Despachos oficiais de aprovação publicados pelo governo</div>
          <div>🔵 <strong style={{ color: 'var(--text)' }}>EU Cohesion Data Portal</strong> — API aberta com projetos FEDER/FSE financiados em Portugal</div>
          <div>🟣 <strong style={{ color: 'var(--text)' }}>Compete2030.pt</strong> — Lista oficial de beneficiários do programa Compete2030</div>
          <div>🟢 <strong style={{ color: 'var(--text)' }}>Portugal2030.pt</strong> — Avisos e decisões de candidaturas do portal PT2030</div>
        </div>
        <div style={{ marginTop: 8 }}>⚠️ Nota: As listas oficiais são atualizadas trimestralmente. Para dados em tempo real, consulta diretamente o portal do programa.</div>
      </div>
    </div>
  )
}

export default function Beneficiaries() {
  const [activeTab, setActiveTab] = useState('recent') // 'recent' | 'grants' | 'flat'
  const [data, setData] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('todas')
  const [year, setYear] = useState('Todos')
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
      const r = await fetch('/api/beneficiaries/recent?limit=200')
      const d = await r.json()
      if (!d.error) setData(d)
    } catch {}
    setLoading(false)
  }, [])

  const loadFlatView = useCallback(async (pg = 1) => {
    setFlatLoading(true)
    try {
      const params = new URLSearchParams({ limit: FLAT_PAGE_SIZE, offset: (pg - 1) * FLAT_PAGE_SIZE, sort: 'recent' })
      if (search) params.set('search', search)
      if (region !== 'todas') params.set('region', region)
      if (year !== 'Todos') params.set('year', year)
      const r = await fetch(`/api/beneficiaries?${params}`)
      const d = await r.json()
      if (!d.error) setFlatData(d)
    } catch {}
    setFlatLoading(false)
  }, [search, region, year])

  useEffect(() => {
    loadStats()
    if (activeTab === 'grants') loadGrantView()
    if (activeTab === 'flat') { setFlatPage(1); loadFlatView(1) }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'flat') { setFlatPage(1); loadFlatView(1) }
  }, [search, region, year])

  const filteredGrants = (data?.grants || []).filter(g => {
    const s = search.toLowerCase()
    if (s && !g.grant_title.toLowerCase().includes(s) && !g.source?.toLowerCase().includes(s) &&
      !g.beneficiaries.some(b => b.company_name.toLowerCase().includes(s))) return false
    if (year !== 'Todos' && g.latest_year !== parseInt(year)) return false
    if (region !== 'todas' && !g.beneficiaries.some(b => b.region === region)) return false
    return true
  })

  const runScraper = async () => {
    setScraping(true)
    try {
      const r = await fetch('/api/beneficiaries/scrape', { method: 'POST' })
      const d = await r.json()
      if (d.ok) { await loadStats(); if (activeTab === 'grants') await loadGrantView() }
    } catch {}
    setScraping(false)
  }

  const TABS = [
    { id: 'recent', label: '🕐 Decisões Recentes', desc: 'Últimas aprovações por período' },
    { id: 'grants', label: '📋 Por Programa', desc: 'Agrupado por fundo' },
    { id: 'flat', label: '📊 Lista Completa', desc: 'Todos os beneficiários' },
  ]

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>🏆 Beneficiários & Decisões</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Empresas e entidades aprovadas para financiamento público em Portugal e na UE.
          Dados actualizados automaticamente a partir de fontes oficiais: DRE, EU Cohesion, Compete2030, PT2030.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <StatCard icon="🏢" label="Beneficiários" value={stats.total?.toLocaleString('pt-PT')} color="#4f6ef7" />
          <StatCard icon="💶" label="Total aprovado" value={fmtM(stats.total_amount)} color="#22c55e" />
          <StatCard icon="📅" label="Última decisão" value={stats.by_year?.[0]?.year || '—'} sub={`${stats.by_year?.[0]?.count || 0} aprovações`} color="#06b6d4" />
          <StatCard icon="🌍" label="Fontes" value={stats.by_source?.length || '—'} sub="programas distintos" color="#f59e0b" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg2)' }}>
        {TABS.map((tab, i) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '12px 16px', background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
            color: activeTab === tab.id ? '#fff' : 'var(--muted)', border: 'none',
            borderRight: i < TABS.length - 1 ? '1px solid var(--border)' : 'none',
            cursor: 'pointer', fontWeight: activeTab === tab.id ? 600 : 400, fontSize: 13, transition: 'all 0.2s'
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Recentes ─────────────────────────────────────────────────── */}
      {activeTab === 'recent' && <RecentTab />}

      {/* ── Tab: Por Programa ─────────────────────────────────────────────── */}
      {activeTab === 'grants' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Pesquisar empresa, fundo..."
              style={{ flex: '1 1 220px', padding: '9px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
            <select value={region} onChange={e => setRegion(e.target.value)}
              style={{ padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
              {REGIONS.map(r => <option key={r} value={r}>{REGION_LABELS[r]}</option>)}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)}
              style={{ padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
              {['Todos', '2025', '2024', '2023', '2022', '2021', '2020'].map(y => <option key={y} value={y}>{y === 'Todos' ? 'Todos os anos' : y}</option>)}
            </select>
            <button onClick={runScraper} disabled={scraping}
              style={{ padding: '9px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
              {scraping ? '⏳' : '🔄'} Atualizar
            </button>
          </div>
          {!loading && (
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
              <strong style={{ color: 'var(--text)' }}>{filteredGrants.length}</strong> fundos ·&nbsp;
              <strong style={{ color: 'var(--text)' }}>{filteredGrants.reduce((s, g) => s + g.count, 0)}</strong> beneficiários
            </div>
          )}
          {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>A carregar...</div>
            : filteredGrants.map((g, i) => <GrantBlock key={g.grant_title} grant={g} defaultOpen={i < 2} />)}
        </>
      )}

      {/* ── Tab: Lista Completa ────────────────────────────────────────────── */}
      {activeTab === 'flat' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Pesquisar..."
              style={{ flex: '1 1 220px', padding: '9px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
            <select value={region} onChange={e => setRegion(e.target.value)}
              style={{ padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
              {REGIONS.map(r => <option key={r} value={r}>{REGION_LABELS[r]}</option>)}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)}
              style={{ padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
              {['Todos', '2025', '2024', '2023', '2022', '2021', '2020'].map(y => <option key={y} value={y}>{y === 'Todos' ? 'Todos os anos' : y}</option>)}
            </select>
          </div>
          {flatLoading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>A carregar...</div> : (
            <>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr', gap: 0, padding: '10px 16px', background: 'var(--bg3)', fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Empresa</span><span>Programa</span><span>Projeto</span><span>Região</span><span>Ano</span><span style={{ textAlign: 'right' }}>Montante</span>
                </div>
                {(flatData?.beneficiaries || []).map((b, i) => (
                  <div key={b.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr', gap: 0, padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 13, alignItems: 'center', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <div><div style={{ fontWeight: 600 }}>{b.company_name}</div>{b.sector && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.sector}</div>}</div>
                    <div><div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.grant_title}</div><div style={{ fontSize: 11, color: getSourceColor(b.source) }}>{b.source?.split('/')[0]?.trim()}</div></div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.project_title || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{REGION_LABELS[b.region] || b.region || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.approval_date ? fmtDate(b.approval_date) : b.approval_year}</div>
                    <div style={{ textAlign: 'right', fontWeight: 700, color: b.amount_approved ? '#22c55e' : 'var(--muted)', fontSize: 13 }}>{b.amount_approved ? fmt(b.amount_approved) : '—'}</div>
                  </div>
                ))}
              </div>
              {flatData && flatData.total > FLAT_PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                  <button disabled={flatPage === 1} onClick={() => { const p = flatPage - 1; setFlatPage(p); loadFlatView(p) }} style={{ padding: '7px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>← Anterior</button>
                  <span style={{ color: 'var(--muted)', fontSize: 13, alignSelf: 'center' }}>Página {flatPage} de {Math.ceil(flatData.total / FLAT_PAGE_SIZE)}</span>
                  <button disabled={flatPage >= Math.ceil(flatData.total / FLAT_PAGE_SIZE)} onClick={() => { const p = flatPage + 1; setFlatPage(p); loadFlatView(p) }} style={{ padding: '7px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer' }}>Seguinte →</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
