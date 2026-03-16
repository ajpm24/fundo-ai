import React, { useEffect, useState } from 'react'
import GrantCard from '../components/GrantCard'

export default function GrantSearch() {
  const [grants, setGrants] = useState([])
  const [search, setSearch] = useState('')
  const [aiQuery, setAiQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [matchLoading, setMatchLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/grants')
      .then(r => r.json())
      .then(d => { setGrants(d); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const filtered = grants.filter(g =>
    !search || g.title?.toLowerCase().includes(search.toLowerCase()) ||
    g.source?.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase())
  )

  const runMatch = async () => {
    setMatchLoading(true); setMsg('')
    try {
      const r = await fetch('/api/ai/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const d = await r.json()
      if (d.error) { setMsg('❌ ' + d.error); return }
      setMsg(`✅ Relevância calculada para ${d.scored} fundos`)
      load()
    } catch { setMsg('❌ Erro ao contactar a IA') }
    finally { setMatchLoading(false) }
  }

  const runAiSearch = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true); setMsg('')
    try {
      const r = await fetch('/api/ai/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: aiQuery }) })
      const d = await r.json()
      if (d.error) { setMsg('❌ ' + d.error); return }
      setMsg(`✅ Adicionados ${d.added} novos fundos`)
      setAiQuery('')
      load()
    } catch { setMsg('❌ Erro ao contactar a IA') }
    finally { setAiLoading(false) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Fundos Disponíveis</h1>
        <p>Explora e filtra oportunidades de financiamento para a tua empresa.</p>
      </div>

      {/* AI Actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label className="label">Pesquisa com IA</label>
            <input
              placeholder="Ex: fundos para digitalização PME, biotech, exportação..."
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runAiSearch()}
            />
          </div>
          <button className="btn-primary" onClick={runAiSearch} disabled={aiLoading || !aiQuery}>
            {aiLoading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />A pesquisar...</> : '🔍 Pesquisar com IA'}
          </button>
          <button className="btn-secondary" onClick={runMatch} disabled={matchLoading}>
            {matchLoading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />A calcular...</> : '🎯 Calcular Relevância'}
          </button>
        </div>
        {msg && <p style={{ marginTop: 10, fontSize: 13, color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{msg}</p>}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 20 }}>
        <input placeholder="🔍 Filtrar por nome, fonte ou setor..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>A carregar fundos...</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><h3>Sem resultados</h3><p>Tenta outra pesquisa ou usa a pesquisa com IA para encontrar mais fundos.</p></div>
      ) : (
        <>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>{filtered.length} fundo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid-2">
            {filtered.map(g => <GrantCard key={g.id} grant={g} />)}
          </div>
        </>
      )}
    </div>
  )
}
