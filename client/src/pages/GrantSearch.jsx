import React, { useEffect, useRef, useState } from 'react'
import GrantCard from '../components/GrantCard'

const SIZES = [
  { value: '', label: 'Todos os tamanhos' },
  { value: 'startup', label: 'Startup' },
  { value: 'micro', label: 'Microempresa (< 10 trabalhadores)' },
  { value: 'pequena', label: 'Pequena (10–49 trabalhadores)' },
  { value: 'média', label: 'Média (50–249 trabalhadores)' },
  { value: 'grande', label: 'Grande (≥ 250 trabalhadores)' },
]

const FUNDING_TYPES = [
  { value: '', label: 'Todos os tipos' },
  { value: 'fundo_perdido', label: '🎁 Fundo Perdido' },
  { value: 'reembolsavel', label: '🔄 Reembolsável' },
  { value: 'misto', label: '🔀 Misto' },
  { value: 'equity', label: '📈 Capital (equity)' },
  { value: 'garantia', label: '🛡️ Garantia de Crédito' },
  { value: 'voucher', label: '🎟️ Voucher' },
  { value: 'emprestimo', label: '🏦 Empréstimo Bonificado' },
]

const CATEGORIES = [
  { value: '', label: 'Todas as categorias' },
  { value: 'inovacao', label: '🚀 Inovação Empresarial' },
  { value: 'investigacao', label: '🔬 Investigação & Desenvolvimento' },
  { value: 'digitalizacao', label: '💻 Digitalização & Tecnologia' },
  { value: 'internacionalizacao', label: '🌍 Internacionalização' },
  { value: 'ambiente', label: '🌿 Ambiente & Sustentabilidade' },
  { value: 'energia', label: '⚡ Energia (renováveis, hidrogénio)' },
  { value: 'agro', label: '🌾 Agro-alimentar & Floresta' },
  { value: 'maritimo', label: '🌊 Marítimo, Pesca & Aquicultura' },
  { value: 'turismo', label: '🏨 Turismo' },
  { value: 'cultura', label: '🎭 Cultura & Audiovisual' },
  { value: 'social', label: '🤝 Social & Inclusão' },
  { value: 'formacao', label: '📚 Formação & Emprego' },
  { value: 'saude', label: '🏥 Saúde & Medtech' },
  { value: 'espacial', label: '🛸 Espaço & Satélites' },
  { value: 'emprego', label: '👷 Emprego & Contratação' },
]

const REGIONS = [
  { value: '', label: 'Todas as regiões' },
  { value: 'todas', label: '🇪🇺 Toda a Europa' },
  { value: 'nacional', label: '🇵🇹 Portugal (nacional)' },
  { value: 'norte', label: '🏔️ Norte' },
  { value: 'centro', label: '🌲 Centro' },
  { value: 'ams', label: '🏙️ Área Metropolitana de Lisboa' },
  { value: 'alentejo', label: '🌾 Alentejo' },
  { value: 'algarve', label: '☀️ Algarve' },
  { value: 'acores', label: '🌋 Açores' },
  { value: 'madeira', label: '🌺 Madeira' },
]

const AMOUNT_RANGES = [
  { value: '', label: 'Qualquer valor' },
  { value: '0-25000', label: 'Até €25.000' },
  { value: '25000-100000', label: '€25K – €100K' },
  { value: '100000-500000', label: '€100K – €500K' },
  { value: '500000-2000000', label: '€500K – €2M' },
  { value: '2000000-10000000', label: '€2M – €10M' },
  { value: '10000000-', label: 'Mais de €10M' },
]

const SORT_OPTIONS = [
  { value: 'relevance', label: '🎯 Relevância IA' },
  { value: 'deadline', label: '📅 Prazo (mais próximo)' },
  { value: 'amount_desc', label: '💶 Valor (maior primeiro)' },
  { value: 'amount_asc', label: '💶 Valor (menor primeiro)' },
  { value: 'funding_rate', label: '📊 Taxa de financiamento' },
  { value: 'title', label: '🔤 Nome (A-Z)' },
]

const ENTITY_TYPES = [
  { value: '', label: 'Todos os tipos de entidade' },
  { value: 'startup', label: '🚀 Startup' },
  { value: 'pme', label: '🏢 PME' },
  { value: 'grande empresa', label: '🏭 Grande Empresa' },
  { value: 'universidade', label: '🎓 Universidade / Centro I&D' },
  { value: 'municipio', label: '🏛️ Município / Entidade Pública' },
  { value: 'ong', label: '🤝 ONG / IPSS' },
  { value: 'agricultor', label: '🌾 Agricultor / Agro' },
  { value: 'investigador individual', label: '🔬 Investigador Individual' },
]

const COUNTRIES = [
  { value: '', label: 'Qualquer país' },
  { value: 'PT', label: '🇵🇹 Portugal' },
  { value: 'EU', label: '🇪🇺 União Europeia' },
  { value: 'ES', label: '🇪🇸 Espanha' },
  { value: 'FR', label: '🇫🇷 França' },
]

const TRL_LEVELS = [
  { value: '', label: 'Qualquer TRL' },
  { value: '1', label: 'TRL 1 — Princípios básicos' },
  { value: '2', label: 'TRL 2 — Conceito tecnológico' },
  { value: '3', label: 'TRL 3 — Prova de conceito' },
  { value: '4', label: 'TRL 4 — Validação lab' },
  { value: '5', label: 'TRL 5 — Validação ambiente relevante' },
  { value: '6', label: 'TRL 6 — Demonstração' },
  { value: '7', label: 'TRL 7 — Demonstração sistema' },
  { value: '8', label: 'TRL 8 — Sistema completo' },
  { value: '9', label: 'TRL 9 — Produto final' },
]

const MIN_FUNDING_RATES = [
  { value: '', label: 'Qualquer taxa' },
  { value: '40', label: '≥ 40%' },
  { value: '50', label: '≥ 50%' },
  { value: '70', label: '≥ 70%' },
  { value: '80', label: '≥ 80%' },
  { value: '100', label: '100% (totalmente financiado)' },
]

const PAGE_SIZE = 48

export default function GrantSearch() {
  const [grants, setGrants] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [matchLoading, setMatchLoading] = useState(false)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [fixUrlsLoading, setFixUrlsLoading] = useState(false)
  const [crawlLoading, setCrawlLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [showAdminTools, setShowAdminTools] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [size, setSize] = useState('')
  const [fundingType, setFundingType] = useState('')
  const [category, setCategory] = useState('')
  const [region, setRegion] = useState('')
  const [amountRange, setAmountRange] = useState('')
  const [sort, setSort] = useState('relevance')
  const [trl, setTrl] = useState('')
  const [entityType, setEntityType] = useState('')
  const [country, setCountry] = useState('')
  const [minFundingRate, setMinFundingRate] = useState('')
  const [openOnly, setOpenOnly] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const buildQuery = (extra = {}) => {
    const params = new URLSearchParams()
    const s = extra.search ?? search
    const sz = extra.size ?? size
    const ft = extra.fundingType ?? fundingType
    const cat = extra.category ?? category
    const reg = extra.region ?? region
    const ar = extra.amountRange ?? amountRange
    const so = extra.sort ?? sort
    const t = extra.trl ?? trl
    const et = extra.entityType ?? entityType
    const co = extra.country ?? country
    const mfr = extra.minFundingRate ?? minFundingRate
    const oo = extra.openOnly ?? openOnly
    const pg = extra.page ?? page
    if (s) params.set('search', s)
    if (sz) params.set('size', sz)
    if (ft) params.set('funding_type', ft)
    if (cat) params.set('category', cat)
    if (reg) params.set('region', reg)
    if (so) params.set('sort', so)
    if (t) params.set('trl', t)
    if (et) params.set('entity_type', et)
    if (co) params.set('country', co)
    if (mfr) params.set('min_funding_rate', mfr)
    if (oo) params.set('open_only', 'true')
    if (ar) {
      const [min, max] = ar.split('-')
      if (min) params.set('min_amount', min)
      if (max) params.set('max_amount', max)
    }
    params.set('limit', PAGE_SIZE)
    params.set('offset', (pg - 1) * PAGE_SIZE)
    return params.toString()
  }

  const scrollRestored = useRef(false)

  const load = (extra = {}) => {
    setLoading(true)
    fetch('/api/grants?' + buildQuery(extra))
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setGrants(d)
          setTotalCount(d.length < PAGE_SIZE ? ((extra.page ?? page) - 1) * PAGE_SIZE + d.length : -1)
        } else {
          setGrants(d.grants || [])
          setTotalCount(d.total ?? 0)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load({ page: 1 }); setPage(1) }, [])

  useEffect(() => {
    if (!loading && !scrollRestored.current) {
      const saved = sessionStorage.getItem('grantSearchScroll')
      if (saved) {
        sessionStorage.removeItem('grantSearchScroll')
        scrollRestored.current = true
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved)))
      }
    }
  }, [loading])

  const applyFilters = () => { setPage(1); load({ page: 1 }) }

  const resetFilters = () => {
    setSearch(''); setSize(''); setFundingType(''); setCategory('')
    setRegion(''); setAmountRange(''); setSort('relevance')
    setTrl(''); setEntityType(''); setCountry(''); setMinFundingRate(''); setOpenOnly(false)
    setPage(1)
    load({ search: '', size: '', fundingType: '', category: '', region: '', amountRange: '', sort: 'relevance', trl: '', entityType: '', country: '', minFundingRate: '', openOnly: false, page: 1 })
  }

  const showMsg = (text, isErr = false) => {
    setMsg(isErr ? '❌ ' + text : '✅ ' + text)
    setTimeout(() => setMsg(''), 8000)
  }

  const runMatch = async () => {
    setMatchLoading(true); setMsg('')
    try {
      const r = await fetch('/api/ai/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const d = await r.json()
      if (d.error) { showMsg(d.error, true); return }
      showMsg(`Relevância calculada para ${d.scored} fundos`)
      load()
    } catch { showMsg('Erro ao contactar a IA', true) }
    finally { setMatchLoading(false) }
  }

  const runAiSearch = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true); setMsg('')
    try {
      const r = await fetch('/api/ai/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: aiQuery }) })
      const d = await r.json()
      if (d.error) { showMsg(d.error, true); return }
      showMsg(`Adicionados ${d.added} novos fundos`)
      setAiQuery(''); load()
    } catch { showMsg('Erro ao contactar a IA', true) }
    finally { setAiLoading(false) }
  }

  const runCrawler = async () => {
    setCrawlLoading(true); setMsg('⏳ A executar crawler completo (EU Portal + IA + Sites Oficiais)...')
    try {
      const r = await fetch('/api/crawler/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const d = await r.json()
      if (d.error) { showMsg(d.error, true); return }
      showMsg(`Crawler concluído: +${d.added} novos fundos (EU: ${d.eu}, IA: ${d.ai}, Scraping: ${d.scraped})`)
      load()
    } catch { showMsg('Erro no crawler', true) }
    finally { setCrawlLoading(false) }
  }

  const runFixUrls = async () => {
    setFixUrlsLoading(true); setMsg('⏳ A corrigir URLs — pode demorar 2-3 min...')
    try {
      const r = await fetch('/api/ai/fix-urls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const d = await r.json()
      if (d.error) { showMsg(d.error, true); return }
      showMsg(`${d.message} (de ${d.checked} fundos verificados)`)
      load()
    } catch { showMsg('Erro ao corrigir URLs', true) }
    finally { setFixUrlsLoading(false) }
  }

  const runScrape = async () => {
    setScrapeLoading(true); setMsg('')
    try {
      const r = await fetch('/api/ai/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const d = await r.json()
      if (d.error) { showMsg(d.error, true); return }
      showMsg(d.message); load()
    } catch { showMsg('Erro no scraping', true) }
    finally { setScrapeLoading(false) }
  }

  const runEnrich = async () => {
    setEnrichLoading(true); setMsg('')
    try {
      const r = await fetch('/api/ai/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const d = await r.json()
      if (d.error) { showMsg(d.error, true); return }
      showMsg(`Enriquecidos ${d.enriched} fundos com valores e URLs`)
      load()
    } catch { showMsg('Erro ao enriquecer', true) }
    finally { setEnrichLoading(false) }
  }

  const activeFiltersCount = [search, size, fundingType, category, region, amountRange, trl, entityType, country, minFundingRate, openOnly && 'open'].filter(Boolean).length

  return (
    <div className="page">
      <div className="page-header">
        <h1>Fundos Disponíveis</h1>
        <p>Programas de financiamento PT/UE para empresas portuguesas. Usa os filtros ou a IA para encontrar os mais relevantes.</p>
      </div>

      {/* AI Search + Match */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label className="label">Pesquisa com IA</label>
            <input
              placeholder="Ex: fundos para digitalização PME, biotech, exportação..."
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runAiSearch()}
            />
          </div>
          <button className="btn-primary" onClick={runAiSearch} disabled={aiLoading || !aiQuery.trim()}>
            {aiLoading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />A pesquisar...</> : '🔍 Pesquisar com IA'}
          </button>
          <button className="btn-secondary" onClick={runMatch} disabled={matchLoading}>
            {matchLoading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />A calcular...</> : '🎯 Calcular Relevância para Mim'}
          </button>
          <button className="btn-ghost btn-sm" onClick={() => setShowAdminTools(v => !v)} style={{ alignSelf: 'flex-end', padding: '9px 14px' }}>
            🔧 Ferramentas {showAdminTools ? '▲' : '▼'}
          </button>
        </div>

        {/* Admin tools — collapsible */}
        {showAdminTools && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Ferramentas de Dados
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-secondary btn-sm" onClick={runCrawler} disabled={crawlLoading}>
                {crawlLoading ? <><span className="spinner" style={{ width: 12, height: 12, marginRight: 5 }} />A crawlear...</> : '🕷️ Crawler Completo'}
              </button>
              <button className="btn-secondary btn-sm" onClick={runScrape} disabled={scrapeLoading}>
                {scrapeLoading ? <><span className="spinner" style={{ width: 12, height: 12, marginRight: 5 }} />A fazer scraping...</> : '🌐 Scraping Oficial'}
              </button>
              <button className="btn-secondary btn-sm" onClick={runEnrich} disabled={enrichLoading}>
                {enrichLoading ? <><span className="spinner" style={{ width: 12, height: 12, marginRight: 5 }} />A enriquecer...</> : '📊 Enriquecer Dados'}
              </button>
              <button className="btn-secondary btn-sm" onClick={runFixUrls} disabled={fixUrlsLoading}>
                {fixUrlsLoading ? <><span className="spinner" style={{ width: 12, height: 12, marginRight: 5 }} />A corrigir...</> : '🔗 Corrigir URLs'}
              </button>
            </div>
          </div>
        )}

        {msg && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 6, fontSize: 13,
            background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : msg.startsWith('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(79,110,247,0.1)',
            color: msg.startsWith('✅') ? 'var(--success)' : msg.startsWith('❌') ? 'var(--danger)' : 'var(--muted)',
            border: `1px solid ${msg.startsWith('✅') ? 'rgba(34,197,94,0.25)' : msg.startsWith('❌') ? 'rgba(239,68,68,0.25)' : 'rgba(79,110,247,0.2)'}`
          }}>{msg}</div>
        )}
      </div>

      {/* Filters Panel */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFilters ? 16 : 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            🔧 Filtros
            {activeFiltersCount > 0 && (
              <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>
                {activeFiltersCount}
              </span>
            )}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeFiltersCount > 0 && (
              <button className="btn-ghost btn-sm" onClick={resetFilters}>✕ Limpar</button>
            )}
            <button className="btn-ghost btn-sm" onClick={() => setShowFilters(v => !v)}>
              {showFilters ? '▲ Ocultar' : '▼ Mostrar'}
            </button>
          </div>
        </div>

        {showFilters && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Pesquisa livre</label>
                <input placeholder="Nome, fonte, setor..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyFilters()} />
              </div>
              <div>
                <label className="label">Tamanho da empresa</label>
                <select value={size} onChange={e => setSize(e.target.value)}>
                  {SIZES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tipo de apoio</label>
                <select value={fundingType} onChange={e => setFundingType(e.target.value)}>
                  {FUNDING_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Área temática</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Região elegível</label>
                <select value={region} onChange={e => setRegion(e.target.value)}>
                  {REGIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Montante máximo</label>
                <select value={amountRange} onChange={e => setAmountRange(e.target.value)}>
                  {AMOUNT_RANGES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <button className="btn-ghost btn-sm" onClick={() => setShowAdvanced(v => !v)}>
                {showAdvanced ? '▲ Menos filtros' : '▼ Filtros avançados (TRL, Entidade, País, Taxa)'}
              </button>
            </div>

            {showAdvanced && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div>
                  <label className="label">Nível TRL</label>
                  <select value={trl} onChange={e => setTrl(e.target.value)}>
                    {TRL_LEVELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Tipo de entidade</label>
                  <select value={entityType} onChange={e => setEntityType(e.target.value)}>
                    {ENTITY_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">País elegível</label>
                  <select value={country} onChange={e => setCountry(e.target.value)}>
                    {COUNTRIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Taxa mín. de financiamento</label>
                  <select value={minFundingRate} onChange={e => setMinFundingRate(e.target.value)}>
                    {MIN_FUNDING_RATES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                  <input type="checkbox" id="openOnly" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <label htmlFor="openOnly" style={{ fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                    🟢 Apenas calls abertas
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label className="label">Ordenar por</label>
                <select value={sort} onChange={e => setSort(e.target.value)} style={{ minWidth: 200 }}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button className="btn-primary" onClick={applyFilters}>Aplicar filtros</button>
            </div>
          </>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="loading-center">
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <span>A carregar fundos...</span>
        </div>
      ) : grants.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <h3>Sem resultados</h3>
          <p style={{ marginBottom: 16 }}>Tenta ajustar os filtros ou usa a pesquisa com IA para encontrar mais fundos.</p>
          <button className="btn-secondary" onClick={resetFilters}>Limpar todos os filtros</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              {totalCount > 0
                ? <><strong style={{ color: 'var(--text)' }}>{totalCount}</strong> fundo{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}</>
                : <><strong style={{ color: 'var(--text)' }}>{grants.length}</strong> fundo{grants.length !== 1 ? 's' : ''} nesta página</>
              }
              {activeFiltersCount > 0 && <span> com {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}</span>}
              {totalCount > 0 && <span style={{ marginLeft: 8 }}>— página {page} de {Math.ceil(totalCount / PAGE_SIZE)}</span>}
            </p>
            {grants.filter(g => g.call_status === 'open').length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--success)' }}>
                <span className="status-dot status-dot-open" />
                {grants.filter(g => g.call_status === 'open').length} abertos
              </span>
            )}
          </div>
          <div className="grid-2">
            {grants.map(g => <GrantCard key={g.id} grant={g} />)}
          </div>
          {/* Pagination */}
          {(grants.length === PAGE_SIZE || page > 1) && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button
                className="btn-secondary btn-sm"
                onClick={() => { const p = page - 1; setPage(p); load({ page: p }); window.scrollTo(0, 0) }}
                disabled={page === 1}
              >← Anterior</button>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                Página <strong style={{ color: 'var(--text)' }}>{page}</strong>
                {totalCount > 0 && <> de <strong style={{ color: 'var(--text)' }}>{Math.ceil(totalCount / PAGE_SIZE)}</strong></>}
              </span>
              <button
                className="btn-secondary btn-sm"
                onClick={() => { const p = page + 1; setPage(p); load({ page: p }); window.scrollTo(0, 0) }}
                disabled={grants.length < PAGE_SIZE}
              >Seguinte →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
