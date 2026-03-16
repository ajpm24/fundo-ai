const db = require('./database')

const grants = [
  {
    title: 'PT2030 — SI Inovação Empresarial',
    source: 'PT2030 / COMPETE',
    description: 'Apoio a projetos de inovação empresarial em PMEs, focado na introdução de novos produtos, processos ou modelos de negócio. Financiamento a fundo perdido de até 45% das despesas elegíveis.',
    max_amount: 2000000,
    deadline: '2025-12-31',
    eligible_sectors: JSON.stringify(['tecnologia', 'indústria', 'serviços', 'agro-alimentar', 'saúde']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.compete2030.pt'
  },
  {
    title: 'PT2030 — SI Qualificação PME',
    source: 'PT2030 / COMPETE',
    description: 'Apoio à qualificação e modernização de PMEs, incluindo certificações, implementação de sistemas de gestão, design e internacionalização.',
    max_amount: 200000,
    deadline: '2025-09-30',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.compete2030.pt'
  },
  {
    title: 'PRR — Agendas de Inovação para a Competitividade',
    source: 'PRR',
    description: 'Projetos mobilizadores de I&D e inovação em cadeias de valor, em consórcio entre empresas e entidades do sistema científico e tecnológico.',
    max_amount: 50000000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['tecnologia', 'indústria', 'automóvel', 'aeronáutica', 'saúde', 'energia']),
    eligible_sizes: JSON.stringify(['pequena', 'média', 'grande']),
    url: 'https://recuperarportugal.gov.pt'
  },
  {
    title: 'PRR — Capitalizar 2030',
    source: 'PRR / IAPMEI',
    description: 'Apoio à capitalização e resiliência de PMEs, incluindo instrumentos de capital e quase-capital para reforço da estrutura financeira.',
    max_amount: 500000,
    deadline: '2025-12-31',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.iapmei.pt/capitalizar'
  },
  {
    title: 'IAPMEI — Startup Voucher',
    source: 'IAPMEI',
    description: 'Vouchers para startups em fase inicial acederem a serviços de consultoria, mentoring, prototipagem e validação de mercado.',
    max_amount: 15000,
    deadline: '2025-08-31',
    eligible_sectors: JSON.stringify(['tecnologia', 'inovação', 'digital']),
    eligible_sizes: JSON.stringify(['micro', 'startup']),
    url: 'https://www.iapmei.pt/startup-voucher'
  },
  {
    title: 'IAPMEI — Vale Inovação',
    source: 'IAPMEI',
    description: 'Vouchers para PMEs contratarem serviços de I&D e inovação a entidades do sistema científico. Apoio a fundo perdido até 75%.',
    max_amount: 50000,
    deadline: '2025-10-31',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.iapmei.pt/vale-inovacao'
  },
  {
    title: 'Horizonte Europa — EIC Accelerator',
    source: 'Comissão Europeia / EIC',
    description: 'Financiamento misto (grant + equity) para startups e PMEs com tecnologias inovadoras de alto impacto. Grant até €2.5M + equity até €15M.',
    max_amount: 17500000,
    deadline: '2025-10-01',
    eligible_sectors: JSON.stringify(['deeptech', 'biotech', 'cleantech', 'digital', 'saúde']),
    eligible_sizes: JSON.stringify(['startup', 'micro', 'pequena']),
    url: 'https://eic.ec.europa.eu/eic-funding/eic-accelerator'
  },
  {
    title: 'Horizonte Europa — EIC Pathfinder',
    source: 'Comissão Europeia / EIC',
    description: 'Apoio a investigação exploratória de base tecnológica com elevado potencial transformador. Foco em ciência de fronteira com aplicação futura.',
    max_amount: 4000000,
    deadline: '2025-11-12',
    eligible_sectors: JSON.stringify(['investigação', 'deeptech', 'ciências da vida', 'quantum', 'AI']),
    eligible_sizes: JSON.stringify(['universidades', 'centros I&D', 'startups deeptech']),
    url: 'https://eic.ec.europa.eu/eic-funding/eic-pathfinder'
  },
  {
    title: 'Horizonte Europa — MSCA Postdoctoral Fellowships',
    source: 'Comissão Europeia / Marie Curie',
    description: 'Bolsas para investigadores pós-doutoramento realizarem projetos em organizações europeias. Mobilidade internacional e desenvolvimento de carreira.',
    max_amount: 200000,
    deadline: '2025-09-10',
    eligible_sectors: JSON.stringify(['investigação científica', 'inovação']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://marie-sklodowska-curie-actions.ec.europa.eu'
  },
  {
    title: 'ANI — P2030 I&DT Empresas em Copromoção',
    source: 'ANI / PT2030',
    description: 'Apoio a projetos de I&D em copromoção entre empresas e entidades do SCT. Taxa de financiamento até 80% para PMEs.',
    max_amount: 3000000,
    deadline: '2026-03-31',
    eligible_sectors: JSON.stringify(['tecnologia', 'indústria', 'saúde', 'energia', 'digital']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média', 'grande']),
    url: 'https://www.ani.pt'
  },
  {
    title: 'ANI — P2030 Projetos de I&D Individual',
    source: 'ANI / PT2030',
    description: 'Financiamento a projetos de I&D individual por empresas inovadoras. Inclui despesas com pessoal, equipamento e serviços externos.',
    max_amount: 750000,
    deadline: '2025-11-30',
    eligible_sectors: JSON.stringify(['tecnologia', 'indústria', 'saúde', 'energia', 'digital', 'agro-alimentar']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.ani.pt'
  },
  {
    title: 'Portugal Ventures — Capital de Risco',
    source: 'Portugal Ventures / IFD',
    description: 'Investimento de capital de risco em startups tecnológicas e inovadoras em fase de arranque e crescimento. Tickets entre €250K e €2M.',
    max_amount: 2000000,
    deadline: null,
    eligible_sectors: JSON.stringify(['tecnologia', 'digital', 'biotech', 'cleantech']),
    eligible_sizes: JSON.stringify(['startup', 'micro', 'pequena']),
    url: 'https://www.portugalmais.pt'
  },
  {
    title: 'BPI — Programa BPI La Caixa Inovação Social',
    source: 'Fundação BPI / La Caixa',
    description: 'Apoio a projetos de inovação social com impacto nas comunidades. Financiamento a fundo perdido até €150K com acompanhamento.',
    max_amount: 150000,
    deadline: '2025-07-15',
    eligible_sectors: JSON.stringify(['inovação social', 'educação', 'saúde', 'ambiente', 'inclusão']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://fundacaobpi.pt/inovacao-social'
  },
  {
    title: 'Champalimaud Foundation — Research Grants',
    source: 'Fundação Champalimaud',
    description: 'Financiamento para investigação em neurociências e oncologia. Apoio a projetos translacionais com potencial clínico.',
    max_amount: 1500000,
    deadline: '2025-12-01',
    eligible_sectors: JSON.stringify(['saúde', 'neurociências', 'oncologia', 'biotecnologia']),
    eligible_sizes: JSON.stringify(['universidades', 'centros I&D', 'biotech']),
    url: 'https://fchampalimaud.org'
  },
  {
    title: 'FCT — Projetos de Investigação Científica',
    source: 'FCT / Fundação para a Ciência e Tecnologia',
    description: 'Financiamento a projetos de investigação científica em todas as áreas do conhecimento. Apoio a equipas de investigadores portugueses.',
    max_amount: 250000,
    deadline: '2025-10-15',
    eligible_sectors: JSON.stringify(['todos os setores científicos']),
    eligible_sizes: JSON.stringify(['universidades', 'laboratórios', 'centros I&D']),
    url: 'https://www.fct.pt'
  },
  {
    title: 'LIFE — Programa UE Ambiente e Clima',
    source: 'Comissão Europeia / CINEA',
    description: 'Financiamento europeu para projetos de ambiente, conservação da natureza e ação climática. Cofinanciamento até 60-75%.',
    max_amount: 5000000,
    deadline: '2025-09-16',
    eligible_sectors: JSON.stringify(['ambiente', 'energia renovável', 'economia circular', 'biodiversidade']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://cinea.ec.europa.eu/programmes/life'
  },
  {
    title: 'Programa Portugal Exporta',
    source: 'AICEP Portugal Global',
    description: 'Apoio à internacionalização de empresas portuguesas, incluindo participação em feiras, missões empresariais e promoção internacional.',
    max_amount: 100000,
    deadline: '2025-08-31',
    eligible_sectors: JSON.stringify(['todos os setores exportadores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.portugalglobal.pt'
  },
  {
    title: 'Digital Innovation Hub Portugal',
    source: 'COMPETE 2030 / DIH',
    description: 'Vouchers de digitalização para PMEs testarem tecnologias digitais (IA, IoT, cloud, robótica). Acesso gratuito a infraestrutura e expertise.',
    max_amount: 30000,
    deadline: '2025-11-30',
    eligible_sectors: JSON.stringify(['indústria', 'serviços', 'agro-alimentar', 'saúde', 'logística']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://dihportugal.pt'
  },
  {
    title: 'PRR — Transição Digital das PME',
    source: 'PRR / INCoDe.2030',
    description: 'Financiamento para transformação digital de PMEs: adoção de software de gestão, e-commerce, cibersegurança e capacitação digital.',
    max_amount: 150000,
    deadline: '2025-10-15',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://recuperarportugal.gov.pt/transicao-digital'
  },
  {
    title: 'Erasmus+ — Parcerias de Inovação',
    source: 'Comissão Europeia / Erasmus+',
    description: 'Apoio a parcerias entre empresas e instituições de ensino para inovação educativa, formação profissional e desenvolvimento de competências.',
    max_amount: 400000,
    deadline: '2025-03-20',
    eligible_sectors: JSON.stringify(['educação', 'formação', 'juventude', 'desporto']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://erasmus-plus.ec.europa.eu'
  }
]

function seedGrants() {
  const count = db.prepare('SELECT COUNT(*) as c FROM grants').get().c
  if (count > 0) return
  const insert = db.prepare(`
    INSERT INTO grants (title, source, description, max_amount, deadline, eligible_sectors, eligible_sizes, url)
    VALUES (@title, @source, @description, @max_amount, @deadline, @eligible_sectors, @eligible_sizes, @url)
  `)
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row)
  })
  insertMany(grants)
  console.log(`Seeded ${grants.length} grants`)
}

module.exports = { seedGrants }
