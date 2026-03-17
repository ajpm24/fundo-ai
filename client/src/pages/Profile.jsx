import React, { useEffect, useState } from 'react'

const SECTORS = ['Tecnologia', 'Digital', 'Saúde', 'Biotecnologia', 'Indústria', 'Agro-alimentar', 'Energia', 'Ambiente', 'Educação', 'Serviços', 'Turismo', 'Comércio', 'Construção', 'Logística', 'Outro']
const STANDARD_SECTOR_VALUES = SECTORS.map(s => s.toLowerCase())
const SIZES = ['Startup (< 2 anos)', 'Micro (< 10 trabalhadores)', 'Pequena (< 50 trabalhadores)', 'Média (< 250 trabalhadores)', 'Grande (≥ 250 trabalhadores)']
const STAGES = ['Ideia / Pré-seed', 'Validação / Seed', 'Crescimento / Series A', 'Expansão / Series B+', 'Matura / Estabelecida']

function calcCompletion(form) {
  const fields = [
    { key: 'name', weight: 15 },
    { key: 'sector', weight: 15 },
    { key: 'size', weight: 10 },
    { key: 'location', weight: 10 },
    { key: 'description', weight: 20, minLen: 100 },
    { key: 'website', weight: 5 },
    { key: 'nif', weight: 5 },
    { key: 'stage', weight: 5 },
    { key: 'founded_year', weight: 5 },
    { key: 'employees', weight: 5 },
    { key: 'annual_revenue', weight: 5 },
  ]
  let total = 0
  for (const f of fields) {
    const val = form[f.key]
    if (!val || val === '') continue
    if (f.minLen && String(val).length < f.minLen) {
      total += Math.round(f.weight * (String(val).length / f.minLen))
    } else {
      total += f.weight
    }
  }
  return Math.min(100, total)
}

function completionColor(pct) {
  if (pct >= 80) return 'var(--success)'
  if (pct >= 50) return 'var(--warning)'
  return 'var(--danger)'
}

function completionLabel(pct) {
  if (pct >= 80) return 'Perfil completo — recomendações precisas'
  if (pct >= 50) return 'Perfil razoável — adiciona mais detalhes'
  if (pct >= 25) return 'Perfil incompleto — a IA precisa de mais informação'
  return 'Perfil em branco — preenche para obter recomendações'
}

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

  const completion = calcCompletion(form)
  const color = completionColor(completion)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Perfil da Empresa</h1>
        <p>Quanto mais completo for o perfil, mais precisas serão as recomendações da IA.</p>
      </div>

      {/* Completion meter */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: `conic-gradient(${color} ${completion * 3.6}deg, var(--bg3) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 4px var(--bg2)`
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', background: 'var(--bg2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13, color
            }}>{completion}%</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color }}>
              {completionLabel(completion)}
            </div>
            <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completion}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>
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
            {(() => {
              const isCustom = form.sector && !STANDARD_SECTOR_VALUES.includes(form.sector)
              const selectVal = isCustom ? 'outro' : (form.sector || '')
              return (
                <>
                  <select value={selectVal} onChange={e => set('sector', e.target.value)}>
                    <option value="">Seleciona o setor...</option>
                    {SECTORS.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                  </select>
                  {(selectVal === 'outro') && (
                    <input
                      style={{ marginTop: 8 }}
                      placeholder="Ex: Robótica, Fintech, Aeroespacial, AgriTech..."
                      value={isCustom ? form.sector : ''}
                      onChange={e => set('sector', e.target.value || 'outro')}
                      autoFocus
                    />
                  )}
                </>
              )
            })()}
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
          <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Descrição da Empresa e Projeto</span>
            <span style={{ fontWeight: 400, color: form.description?.length >= 200 ? 'var(--success)' : form.description?.length >= 100 ? 'var(--warning)' : 'var(--muted)' }}>
              {form.description?.length || 0} / 200 chars mín.
            </span>
          </label>
          <textarea
            placeholder="Descreve a empresa, o que faz, os seus produtos/serviços, tecnologias utilizadas, missão e objetivos. Quanto mais detalhe, melhores serão as recomendações de fundos."
            value={form.description} onChange={e => set('description', e.target.value)}
            rows={6}
          />
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
