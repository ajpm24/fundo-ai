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

// ── Recent tab — timeline + sector view ───────────────────────────────────
const SECTOR_ICONS = {
  'IA / Tecnologia': '🤖', 'Digitalização': '💻', 'I&D e Inovação': '🔬',
  'PME e Empreendedorismo': '🚀', 'Internacionalização': '🌍', 'Energia e Clima': '⚡',
  'Saúde': '🏥', 'Educação e Emprego': '🎓', 'Agro-alimentar e Mar': '🌾',
  'Construção e Habitação': '🏗️', 'Turismo e Cultura': '🏛️', 'Transportes': '🚊',
  'Ambiente': '🌿', 'Inclusão Social': '🤝', 'PME': '🏢',
  'I&D': '🔬', 'público': '🏛️',
}

function RecentTab() {
  const [months, setMonths] = useState(3)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('timeline') // 'timeline' | 'sector'
  const [activeSector, setActiveSector] = useState(null)
  const [dreRunning, setDreRunning] = useState(false)
  const [dreDespachos, setDreDespachos] = useState(null)
  const [showDreLog, setShowDreLog] = useState(false)

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

  const runDREScraper = async () => {
    setDreRunning(true)
    try {
      await fetch('/api/beneficiaries/scrape-dre', { method: 'POST' })
      // DRE runs in background — poll after 15s
      setTimeout(async () => {
        await load(months)
        const r = await fetch('/api/beneficiaries/dre-despachos')
        const d = await r.json()
        if (Array.isArray(d)) setDreDespachos(d)
        setDreRunning(false)
      }, 15000)
    } catch { setDreRunning(false) }
  }

  const loadDreLog = async () => {
    try {
      const r = await fetch('/api/beneficiaries/dre-despachos')
      const d = await r.json()
      if (Array.isArray(d)) setDreDespachos(d)
    } catch {}
    setShowDreLog(v => !v)
  }

  const allItems = data?.beneficiaries || []

  const filtered = allItems.filter(b => {
    if (!search) return true
    const s = search.toLowerCase()
    return b.company_name?.toLowerCase().includes(s) ||
      b.grant_title?.toLowerCase().includes(s) ||
      b.sector?.toLowerCase().includes(s) ||
      b.project_title?.toLowerCase().includes(s)
  })

  // Group by sector
  const bySector = filtered.reduce((acc, b) => {
    const k = b.sector || 'Outros'
    if (!acc[k]) acc[k] = { count: 0, amount: 0, items: [] }
    acc[k].count++
    acc[k].amount += b.amount_approved || 0
    acc[k].items.push(b)
    return acc
  }, {})

  const sectorsSorted = Object.entries(bySector).sort((a, b) => b[1].count - a[1].count)

  // Group by source for summary pills
  const bySource = filtered.reduce((acc, b) => {
    const k = b.source?.split('/')[0]?.trim() || 'Outro'
    if (!acc[k]) acc[k] = { count: 0, amount: 0 }
    acc[k].count++
    acc[k].amount += b.amount_approved || 0
    return acc
  }, {})

  const sectorFilteredItems = activeSector
    ? filtered.filter(b => (b.sector || 'Outros') === activeSector)
    : filtered

  const RecentItemRow = ({ b, i }) => (
    <div key={b.id || i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
      <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
        {b.approval_date ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{new Date(b.approval_date + 'T12:00:00').getDate().toString().padStart(2, '0')}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>{new Date(b.approval_date + 'T12:00:00').toLocaleDateString('pt-PT', { month: 'short' })}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(b.approval_date + 'T12:00:00').getFullYear()}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--muted)', lineHeight: 1.2 }}>{b.approval_year}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>ano</div>
          </>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{b.company_name}</div>
            {b.project_title && b.project_title !== b.company_name && b.project_title !== 'Ver lista na fonte oficial' && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.project_title}</div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <span style={{ fontSize: 11, background: getSourceColor(b.source) + '20', color: getSourceColor(b.source), borderRadius: 4, padding: '2px 7px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.grant_title?.slice(0, 55)}</span>
              {b.sector && <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderRadius: 4, padding: '2px 7px' }}>{SECTOR_ICONS[b.sector] || '🏭'} {b.sector}</span>}
              {b.region && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {REGION_LABELS[b.region] || b.region}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
            {b.amount_approved != null && <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 14 }}>{fmtM(b.amount_approved)}</div>}
            <div style={{ fontSize: 11, color: getSourceColor(b.source), marginTop: 2 }}>{b.source?.split('/')[0]?.trim()}</div>
            {b.source_url && <a href={b.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#4f6ef7', textDecoration: 'none' }}>fonte ↗</a>}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* DRE live panel */}
      <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>🔴 Diário da República — dados quase-live</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            Monitoriza os despachos publicados no DRE e extrai automaticamente as tabelas de beneficiários.<br />
            <strong style={{ color: 'var(--text)' }}>Atraso: 1–5 dias</strong> após a decisão ser assinada.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={runDREScraper} disabled={dreRunning}
            style={{ padding: '8px 16px', background: dreRunning ? 'var(--bg3)' : '#ef4444', color: '#fff', border: 'none', borderRadius: 7, cursor: dreRunning ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {dreRunning ? '⏳ A processar DRE...' : '🔴 Verificar DRE agora'}
          </button>
          <button onClick={loadDreLog}
            style={{ padding: '8px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>
            {showDreLog ? 'Ocultar log' : '📋 Ver despachos'}
          </button>
        </div>
      </div>

      {/* DRE despachos log */}
      {showDreLog && dreDespachos && (
        <div style={{ marginBottom: 16, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: 'var(--bg3)', fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            <span>DESPACHOS PROCESSADOS ({dreDespachos.length})</span>
            <span>beneficiários extraídos</span>
          </div>
          {dreDespachos.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nenhum despacho processado ainda. Clica "Verificar DRE agora".
            </div>
          ) : dreDespachos.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderTop: '1px solid var(--border)', fontSize: 12 }}>
              <div style={{ minWidth: 70, color: 'var(--muted)' }}>{d.pub_date || '—'}</div>
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'none' }}>{d.title}</a> : d.title}
              </div>
              <div style={{ minWidth: 80, textAlign: 'right', color: d.beneficiaries_found > 0 ? '#22c55e' : 'var(--muted)', fontWeight: d.beneficiaries_found > 0 ? 700 : 400 }}>
                {d.beneficiaries_found > 0 ? `✅ ${d.beneficiaries_found} benef.` : '—'}
              </div>
              <div style={{ fontSize: 11, color: '#ef4444', minWidth: 50 }}>{d.series}</div>
            </div>
          ))}
        </div>
      )}

      {/* Controls row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18, alignItems: 'center' }}>
        {/* Period */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[1, 3, 6, 12].map(m => (
            <button key={m} onClick={() => { setMonths(m); setActiveSector(null) }}
              style={{ padding: '8px 14px', background: months === m ? 'var(--accent)' : 'var(--bg2)', color: months === m ? '#fff' : 'var(--muted)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: months === m ? 600 : 400, borderRight: m !== 12 ? '1px solid var(--border)' : 'none' }}>
              {m === 1 ? 'Último mês' : m === 12 ? '12 meses' : `${m} meses`}
            </button>
          ))}
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[['timeline', '📅 Cronologia'], ['sector', '🏭 Por Setor']].map(([v, label]) => (
            <button key={v} onClick={() => { setView(v); setActiveSector(null) }}
              style={{ padding: '8px 14px', background: view === v ? '#6366f1' : 'var(--bg2)', color: view === v ? '#fff' : 'var(--muted)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: view === v ? 600 : 400, borderRight: v === 'timeline' ? '1px solid var(--border)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => { setSearch(e.target.value); setActiveSector(null) }}
          placeholder="🔍 Empresa, setor, fundo..."
          style={{ flex: '1 1 200px', padding: '8px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
        <button onClick={runScraper} disabled={scraping}
          style={{ padding: '8px 16px', background: scraping ? 'var(--bg3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: scraping ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {scraping ? '⏳ A pesquisar...' : '🔄 Atualizar'}
        </button>
      </div>

      {/* Scrape result banner */}
      {scrapeResult && (
        <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 8, background: scrapeResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${scrapeResult.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, fontSize: 13 }}>
          {scrapeResult.ok
            ? `✅ ${scrapeResult.added} novos registos · PRR: ${scrapeResult.sources?.prr || 0} · EU Kohesio: ${scrapeResult.sources?.eu_kohesio || 0} · DRE: ${scrapeResult.sources?.dre || 0} · ANI/PT2030: ${scrapeResult.sources?.ani_pt2030 || 0}`
            : `❌ ${scrapeResult.error || 'Erro ao pesquisar'}`}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          A carregar decisões recentes...
        </div>
      ) : filtered.length === 0 ? (
        /* ── Empty state ── */
        <div style={{ padding: '32px 24px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Sem dados para os últimos {months === 1 ? 'mês' : `${months} meses`}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Clica <strong>"Atualizar"</strong> para pesquisar agora nas fontes oficiais.<br />
              O sistema pesquisa automaticamente todos os dias à meia-noite.
            </div>
            <button onClick={runScraper} disabled={scraping}
              style={{ padding: '11px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              {scraping ? '⏳ A pesquisar fontes...' : '🔄 Pesquisar agora'}
            </button>
          </div>
          {/* Sources explanation */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--muted)' }}>FONTES PESQUISADAS AUTOMATICAMENTE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {[
                { icon: '🟢', name: 'PRR — recuperarportugal.gov.pt', desc: 'Candidaturas e decisões do Plano de Recuperação e Resiliência', lag: '~2 semanas' },
                { icon: '🔴', name: 'Diário da República (DRE)', desc: 'Despachos oficiais de aprovação de apoios e incentivos', lag: '~3 dias' },
                { icon: '🔵', name: 'EU Kohesio', desc: 'API aberta da CE com projetos FEDER/FSE em Portugal 2014–2022', lag: 'trimestral' },
                { icon: '🟣', name: 'ANI / Portugal2030', desc: 'Projetos I&D aprovados e avisos do portal PT2030', lag: '~1 mês' },
              ].map(s => (
                <div key={s.name} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{s.icon} {s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>⏱ Atraso típico: {s.lag}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats + source pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ padding: '6px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              🏢 <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> aprovações
              {data?.total_amount > 0 && <> · 💶 <strong style={{ color: '#22c55e' }}>{fmtM(data.total_amount)}</strong></>}
              <span style={{ color: 'var(--muted)', marginLeft: 8 }}>desde {data?.since}</span>
            </div>
            {Object.entries(bySource).sort((a, b) => b[1].count - a[1].count).map(([src, d]) => {
              const color = getSourceColor(src)
              return (
                <div key={src} style={{ background: color + '14', border: `1px solid ${color}35`, borderRadius: 8, padding: '5px 12px', fontSize: 12 }}>
                  <span style={{ color, fontWeight: 600 }}>{src}</span>
                  <span style={{ color: 'var(--muted)', marginLeft: 6 }}>{d.count}</span>
                  {d.amount > 0 && <span style={{ color: '#22c55e', marginLeft: 6 }}>{fmtM(d.amount)}</span>}
                </div>
              )
            })}
          </div>

          {/* ── View: Por Setor ── */}
          {view === 'sector' && (
            <div>
              {activeSector ? (
                /* Drill-down into one sector */
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <button onClick={() => setActiveSector(null)}
                      style={{ padding: '6px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>
                      ← Todos os setores
                    </button>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{SECTOR_ICONS[activeSector] || '🏭'} {activeSector}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 13 }}>{bySector[activeSector]?.count} aprovações · {fmtM(bySector[activeSector]?.amount)}</span>
                  </div>
                  {sectorFilteredItems.map((b, i) => <RecentItemRow key={b.id || i} b={b} i={i} />)}
                </>
              ) : (
                /* Sector grid */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {sectorsSorted.map(([sector, d]) => (
                    <div key={sector} onClick={() => setActiveSector(sector)}
                      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{SECTOR_ICONS[sector] || '🏭'}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{sector}</div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
                        <span style={{ color: 'var(--accent)' }}><strong>{d.count}</strong> aprovações</span>
                        {d.amount > 0 && <span style={{ color: '#22c55e' }}><strong>{fmtM(d.amount)}</strong></span>}
                      </div>
                      {/* Preview: top 2 companies */}
                      <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                        {d.items.slice(0, 2).map((b, i) => (
                          <div key={i} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            · {b.company_name}{b.amount_approved ? ` — ${fmtM(b.amount_approved)}` : ''}
                          </div>
                        ))}
                        {d.count > 2 && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>+{d.count - 2} mais →</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── View: Cronologia ── */}
          {view === 'timeline' && (
            <div>
              {filtered.map((b, i) => <RecentItemRow key={b.id || i} b={b} i={i} />)}
            </div>
          )}
        </>
      )}

      {/* Footer note */}
      {!loading && (
        <div style={{ marginTop: 24, padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>🔄 Atualização automática: diária (meia-noite)</span>
          <span>⚠️ Atraso típico das fontes oficiais: 2 semanas – 3 meses após aprovação interna</span>
          <span>📋 Para ver lista completa de beneficiários vai a <strong>"Lista Completa"</strong></span>
        </div>
      )}
    </div>
  )
}

// ── Import CSV Tab — import from official PT portals ─────────────────────
const PORTAL_SOURCES = [
  {
    name: 'fundos2020.pt',
    label: 'Portugal 2020 (Fundos2020)',
    url: 'https://www.fundos2020.pt/site/listaBeneficiarios',
    description: 'Lista completa de beneficiários do Portugal 2020 — COMPETE2020, POSEUR, PDR2020, etc.',
    steps: [
      'Acede a fundos2020.pt/site/listaBeneficiarios',
      'Seleciona o programa (ex: COMPETE, PDR, POSEUR)',
      'Clica em "Exportar" → "Excel" ou "CSV"',
      'Carrega o ficheiro aqui em baixo',
    ],
    color: '#4f6ef7',
  },
  {
    name: 'compete2030.pt',
    label: 'COMPETE2030 / PT2030',
    url: 'https://www.compete2030.pt/beneficiarios',
    description: 'Beneficiários do COMPETE2030 — SI Inovação, Digitalização PME, etc.',
    steps: [
      'Acede a compete2030.pt/beneficiarios',
      'Aplica os filtros que quiseres (programa, região, setor)',
      'Clica em "Exportar lista" → CSV ou Excel',
      'Carrega o ficheiro aqui',
    ],
    color: '#22c55e',
  },
  {
    name: 'recuperarportugal.gov.pt',
    label: 'PRR — Recuperar Portugal',
    url: 'https://recuperarportugal.gov.pt/beneficiarios',
    description: 'Beneficiários das Agendas e investimentos do Plano de Recuperação e Resiliência.',
    steps: [
      'Acede a recuperarportugal.gov.pt/beneficiarios',
      'Seleciona componente e tipologia',
      'Exporta em formato CSV/Excel',
      'Carrega o ficheiro aqui',
    ],
    color: '#22c55e',
  },
  {
    name: 'ani.pt',
    label: 'ANI — Projetos I&D',
    url: 'https://www.ani.pt/projetos',
    description: 'Projetos de I&D financiados pela ANI — copromoção, individuais, mobilizadores.',
    steps: [
      'Acede a ani.pt/projetos',
      'Pesquisa e filtra por programa/ano',
      'Exporta os resultados (CSV/Excel)',
      'Carrega o ficheiro aqui',
    ],
    color: '#06b6d4',
  },
]

function ImportTab({ onImported }) {
  const [csvText, setCsvText] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeSource, setActiveSource] = useState(0)
  const [kohesioRunning, setKohesioRunning] = useState(false)
  const [kohesioResult, setKohesioResult] = useState(null)

  const runKohesioImport = async () => {
    setKohesioRunning(true); setKohesioResult(null)
    try {
      const r = await fetch('/api/beneficiaries/import-kohesio', { method: 'POST' })
      const d = await r.json()
      setKohesioResult(d)
      // Poll stats after 30s to show progress
      setTimeout(() => { onImported?.() }, 30000)
    } catch (e) { setKohesioResult({ ok: false, error: e.message }) }
    setKohesioRunning(false)
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      setCsvText(text)
      // Preview first 5 rows
      const lines = text.split('\n').slice(0, 6)
      setPreview(lines)
    }
    reader.readAsText(f, 'UTF-8')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    const fakeEvent = { target: { files: [f] } }
    handleFile(fakeEvent)
  }

  const doImport = async () => {
    if (!csvText.trim()) return
    setImporting(true); setResult(null); setError(null)
    try {
      const r = await fetch('/api/beneficiaries/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText })
      })
      const d = await r.json()
      if (d.ok) {
        setResult(d)
        onImported?.()
      } else {
        setError(d.error || 'Erro na importação')
      }
    } catch (e) {
      setError(e.message)
    }
    setImporting(false)
  }

  const clearAll = () => { setCsvText(''); setFile(null); setPreview(null); setResult(null); setError(null) }

  return (
    <div>
      {/* EU Kohesio auto-import */}
      <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(79,110,247,0.08))', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>🇪🇺 Importação automática — EU Kohesio (53.000+ registos)</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
              Base de dados oficial da Comissão Europeia com <strong>todas as operações FEDER/FSE/FC em Portugal</strong> acima de €50.000, período 2014-2020.
              Inclui empresas, municípios, instituições públicas e privadas.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
              {['53.000+ beneficiários', '€39 mil milhões aprovados', 'Fonte: cohesiondata.ec.europa.eu', 'FEDER + FSE + Fundo de Coesão'].map(t => (
                <span key={t} style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <button onClick={runKohesioImport} disabled={kohesioRunning}
              style={{ padding: '12px 24px', background: kohesioRunning ? 'var(--bg3)' : '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: kohesioRunning ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
              {kohesioRunning ? '⏳ A importar em background...' : '🚀 Importar agora'}
            </button>
          </div>
        </div>
        {kohesioResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: kohesioResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', fontSize: 13 }}>
            {kohesioResult.ok
              ? '✅ Importação iniciada em background — pode levar 5-10 minutos. Os dados vão aparecer progressivamente na Lista Completa.'
              : `❌ ${kohesioResult.error}`}
          </div>
        )}
      </div>

      {/* Info header */}
      <div style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>📁 Ou importa CSV dos portais nacionais</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
          Para dados PT2030, PRR, ANI ou IAPMEI, descarrega o CSV do portal oficial e importa-o aqui.
          Reconhece automaticamente as colunas de qualquer portal português.
        </div>
      </div>

      {/* Portal cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 28 }}>
        {PORTAL_SOURCES.map((src, i) => (
          <div key={src.name} onClick={() => setActiveSource(i)}
            style={{ background: 'var(--bg2)', border: `2px solid ${activeSource === i ? src.color : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ fontWeight: 700, color: src.color, marginBottom: 4, fontSize: 13 }}>{src.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.4 }}>{src.description}</div>
            <a href={src.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 12, color: src.color, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, background: src.color + '15', padding: '4px 10px', borderRadius: 6 }}>
              Abrir portal ↗
            </a>
          </div>
        ))}
      </div>

      {/* Steps for selected portal */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, color: PORTAL_SOURCES[activeSource].color }}>
          📋 Como exportar de {PORTAL_SOURCES[activeSource].label}:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PORTAL_SOURCES[activeSource].steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
              <span style={{ minWidth: 22, height: 22, borderRadius: '50%', background: PORTAL_SOURCES[activeSource].color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ color: 'var(--text)', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
        style={{ border: `2px dashed ${file ? '#22c55e' : 'var(--border)'}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', marginBottom: 20, background: file ? 'rgba(34,197,94,0.05)' : 'var(--bg2)', transition: 'all 0.2s' }}>
        {file ? (
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>{file.name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>{(file.size / 1024).toFixed(1)} KB · {csvText.split('\n').length - 1} linhas</div>
            <button onClick={clearAll} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>Limpar</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Arrasta o ficheiro CSV/Excel para aqui</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>ou clica para selecionar</div>
            <label style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Selecionar ficheiro
              <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* Or paste CSV */}
      {!file && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Ou cola o conteúdo CSV diretamente:</div>
          <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setPreview(e.target.value.split('\n').slice(0, 6)) }}
            placeholder={'Beneficiário;NIF;Programa;Região;Montante Aprovado;Data Aprovação;Projeto\nEmpresa Exemplo, S.A.;500123456;PT2030;Norte;250000;15/03/2024;Projeto X'}
            style={{ width: '100%', minHeight: 120, padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
      )}

      {/* Preview */}
      {preview && preview.length > 1 && (
        <div style={{ marginBottom: 20, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: 'var(--bg3)', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
            PRÉ-VISUALIZAÇÃO ({Math.max(0, csvText.split('\n').filter(l => l.trim()).length - 1)} registos no total)
          </div>
          <div style={{ overflowX: 'auto', padding: '8px 0' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              {preview.slice(0, 6).map((line, i) => (
                <tr key={i} style={{ background: i === 0 ? 'var(--bg3)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                  {line.split(/[;,]/).slice(0, 8).map((cell, j) => (
                    <td key={j} style={{ padding: '5px 12px', color: i === 0 ? 'var(--muted)' : 'var(--text)', fontWeight: i === 0 ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 180, textOverflow: 'ellipsis' }}>
                      {cell.replace(/^["']|["']$/g, '').trim() || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      {csvText.trim() && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={doImport} disabled={importing}
            style={{ padding: '12px 28px', background: importing ? 'var(--bg3)' : '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: importing ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700 }}>
            {importing ? '⏳ A importar...' : '📥 Importar para a base de dados'}
          </button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {csvText.split('\n').filter(l => l.trim()).length - 1} registos encontrados
          </span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ marginTop: 16, padding: '16px 20px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 15, marginBottom: 8 }}>✅ Importação concluída!</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
            <span>✅ <strong>{result.added}</strong> novos registos adicionados</span>
            <span>⏭️ <strong>{result.skipped}</strong> já existiam (ignorados)</span>
            <span>📊 <strong>{result.total_in_db}</strong> beneficiários na base de dados</span>
          </div>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {/* Tips */}
      <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>💡 Dicas de importação</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          <div>• Suporta <strong>separador ponto-e-vírgula (;) ou vírgula (,)</strong></div>
          <div>• Reconhece automaticamente as colunas dos portais: <strong>fundos2020.pt, compete2030.pt, recuperarportugal.gov.pt, ani.pt</strong></div>
          <div>• Colunas obrigatórias: <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>Beneficiário</code> (ou similar)</div>
          <div>• Colunas opcionais: NIF, Programa, Região, Montante Aprovado, Data Aprovação, Projeto</div>
          <div>• Ficheiros Excel (.xlsx): exporta para CSV antes de importar</div>
          <div>• Registos duplicados são automaticamente ignorados (baseado no NIF + programa)</div>
        </div>
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
    { id: 'import', label: '📥 Importar CSV', desc: 'Importar dos portais oficiais' },
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

      {/* ── Tab: Importar CSV ─────────────────────────────────────────────── */}
      {activeTab === 'import' && <ImportTab onImported={() => { loadStats(); if (activeTab === 'grants') loadGrantView() }} />}

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
