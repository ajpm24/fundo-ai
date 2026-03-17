import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const fmt = (n) => n != null && n > 0 ? `€${Number(n).toLocaleString('pt-PT')}` : null

const STEP_LABELS = ['Website', 'Projeto', 'Resultados']

function StepIndicator({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
      {STEP_LABELS.map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, fontWeight: 700,
              background: i < step ? 'var(--success)' : i === step ? 'var(--accent)' : 'var(--bg3)',
              color: i <= step ? '#fff' : 'var(--muted)',
              transition: 'all 0.3s'
            }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 11, color: i === step ? 'var(--text)' : 'var(--muted)', fontWeight: i === step ? 600 : 400 }}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div style={{
              width: 80, height: 2, background: i < step ? 'var(--success)' : 'var(--border)',
              margin: '0 8px', marginBottom: 22, transition: 'all 0.3s'
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function QuickMatch() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  // Step 0
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [nif, setNif] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [analyzeErrorCode, setAnalyzeErrorCode] = useState('')

  // Step 1
  const [analysis, setAnalysis] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [customProject, setCustomProject] = useState('')
  const [matching, setMatching] = useState(false)

  // Step 2
  const [results, setResults] = useState(null)
  const [applying, setApplying] = useState(null)

  const startApplication = async (grantId) => {
    setApplying(grantId)
    try {
      const r = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_id: Number(grantId) })
      })
      const d = await r.json()
      if (d.existing_id) { navigate(`/applications/${d.existing_id}`); return }
      if (d.id) { navigate(`/applications/${d.id}`); return }
    } catch {}
    finally { setApplying(null) }
  }

  const formatNif = (v) => v.replace(/\D/g, '').slice(0, 9)

  const analyzeWebsite = async () => {
    if (!websiteUrl.trim() && !nif.trim()) return
    setAnalyzing(true); setAnalyzeError(''); setAnalyzeErrorCode('')
    try {
      const r = await fetch('/api/ai/quickmatch/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_url: websiteUrl.trim() || undefined,
          nif: nif.trim() || undefined
        })
      })
      const d = await r.json()
      if (d.error) { setAnalyzeError(d.error); setAnalyzeErrorCode(d.code || ''); return }
      setAnalysis(d)
      setSelectedProject(0)
      setStep(1)
    } catch { setAnalyzeError('Erro de ligação ao servidor'); setAnalyzeErrorCode('') }
    finally { setAnalyzing(false) }
  }

  const runMatch = async () => {
    const project = selectedProject === 'custom'
      ? { title: 'Projeto personalizado', description: customProject, category: 'inovacao' }
      : analysis.projects[selectedProject]

    if (!project?.description && !customProject) return
    setMatching(true)
    try {
      const r = await fetch('/api/ai/quickmatch/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_title: project.title,
          project_description: selectedProject === 'custom' ? customProject : project.description,
          project_category: project.category,
          company_summary: analysis?.company_summary,
          company_sector: analysis?.sector,
          company_cae: analysis?.cae_code,
          company_size: analysis?.size_estimate,
          company_location: analysis?.location
        })
      })
      const d = await r.json()
      if (d.error) { setAnalyzeError(d.error); return }
      setResults(d)
      setStep(2)
    } catch { setAnalyzeError('Erro ao calcular matches') }
    finally { setMatching(false) }
  }

  const selectedProjectObj = selectedProject === 'custom'
    ? { title: 'Projeto personalizado', description: customProject, icon: '✏️' }
    : (analysis?.projects?.[selectedProject] || null)

  return (
    <div className="page" style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Quick Match</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          Descobre os fundos mais relevantes para a tua empresa em segundos
        </p>
      </div>

      <StepIndicator step={step} />

      {/* Step 0: Website URL + optional NIF */}
      {step === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Identifica a tua empresa</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 14 }}>
            A IA analisa o teu website e modelo de negócio para encontrar os fundos mais adequados.
          </p>

          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'left' }}>
            {/* Website URL */}
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
              Website da empresa
            </label>
            <input
              placeholder="Ex: empresa.pt ou https://empresa.pt"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzeWebsite()}
              style={{ width: '100%', fontSize: 15, boxSizing: 'border-box' }}
              autoFocus
            />

            {/* NIF — optional */}
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                NIF da empresa <span style={{ fontWeight: 400, color: 'var(--muted)', opacity: 0.7 }}>(opcional — permite pesquisa nos registos oficiais)</span>
              </label>
              <input
                placeholder="Ex: 509405990"
                value={nif}
                onChange={e => setNif(formatNif(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && analyzeWebsite()}
                style={{ width: '100%', fontSize: 15, boxSizing: 'border-box', letterSpacing: 2 }}
                maxLength={9}
                inputMode="numeric"
              />
              {nif.length > 0 && nif.length < 9 && (
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  {9 - nif.length} dígito(s) em falta
                </p>
              )}
            </div>

            {/* Info box */}
            <div style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'left' }}>
              🔍 Com o NIF a IA consulta o registo comercial português e obtém o CAE real, dimensão e dados oficiais da empresa — resultados muito mais precisos.
            </div>

            <button
              className="btn-primary"
              onClick={analyzeWebsite}
              disabled={analyzing || (!websiteUrl.trim() && !nif.trim())}
              style={{ width: '100%', marginTop: 20, padding: '14px', fontSize: 15 }}
            >
              {analyzing
                ? <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />A analisar empresa...</>
                : '⚡ Analisar e encontrar fundos →'}
            </button>
          </div>

          {analyzeError && (
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 8,
              background: analyzeErrorCode === 'NO_CREDITS' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${analyzeErrorCode === 'NO_CREDITS' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
              fontSize: 13, lineHeight: 1.6,
            }}>
              <strong style={{ color: analyzeErrorCode === 'NO_CREDITS' ? 'var(--warning)' : 'var(--danger)' }}>
                {analyzeErrorCode === 'NO_CREDITS' ? '⚠️ Sem créditos na API' : '❌ Erro'}
              </strong>
              <br />{analyzeError}
              {analyzeErrorCode === 'NO_CREDITS' && (
                <><br /><a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer"
                  style={{ color: 'var(--warning)', textDecoration: 'underline', fontWeight: 600 }}>
                  → Adicionar créditos em console.anthropic.com
                </a></>
              )}
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 16 }}>
            Gratuito · Resultados em segundos · Sem registo necessário
          </p>
        </div>
      )}

      {/* Step 1: Pick project */}
      {step === 1 && analysis && (
        <div>
          {/* Company detected */}
          <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏢</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{analysis.company_name || websiteUrl}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{analysis.company_summary}</div>
                {/* CAE / metadata chips */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {analysis.cae_code && (
                    <span style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                      CAE {analysis.cae_code}{analysis.cae_description ? ` — ${analysis.cae_description}` : ''}
                    </span>
                  )}
                  {analysis.size_estimate && (
                    <span style={{ background: 'var(--bg3)', borderRadius: 5, padding: '2px 8px', fontSize: 11, color: 'var(--muted)' }}>
                      {analysis.size_estimate === 'micro' ? '🏠 Microempresa' : analysis.size_estimate === 'pequena' ? '🏢 PME Pequena' : analysis.size_estimate === 'média' ? '🏬 PME Média' : '🏭 Grande empresa'}
                    </span>
                  )}
                  {analysis.location && (
                    <span style={{ background: 'var(--bg3)', borderRadius: 5, padding: '2px 8px', fontSize: 11, color: 'var(--muted)' }}>
                      📍 {analysis.location}
                    </span>
                  )}
                  {analysis.nif_confirmed && (
                    <span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 5, padding: '2px 8px', fontSize: 11, color: 'var(--success)' }}>
                      ✓ NIF {analysis.nif_confirmed}
                    </span>
                  )}
                </div>
              </div>
              <button className="btn-ghost" onClick={() => setStep(0)} style={{ marginLeft: 'auto', fontSize: 12, flexShrink: 0 }}>
                ← Alterar
              </button>
            </div>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>
            Qual projeto melhor descreve o que pretendes financiar?
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            Seleciona um ou adiciona o teu próprio abaixo
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16, marginBottom: 16 }}>
            {analysis.projects?.map((p, i) => (
              <div
                key={i}
                onClick={() => setSelectedProject(i)}
                style={{
                  background: selectedProject === i ? 'rgba(79,110,247,0.12)' : 'var(--bg2)',
                  border: `2px solid ${selectedProject === i ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '20px 18px', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 10 }}>{p.icon || '🚀'}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{p.description}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.category || 'inovacao'}</span>
                  {p.eligible_funds?.slice(0, 2).map(f => (
                    <span key={f} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 4, padding: '1px 6px', fontSize: 10, color: 'var(--success)' }}>{f}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom project */}
            <div
              onClick={() => setSelectedProject('custom')}
              style={{
                background: selectedProject === 'custom' ? 'rgba(79,110,247,0.12)' : 'var(--bg2)',
                border: `2px solid ${selectedProject === 'custom' ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 12, padding: '20px 18px', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>✏️</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Descreve o teu projeto</div>
              {selectedProject === 'custom' ? (
                <textarea
                  placeholder="Descreve em 2-3 frases o projeto que pretendes financiar..."
                  value={customProject}
                  onChange={e => { e.stopPropagation(); setCustomProject(e.target.value) }}
                  onClick={e => e.stopPropagation()}
                  rows={3}
                  style={{ fontSize: 12, marginTop: 4 }}
                  autoFocus
                />
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Adiciona uma descrição personalizada do teu projeto
                </div>
              )}
            </div>
          </div>

          {analyzeError && (
            <div style={{
              marginBottom: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: analyzeErrorCode === 'NO_CREDITS' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${analyzeErrorCode === 'NO_CREDITS' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: analyzeErrorCode === 'NO_CREDITS' ? 'var(--warning)' : 'var(--danger)'
            }}>
              {analyzeErrorCode === 'NO_CREDITS' ? '⚠️' : '❌'} {analyzeError}
              {analyzeErrorCode === 'NO_CREDITS' && (
                <> · <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer"
                  style={{ color: 'var(--warning)', textDecoration: 'underline' }}>Adicionar créditos</a></>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              className="btn-primary btn-lg"
              onClick={runMatch}
              disabled={matching || selectedProject === null || (selectedProject === 'custom' && !customProject.trim())}
            >
              {matching
                ? <><span className="spinner" style={{ width: 18, height: 18, marginRight: 10 }} />A calcular matches...</>
                : '⚡ Encontrar Fundos →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Results */}
      {step === 2 && results && (
        <div>
          {/* Summary */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
              Os teus resultados Quick Match 🎯
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              Encontrámos <strong style={{ color: 'var(--text)' }}>{results.total_analyzed}</strong> oportunidades · A mostrar os <strong style={{ color: 'var(--text)' }}>top {results.matches.length} matches</strong> para o teu projeto
            </p>
            {selectedProjectObj && (
              <div style={{ display: 'inline-block', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', marginTop: 10, fontSize: 13 }}>
                <strong>{selectedProjectObj.icon} {selectedProjectObj.title}</strong>
                {analysis?.company_name && <span style={{ color: 'var(--muted)', marginLeft: 8 }}>· {analysis.company_name}</span>}
              </div>
            )}
          </div>

          {/* Grant cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {results.matches.map((g, i) => {
              const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null
              return (
                <div
                  key={g.id}
                  className="card"
                  style={{ padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onClick={() => navigate(`/grants/${g.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    {/* Match score */}
                    <div style={{
                      minWidth: 56, height: 56, borderRadius: 12,
                      background: g.score >= 75 ? 'rgba(34,197,94,0.15)' : g.score >= 55 ? 'rgba(79,110,247,0.15)' : 'rgba(100,116,139,0.15)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <div style={{
                        fontSize: 17, fontWeight: 800,
                        color: g.score >= 75 ? 'var(--success)' : g.score >= 55 ? 'var(--accent)' : 'var(--muted)'
                      }}>{g.score}%</div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600 }}>MATCH</div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <span className="badge badge-blue" style={{ fontSize: 11 }}>{g.source}</span>
                        {g.call_status === 'open' && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>🟢 Aberta</span>}
                        {g.funding_type === 'fundo_perdido' && <span style={{ fontSize: 11, color: 'var(--muted)' }}>🎁 Fundo perdido</span>}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{g.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 6 }}>
                        {g.reason}
                      </div>
                    </div>

                    {/* Numbers + Apply */}
                    <div style={{ textAlign: 'right', minWidth: 110 }}>
                      {fmt(g.max_amount) && (
                        <div style={{
                          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
                          borderRadius: 6, padding: '4px 10px', fontSize: 13, fontWeight: 700,
                          color: 'var(--success)', marginBottom: 6, whiteSpace: 'nowrap'
                        }}>
                          {fmt(g.max_amount)}
                        </div>
                      )}
                      {(g.funding_rate || g.cofinancing_rate) && (
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          Até {g.funding_rate || g.cofinancing_rate}% financiado
                        </div>
                      )}
                      {daysLeft !== null && (
                        <div style={{ fontSize: 11, color: daysLeft <= 30 ? 'var(--warning)' : 'var(--muted)', marginTop: 4 }}>
                          📅 {daysLeft > 0 ? `${daysLeft}d restantes` : 'Expirado'}
                        </div>
                      )}
                      <button
                        className="btn-primary btn-sm"
                        style={{ marginTop: 8, fontSize: 11, whiteSpace: 'nowrap' }}
                        disabled={applying === g.id}
                        onClick={e => { e.stopPropagation(); startApplication(g.id) }}
                      >
                        {applying === g.id ? '...' : '📝 Candidatar'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div className="card" style={{ textAlign: 'center', padding: '28px', background: 'rgba(79,110,247,0.06)', border: '1px solid rgba(79,110,247,0.2)' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🚀</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Quer candidatar-se a algum destes fundos?</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
              Completa o teu perfil de empresa para obter recomendações ainda mais precisas e iniciar candidaturas com apoio da IA.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => navigate('/profile')}>
                ⚙️ Completar Perfil
              </button>
              <button className="btn-secondary" onClick={() => navigate('/grants')}>
                🔍 Ver Todos os Fundos
              </button>
              <button className="btn-ghost" onClick={() => { setStep(0); setResults(null); setAnalysis(null); setWebsiteUrl('') }}>
                ⚡ Novo Quick Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
