import React, { useEffect, useState } from 'react'

const SECTORS = ['Tecnologia', 'Digital', 'Saúde', 'Biotecnologia', 'Indústria', 'Agro-alimentar', 'Energia', 'Ambiente', 'Educação', 'Serviços', 'Turismo', 'Comércio', 'Construção', 'Logística', 'Outro']
const SIZES = ['Startup (< 2 anos)', 'Micro (< 10 trabalhadores)', 'Pequena (< 50 trabalhadores)', 'Média (< 250 trabalhadores)', 'Grande (≥ 250 trabalhadores)']
const STAGES = ['Ideia / Pré-seed', 'Validação / Seed', 'Crescimento / Series A', 'Expansão / Series B+', 'Matura / Estabelecida']

export default function Profile() {
  const [form, setForm] = useState({
    name: '', sector: '', size: '', location: '', description: '',
    website: '', nif: '', stage: '', founded_year: '', employees: '', annual_revenue: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { if (d) setForm(f => ({ ...f, ...d })); setLoading(false) })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      const r = await fetch('/api/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const d = await r.json()
      if (d.ok) setMsg('✅ Perfil guardado com sucesso!')
      else setMsg('❌ Erro ao guardar')
    } catch { setMsg('❌ Erro de ligação') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><span>A carregar...</span></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Perfil da Empresa</h1>
        <p>Quanto mais completo for o perfil, mais precisas serão as recomendações da IA.</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Informação Básica</h2>

        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div>
            <label className="label">Nome da Empresa</label>
            <input placeholder="Ex: Acme Tecnologia, Lda." value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">NIF</label>
            <input placeholder="123 456 789" value={form.nif} onChange={e => set('nif', e.target.value)} />
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div>
            <label className="label">Setor de Atividade</label>
            <select value={form.sector} onChange={e => set('sector', e.target.value)}>
              <option value="">Seleciona o setor...</option>
              {SECTORS.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Dimensão</label>
            <select value={form.size} onChange={e => set('size', e.target.value)}>
              <option value="">Seleciona a dimensão...</option>
              {SIZES.map(s => <option key={s} value={s.split(' ')[0].toLowerCase()}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div>
            <label className="label">Localização</label>
            <input placeholder="Ex: Lisboa, Porto, Braga..." value={form.location} onChange={e => set('location', e.target.value)} />
          </div>
          <div>
            <label className="label">Website</label>
            <input placeholder="https://..." value={form.website} onChange={e => set('website', e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="label">Descrição da Empresa e Projeto</label>
          <textarea
            placeholder="Descreve a empresa, o que faz, os seus produtos/serviços, tecnologias utilizadas, missão e objetivos. Quanto mais detalhe, melhores serão as recomendações de fundos."
            value={form.description} onChange={e => set('description', e.target.value)}
            rows={6}
          />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{form.description?.length || 0} caracteres — recomendado: mínimo 200</div>
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, marginTop: 8 }}>Detalhes Adicionais</h2>

        <div className="grid-3" style={{ marginBottom: 16 }}>
          <div>
            <label className="label">Fase da Empresa</label>
            <select value={form.stage} onChange={e => set('stage', e.target.value)}>
              <option value="">Seleciona a fase...</option>
              {STAGES.map(s => <option key={s} value={s.split(' /')[0].toLowerCase()}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ano de Fundação</label>
            <input type="number" placeholder="2020" min="1900" max="2025" value={form.founded_year} onChange={e => set('founded_year', e.target.value)} />
          </div>
          <div>
            <label className="label">Nº de Colaboradores</label>
            <input type="number" placeholder="5" min="0" value={form.employees} onChange={e => set('employees', e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="label">Volume de Negócios Anual (€)</label>
          <input type="number" placeholder="250000" min="0" value={form.annual_revenue} onChange={e => set('annual_revenue', e.target.value)} style={{ maxWidth: 300 }} />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn-primary btn-lg" onClick={save} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />A guardar...</> : '💾 Guardar Perfil'}
          </button>
          {msg && <span style={{ fontSize: 13, color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{msg}</span>}
        </div>
      </div>
    </div>
  )
}
