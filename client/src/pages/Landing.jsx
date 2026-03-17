import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STATS = [
  { value: '1 260+', label: 'Fundos disponíveis' },
  { value: 'PT + UE', label: 'Cobertura geográfica' },
  { value: 'IA', label: 'Matching inteligente' },
  { value: '100%', label: 'Gratuito' },
]

const FEATURES = [
  {
    icon: '⚡',
    title: 'QuickMatch em segundos',
    desc: 'Introduz o website ou NIF da tua empresa e a IA identifica os fundos mais relevantes em menos de 30 segundos.',
  },
  {
    icon: '🎯',
    title: 'Matching por IA',
    desc: 'O Claude AI analisa o teu perfil de empresa e pontua cada fundo de 0 a 100 com justificação detalhada.',
  },
  {
    icon: '📋',
    title: 'Candidaturas guiadas',
    desc: 'Gera rascunhos de candidatura, listas de documentos necessários e perguntas chave para cada fundo.',
  },
  {
    icon: '🔔',
    title: 'Alertas de prazo',
    desc: 'Nunca percas um prazo. Recebe alertas automáticos quando os teus fundos favoritos estão a fechar.',
  },
  {
    icon: '🔍',
    title: 'Pesquisa avançada',
    desc: 'Filtra por região, tipo de financiamento, setor, montante e muito mais. 1 260+ fundos indexados.',
  },
  {
    icon: '📊',
    title: 'Gestão de projetos',
    desc: 'Organiza as tuas candidaturas por projeto e acompanha o estado de cada uma num dashboard centralizado.',
  },
]

const SOURCES = [
  'PT2030', 'COMPETE 2030', 'Horizonte Europa', 'ANI', 'IAPMEI',
  'BEI', 'COSME', 'Erasmus+', 'InvestEU', 'PRR', 'POSEUR', 'MAR2030',
]

export default function Landing() {
  const navigate = useNavigate()
  const heroRef = useRef(null)
  const [visible, setVisible] = useState({})

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.id]: true }))
      }),
      { threshold: 0.15 }
    )
    document.querySelectorAll('[data-id]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const fadeIn = (id, delay = 0) => ({
    opacity: visible[id] ? 1 : 0,
    transform: visible[id] ? 'translateY(0)' : 'translateY(28px)',
    transition: `opacity 0.6s ${delay}s ease, transform 0.6s ${delay}s ease`,
  })

  return (
    <div style={{ background: '#0f1117', color: '#e8eaf0', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(15,17,23,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(46,51,71,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>💡</div>
          FundoAI
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(79,110,247,0.4)',
              background: 'transparent', color: '#4f6ef7', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}>
            Entrar
          </button>
          <button
            onClick={() => navigate('/quickmatch')}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)', color: '#fff',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}>
            Começar grátis →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '120px 24px 80px', position: 'relative',
      }}>
        {/* glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(79,110,247,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500,
          background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.3)',
          color: '#7b95fa', marginBottom: 28, position: 'relative',
        }}>
          ✨ Powered by Claude AI · 1 260+ fundos indexados
        </div>

        <h1 style={{
          fontSize: 'clamp(36px,6vw,72px)', fontWeight: 800, lineHeight: 1.12,
          letterSpacing: '-2px', maxWidth: 820, marginBottom: 24, position: 'relative',
        }}>
          Encontra financiamento{' '}
          <span style={{ background: 'linear-gradient(90deg,#4f6ef7,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            feito à medida
          </span>{' '}
          da tua empresa
        </h1>

        <p style={{
          fontSize: 'clamp(16px,2vw,20px)', color: '#8b90a4', maxWidth: 560,
          lineHeight: 1.7, marginBottom: 40, position: 'relative',
        }}>
          O FundoAI usa inteligência artificial para cruzar o perfil da tua empresa com mais de 1 260 fundos nacionais e europeus — e encontrar os que realmente se aplicam ao teu caso.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}>
          <button
            onClick={() => navigate('/quickmatch')}
            style={{
              padding: '14px 32px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)', color: '#fff',
              cursor: 'pointer', fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px',
              boxShadow: '0 0 40px rgba(79,110,247,0.35)',
            }}>
            ⚡ Fazer QuickMatch
          </button>
          <button
            onClick={() => navigate('/grants')}
            style={{
              padding: '14px 32px', borderRadius: 10,
              border: '1px solid rgba(46,51,71,0.8)', background: 'rgba(26,29,39,0.8)',
              color: '#e8eaf0', cursor: 'pointer', fontSize: 16, fontWeight: 600,
            }}>
            Ver todos os fundos →
          </button>
        </div>

        {/* scroll hint */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', opacity: 0.4, animation: 'bounce 2s infinite' }}>
          ↓
        </div>
      </section>

      {/* ── STATS ── */}
      <section data-id="stats" style={{ padding: '60px 24px', borderTop: '1px solid #1a1d27', borderBottom: '1px solid #1a1d27' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 32 }}>
          {STATS.map((s, i) => (
            <div key={s.label} data-id={`stat-${i}`} style={{ textAlign: 'center', ...fadeIn(`stat-${i}`, i * 0.1) }}>
              <div style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: '#4f6ef7', letterSpacing: '-1px' }}>{s.value}</div>
              <div style={{ fontSize: 14, color: '#8b90a4', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section data-id="features" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div data-id="feat-title" style={{ textAlign: 'center', marginBottom: 64, ...fadeIn('feat-title') }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 12 }}>
              Tudo o que precisas para candidatar
            </h2>
            <p style={{ color: '#8b90a4', fontSize: 18 }}>Uma plataforma completa — da descoberta à candidatura.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} data-id={`feat-${i}`} style={{
                padding: '28px 28px', borderRadius: 14,
                background: 'rgba(26,29,39,0.7)', border: '1px solid #2e3347',
                ...fadeIn(`feat-${i}`, (i % 3) * 0.1),
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{f.title}</div>
                <div style={{ color: '#8b90a4', fontSize: 14, lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section data-id="how" style={{ padding: '80px 24px', background: 'rgba(26,29,39,0.4)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div data-id="how-title" style={{ marginBottom: 56, ...fadeIn('how-title') }}>
            <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 10 }}>Como funciona</h2>
            <p style={{ color: '#8b90a4', fontSize: 17 }}>Três passos para encontrar o teu fundo ideal.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
            {[
              { n: '01', title: 'Descreve a tua empresa', desc: 'Preenche o perfil ou usa o QuickMatch com o website/NIF da empresa.' },
              { n: '02', title: 'A IA analisa e pontua', desc: 'O Claude AI cruza o teu perfil com 1 260+ fundos e mostra os mais relevantes.' },
              { n: '03', title: 'Candidata-te com confiança', desc: 'Usa os rascunhos gerados por IA e as checklists de documentos para submeter.' },
            ].map((step, i) => (
              <div key={step.n} data-id={`step-${i}`} style={{
                padding: 28, borderRadius: 14, background: 'rgba(15,17,23,0.6)', border: '1px solid #2e3347',
                textAlign: 'left', ...fadeIn(`step-${i}`, i * 0.12),
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 8,
                  background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)', color: '#fff',
                  fontWeight: 800, fontSize: 13, marginBottom: 16,
                }}>{step.n}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{step.title}</div>
                <div style={{ color: '#8b90a4', fontSize: 14, lineHeight: 1.65 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOURCES TICKER ── */}
      <section style={{ padding: '56px 0', overflow: 'hidden', borderTop: '1px solid #1a1d27' }}>
        <div style={{ textAlign: 'center', color: '#8b90a4', fontSize: 13, marginBottom: 24, letterSpacing: 1, textTransform: 'uppercase' }}>
          Fontes de financiamento indexadas
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', padding: '0 24px' }}>
          {SOURCES.map(s => (
            <span key={s} style={{
              padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)', color: '#7b95fa',
            }}>{s}</span>
          ))}
          <span style={{
            padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500,
            background: 'rgba(46,51,71,0.4)', border: '1px solid #2e3347', color: '#8b90a4',
          }}>+50 mais</span>
        </div>
      </section>

      {/* ── CTA ── */}
      <section data-id="cta" style={{ padding: '100px 24px', textAlign: 'center' }}>
        <div data-id="cta-inner" style={{ maxWidth: 620, margin: '0 auto', ...fadeIn('cta-inner') }}>
          <div style={{
            display: 'inline-block', padding: '80px 60px', borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(79,110,247,0.12), rgba(124,58,237,0.12))',
            border: '1px solid rgba(79,110,247,0.2)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 14 }}>
              Pronto para começar?
            </h2>
            <p style={{ color: '#8b90a4', fontSize: 17, marginBottom: 32, lineHeight: 1.6 }}>
              Gratuito, sem registo, sem cartão de crédito.<br />
              Encontra financiamento para a tua empresa em segundos.
            </p>
            <button
              onClick={() => navigate('/quickmatch')}
              style={{
                padding: '16px 40px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)', color: '#fff',
                cursor: 'pointer', fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px',
                boxShadow: '0 0 50px rgba(79,110,247,0.4)',
              }}>
              ⚡ Fazer QuickMatch agora
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '32px 40px', borderTop: '1px solid #1a1d27',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>💡</div>
          FundoAI
        </div>
        <div style={{ color: '#8b90a4', fontSize: 13 }}>
          © 2026 FundoAI · Powered by Claude AI · Todos os fundos são meramente informativos.
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#8b90a4' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/grants')}>Fundos</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/quickmatch')}>QuickMatch</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
        </div>
      </footer>

      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>
    </div>
  )
}
