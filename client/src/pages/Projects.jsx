import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const fmt = (n) => n != null ? `€${Number(n).toLocaleString('pt-PT')}` : 'N/D'

const ENTITY_TYPES = ['startup', 'pme', 'grande empresa', 'universidade', 'centro de investigação', 'municipio', 'ong / ipss', 'agricultor', 'investigador individual']
const SECTORS = ['tecnologia', 'digital', 'saúde / medtech', 'biotech', 'indústria', 'agro-alimentar', 'energia', 'ambiente', 'turismo', 'cultura', 'social', 'educação', 'maritimo', 'espaço']

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [matchLoading, setMatchLoading] = useState(null)
  const [matchResults, setMatchResults] = useState({})
  const [estimates, setEstimates] = useState({})
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    name: '', description: '', sector: '', location: '',
    budget: '', trl: '', entity_type: '', countries: [], consortium: false
  })

  const load = () => {
    setLoading(true)
    fetch('/api/projects').then(r => r.json()).then(d => { setProjects(d); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name.trim()) { setMsg('❌ Nome do projeto é obrigatório'); return }
    setSaving(true); setMsg('')
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, budget: form.budget ? Number(form.budget) : null, trl: form.trl ? Number(form.trl) : null })
      })
      const d = await r.json()
      if (d.error) { setMsg('❌ ' + d.error); return }
      setShowForm(false)
      setForm({ name: '', description: '', sector: '', location: '', budget: '', trl: '', entity_type: '', countries: [], consortium: false })
      load()
    } catch { setMsg('❌ Erro ao guardar') }
    finally { setSaving(false) }
  }

  const deleteProject = async (id) => {
    if (!window.confirm('Eliminar este projeto?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    load()
  }

  const runMatch = async (project) => {
    setMatchLoading(project.id)
    try {
      const r = await fetch('/api/ai/match-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id })
      })
      const d = await r.json()
      if (d.error) { setMsg('❌ ' + d.error); return }
      setMatchResults(prev => ({ ...prev, [project.id]: d.scores }))
    } catch { setMsg('❌ Erro de IA') }
    finally { setMatchLoading(null) }
  }

  const loadEstimate = async (project) => {
    if (!project.budget) { setMsg('⚠️ Define um orçamento no projeto para calcular estimativas'); return }
    const r = await fetch(`/api/projects/${project.id}/estimate`)
    const d = await r.json()
    setEstimates(prev => ({ ...prev, [project.id]: d }))
  }

  return (
    <div className="page">
      <div className="page-header flex-between">
        <div>
          <h1>Projetos</h1>
          <p>Define os teus projetos para matching automático com fundos e estimativa de financiamento.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancelar' : '+ Novo Projeto'}
        </button>
      </div>

      {msg && <p style={{ marginBottom: 16, fontSize: 13, color: msg.startsWith('❌') ? 'var(--danger)' : 'var(--warning)' }}>{msg}</p>}

      {/* New project form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Novo Projeto</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="label">Nome do projeto *</label>
              <input placeholder="Ex: Sistema de rastreabilidade alimentar por blockchain" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="label">Descrição</label>
              <textarea rows={3} placeholder="Descreve o projeto, objetivos, inovação e impacto esperado..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label className="label">Setor</label>
              <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                <option value="">Selecionar setor</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tipo de entidade</label>
              <select value={form.entity_type} onChange={e => setForm(f => ({ ...f, entity_type: e.target.value }))}>
                <option value="">Selecionar tipo</option>
                {ENTITY_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Localização</label>
              <input placeholder="Ex: Lisboa, Porto, Alentejo..." value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className="label">Orçamento total (€)</label>
              <input type="number" placeholder="Ex: 500000" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
            </div>
            <div>
              <label className="label">Nível TRL atual (1-9)</label>
              <input type="number" min={1} max={9} placeholder="Ex: 4" value={form.trl} onChange={e => setForm(f => ({ ...f, trl: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
              <input type="checkbox" id="consortium" checked={form.consortium} onChange={e => setForm(f => ({ ...f, consortium: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <label htmlFor="consortium" style={{ fontSize: 13, cursor: 'pointer' }}>Projeto em consórcio</label>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'A guardar...' : '💾 Guardar Projeto'}</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>A carregar...</span></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <h3>Sem projetos</h3>
          <p>Cria o teu primeiro projeto para obter recomendações de fundos personalizadas.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Criar Projeto</button>
        </div>
      ) : (
        projects.map(project => (
          <div key={project.id} className="card" style={{ marginBottom: 20 }}>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>{project.name}</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {project.sector && <span className="badge badge-blue">{project.sector}</span>}
                  {project.entity_type && <span className="badge badge-gray">{project.entity_type}</span>}
                  {project.trl && <span className="badge badge-cyan">TRL {project.trl}</span>}
                  {project.consortium ? <span className="badge badge-cyan">👥 Consórcio</span> : null}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {project.budget && <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>{fmt(project.budget)}</div>}
                {project.location && <div style={{ fontSize: 12, color: 'var(--muted)' }}>📍 {project.location}</div>}
              </div>
            </div>

            {project.description && (
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>{project.description}</p>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <button className="btn-primary" onClick={() => runMatch(project)} disabled={matchLoading === project.id}>
                {matchLoading === project.id ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />A analisar...</> : '🎯 Matching com IA'}
              </button>
              {project.budget && (
                <button className="btn-secondary" onClick={() => loadEstimate(project)}>
                  💶 Estimar Financiamento
                </button>
              )}
              <button className="btn-ghost" style={{ color: 'var(--danger)', marginLeft: 'auto' }} onClick={() => deleteProject(project.id)}>
                🗑️ Eliminar
              </button>
            </div>

            {/* Match results */}
            {matchResults[project.id] && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--muted)' }}>
                  Top fundos recomendados pela IA:
                </div>
                {matchResults[project.id]
                  .filter(s => s.score >= 40)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5)
                  .map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: s.score >= 70 ? 'rgba(34,197,94,0.15)' : s.score >= 50 ? 'rgba(255,193,7,0.15)' : 'rgba(100,116,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: s.score >= 70 ? 'var(--success)' : s.score >= 50 ? 'var(--warning)' : 'var(--muted)', flexShrink: 0 }}>
                        {s.score}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, cursor: 'pointer', color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onClick={() => navigate(`/grants/${s.id}`)}>
                          {s.title || `Fundo #${s.id}`}
                        </div>
                        {s.max_amount && <div style={{ fontSize: 11, color: 'var(--success)', marginBottom: 2 }}>Até €{Number(s.max_amount).toLocaleString('pt-PT')}</div>}
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {s.reason}
                        </div>
                      </div>
                      <button className="btn-ghost" style={{ fontSize: 12, flexShrink: 0 }} onClick={() => navigate(`/grants/${s.id}`)}>
                        Ver fundo →
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Estimates */}
            {estimates[project.id] && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--muted)' }}>
                  Top oportunidades por financiamento estimado:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {estimates[project.id].top_opportunities?.slice(0, 6).map(o => (
                    <div key={o.grant_id} style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', border: '1px solid var(--border)' }}
                      onClick={() => navigate(`/grants/${o.grant_id}`)}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.grant_title}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>{fmt(o.estimated_funding)}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{o.funding_rate}% financiado</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
                  Potencial total identificado: <strong style={{ color: 'var(--success)' }}>{fmt(estimates[project.id].total_potential)}</strong>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
