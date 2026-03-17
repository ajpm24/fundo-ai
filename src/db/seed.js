const db = require('./database')

// funding_type: fundo_perdido | reembolsavel | misto | equity | garantia | voucher | emprestimo
// region: todas | nacional | norte | centro | ams | alentejo | algarve | acores | madeira
// category: inovacao | digitalizacao | internacionalizacao | ambiente | energia | social | formacao | investigacao | agro | maritimo | turismo | cultura | emprego | saude | espacial

const grants = [
  // ─── PT2030 / COMPETE 2030 ───────────────────────────────────────────────
  {
    title: 'PT2030 — SI Inovação Empresarial',
    source: 'PT2030 / COMPETE 2030',
    description: 'Apoio a projetos de inovação empresarial em PMEs: novos produtos, processos, modelos de negócio ou mercados. Taxa de financiamento até 45% a fundo perdido.',
    max_amount: 2000000, min_amount: 50000,
    deadline: '2025-12-31',
    eligible_sectors: JSON.stringify(['tecnologia', 'indústria', 'serviços', 'agro-alimentar', 'saúde', 'turismo']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.compete2030.pt', funding_type: 'fundo_perdido', region: 'todas', category: 'inovacao', cofinancing_rate: 45
  },
  {
    title: 'PT2030 — SI Qualificação e Internacionalização PME',
    source: 'PT2030 / COMPETE 2030',
    description: 'Apoio à qualificação e modernização de PMEs: certificações ISO, sistemas de gestão da qualidade, design, moda e internacionalização.',
    max_amount: 200000, min_amount: 10000,
    deadline: '2025-09-30',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.compete2030.pt', funding_type: 'fundo_perdido', region: 'todas', category: 'internacionalizacao', cofinancing_rate: 50
  },
  {
    title: 'PT2030 — SI Internacionalização das Empresas',
    source: 'PT2030 / AICEP / COMPETE 2030',
    description: 'Apoio à internacionalização de PMEs: estabelecimento de escritórios no exterior, certificações internacionais, adaptação de produtos para mercados externos.',
    max_amount: 500000, min_amount: 25000,
    deadline: '2026-03-31',
    eligible_sectors: JSON.stringify(['todos os setores exportadores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.aicep.pt', funding_type: 'fundo_perdido', region: 'todas', category: 'internacionalizacao', cofinancing_rate: 50
  },
  {
    title: 'PT2030 — SI Investigação & Desenvolvimento Tecnológico (IDT)',
    source: 'PT2030 / ANI',
    description: 'Financiamento a projetos de I&DT empresariais, incluindo pessoal de I&D, equipamentos científicos e propriedade intelectual. Taxa até 80% para PMEs.',
    max_amount: 1500000, min_amount: 50000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['tecnologia', 'indústria', 'saúde', 'digital', 'energia', 'agro-alimentar']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média', 'grande']),
    url: 'https://www.ani.pt', funding_type: 'fundo_perdido', region: 'todas', category: 'investigacao', cofinancing_rate: 80
  },
  {
    title: 'PT2030 — SI Empreendedorismo Qualificado',
    source: 'PT2030 / COMPETE 2030',
    description: 'Apoio à criação de novas empresas inovadoras por empreendedores qualificados. Financiamento de investimento inicial e despesas operacionais dos primeiros anos.',
    max_amount: 300000, min_amount: 20000,
    deadline: '2025-10-31',
    eligible_sectors: JSON.stringify(['tecnologia', 'inovação', 'digital', 'indústria criativa']),
    eligible_sizes: JSON.stringify(['startup', 'micro']),
    url: 'https://www.compete2030.pt', funding_type: 'fundo_perdido', region: 'todas', category: 'inovacao', cofinancing_rate: 75
  },
  {
    title: 'PT2030 — Eficiência Energética em PME',
    source: 'PT2030 / COMPETE 2030 / FEDER',
    description: 'Apoio ao investimento em eficiência energética em PMEs industriais: auditoria energética, equipamentos de baixo consumo, energias renováveis on-site.',
    max_amount: 1000000, min_amount: 30000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['indústria', 'serviços', 'agro-alimentar', 'hotelaria']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.compete2030.pt', funding_type: 'fundo_perdido', region: 'todas', category: 'energia', cofinancing_rate: 40
  },
  {
    title: 'PT2030 — Transição para Economia Circular',
    source: 'PT2030 / COMPETE 2030 / FEDER',
    description: 'Apoio a projetos que promovam a economia circular em PMEs: simbiose industrial, ecodesign, reutilização de resíduos e processos de produção limpa.',
    max_amount: 800000, min_amount: 25000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['indústria', 'agro-alimentar', 'construção', 'têxtil', 'plásticos']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.compete2030.pt', funding_type: 'fundo_perdido', region: 'todas', category: 'ambiente', cofinancing_rate: 45
  },
  {
    title: 'PT2030 — Apoio ao Investimento Produtivo (AIP)',
    source: 'PT2030 / COMPETE 2030 / FEDER',
    description: 'Apoio ao investimento produtivo em PMEs industriais e de serviços: modernização de instalações, equipamentos produtivos e expansão de capacidade.',
    max_amount: 5000000, min_amount: 100000,
    deadline: '2026-12-31',
    eligible_sectors: JSON.stringify(['indústria', 'serviços exportadores', 'agro-alimentar', 'turismo']),
    eligible_sizes: JSON.stringify(['pequena', 'média']),
    url: 'https://www.compete2030.pt', funding_type: 'fundo_perdido', region: 'todas', category: 'inovacao', cofinancing_rate: 30
  },

  // ─── PRR ────────────────────────────────────────────────────────────────
  {
    title: 'PRR — Agendas de Inovação para a Competitividade',
    source: 'PRR',
    description: 'Projetos mobilizadores de I&D e inovação em cadeias de valor estratégicas, em consórcio liderado por empresa com entidades do SCT.',
    max_amount: 50000000, min_amount: 5000000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['tecnologia', 'indústria', 'automóvel', 'aeronáutica', 'saúde', 'energia', 'digital']),
    eligible_sizes: JSON.stringify(['pequena', 'média', 'grande']),
    url: 'https://recuperarportugal.gov.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'investigacao', cofinancing_rate: 80
  },
  {
    title: 'PRR — Capitalizar 2030',
    source: 'PRR / IAPMEI',
    description: 'Apoio à capitalização e resiliência de PMEs através de instrumentos de capital e quase-capital para reforço da estrutura financeira.',
    max_amount: 500000, min_amount: 25000,
    deadline: '2025-12-31',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.iapmei.pt/capitalizar', funding_type: 'misto', region: 'nacional', category: 'inovacao', cofinancing_rate: 50
  },
  {
    title: 'PRR — Transição Digital das PME',
    source: 'PRR / IAPMEI / INCoDe.2030',
    description: 'Financiamento para transformação digital de PMEs: ERP, CRM, e-commerce, cibersegurança, cloud computing e capacitação de recursos humanos.',
    max_amount: 150000, min_amount: 5000,
    deadline: '2025-10-15',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://recuperarportugal.gov.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'digitalizacao', cofinancing_rate: 85
  },
  {
    title: 'PRR — Laboratórios Colaborativos (CoLAB)',
    source: 'PRR / FCT',
    description: 'Apoio à criação e consolidação de Laboratórios Colaborativos que integrem empresas e centros de I&D para investigação orientada para o mercado.',
    max_amount: 10000000, min_amount: 500000,
    deadline: '2026-12-31',
    eligible_sectors: JSON.stringify(['investigação', 'tecnologia', 'saúde', 'energia', 'digital']),
    eligible_sizes: JSON.stringify(['universidades', 'centros I&D', 'consórcios']),
    url: 'https://www.fct.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'investigacao', cofinancing_rate: 85
  },
  {
    title: 'PRR — Habitação Acessível (Programas Arrendamento)',
    source: 'PRR / IHM',
    description: 'Financiamento para construção e reabilitação de habitação pública de renda acessível. Elegível para cooperativas de habitação e municípios.',
    max_amount: 20000000, min_amount: 500000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['imobiliário', 'construção', 'cooperativas']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://recuperarportugal.gov.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'social', cofinancing_rate: 75
  },
  {
    title: 'PRR — Requalificação Urbana e Rural',
    source: 'PRR / Municípios',
    description: 'Apoio a intervenções de requalificação de espaços públicos e edifícios históricos, revitalização de centros históricos e infraestruturas de apoio ao turismo.',
    max_amount: 5000000, min_amount: 100000,
    deadline: '2025-12-31',
    eligible_sectors: JSON.stringify(['construção', 'turismo', 'cultura', 'reabilitação']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://recuperarportugal.gov.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'turismo', cofinancing_rate: 80
  },

  // ─── IAPMEI ──────────────────────────────────────────────────────────────
  {
    title: 'IAPMEI — Startup Voucher',
    source: 'IAPMEI',
    description: 'Vouchers para startups em fase inicial acederem a serviços de consultoria, mentoring, prototipagem e validação de mercado.',
    max_amount: 15000, min_amount: 2500,
    deadline: '2025-08-31',
    eligible_sectors: JSON.stringify(['tecnologia', 'inovação', 'digital', 'todos']),
    eligible_sizes: JSON.stringify(['micro', 'startup']),
    url: 'https://www.iapmei.pt', funding_type: 'voucher', region: 'nacional', category: 'inovacao', cofinancing_rate: 100
  },
  {
    title: 'IAPMEI — Vale Inovação',
    source: 'IAPMEI',
    description: 'Vouchers para PMEs contratarem serviços de I&D e inovação a entidades do SCT. Apoio a fundo perdido até 75% das despesas elegíveis.',
    max_amount: 50000, min_amount: 5000,
    deadline: '2025-10-31',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.iapmei.pt', funding_type: 'voucher', region: 'nacional', category: 'inovacao', cofinancing_rate: 75
  },
  {
    title: 'IAPMEI — Vale Incubação',
    source: 'IAPMEI',
    description: 'Vouchers para startups acederem a serviços de incubação em espaços certificados: instalações, serviços partilhados e mentoria de negócio.',
    max_amount: 20000, min_amount: 2000,
    deadline: '2025-09-30',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['startup', 'micro']),
    url: 'https://www.iapmei.pt', funding_type: 'voucher', region: 'nacional', category: 'inovacao', cofinancing_rate: 100
  },
  {
    title: 'IAPMEI — Vale Internacionalização',
    source: 'IAPMEI / AICEP',
    description: 'Vouchers para PMEs contratarem serviços de apoio à internacionalização: prospeção de mercados, estudos de mercado e adaptação de produtos.',
    max_amount: 30000, min_amount: 5000,
    deadline: '2025-11-30',
    eligible_sectors: JSON.stringify(['todos os setores exportadores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.iapmei.pt', funding_type: 'voucher', region: 'nacional', category: 'internacionalizacao', cofinancing_rate: 75
  },
  {
    title: 'IAPMEI — Linha PME Crescimento',
    source: 'IAPMEI / Banca',
    description: 'Linha de crédito bonificada para PMEs financiarem projetos de investimento e fundo de maneio. Garantia mútua do Estado com spreads reduzidos.',
    max_amount: 1500000, min_amount: 25000,
    deadline: null,
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.iapmei.pt', funding_type: 'emprestimo', region: 'nacional', category: 'inovacao', cofinancing_rate: null
  },

  // ─── ANI ─────────────────────────────────────────────────────────────────
  {
    title: 'ANI — I&DT Empresas em Copromoção',
    source: 'ANI / PT2030',
    description: 'Apoio a projetos de I&D em copromoção entre empresas e entidades do SCT. Taxa de financiamento até 80% para PMEs.',
    max_amount: 3000000, min_amount: 100000,
    deadline: '2026-03-31',
    eligible_sectors: JSON.stringify(['tecnologia', 'indústria', 'saúde', 'energia', 'digital', 'agro']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média', 'grande']),
    url: 'https://www.ani.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'investigacao', cofinancing_rate: 80
  },
  {
    title: 'ANI — I&DT Empresas Individual',
    source: 'ANI / PT2030',
    description: 'Financiamento a projetos de I&D individual por empresas inovadoras. Elegível pessoal, equipamento e serviços externos de I&D.',
    max_amount: 750000, min_amount: 50000,
    deadline: '2025-11-30',
    eligible_sectors: JSON.stringify(['tecnologia', 'indústria', 'saúde', 'energia', 'digital', 'agro-alimentar']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.ani.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'investigacao', cofinancing_rate: 75
  },
  {
    title: 'ANI — Eurostars 3 (Projetos Internacionais I&D)',
    source: 'ANI / Eurostars / EUREKA',
    description: 'Financiamento a projetos de I&D colaborativos internacionais entre PMEs e instituições de investigação de países EUREKA. Foco em mercado.',
    max_amount: 500000, min_amount: 50000,
    deadline: '2025-09-18',
    eligible_sectors: JSON.stringify(['tecnologia', 'digital', 'saúde', 'energia', 'indústria']),
    eligible_sizes: JSON.stringify(['startup', 'micro', 'pequena', 'média']),
    url: 'https://www.ani.pt/eurostars', funding_type: 'fundo_perdido', region: 'nacional', category: 'investigacao', cofinancing_rate: 75
  },
  {
    title: 'ANI — EUREKA Clusters e Redes',
    source: 'ANI / EUREKA',
    description: 'Projetos de I&D em clusters tecnológicos europeus (Itea, Penta, Celtic, EURIPIDES). Colaboração transnacional em áreas de alta tecnologia.',
    max_amount: 1000000, min_amount: 100000,
    deadline: '2026-01-31',
    eligible_sectors: JSON.stringify(['software', 'eletrónica', 'telecomunicações', 'manufatura avançada']),
    eligible_sizes: JSON.stringify(['pequena', 'média', 'grande']),
    url: 'https://www.ani.pt/eureka', funding_type: 'fundo_perdido', region: 'nacional', category: 'investigacao', cofinancing_rate: 70
  },

  // ─── Horizonte Europa ─────────────────────────────────────────────────────
  {
    title: 'EIC Accelerator — Grant + Equity',
    source: 'Comissão Europeia / EIC',
    description: 'Financiamento misto (grant até €2.5M + equity até €15M) para startups e PMEs com inovações disruptivas de alto impacto. Altamente competitivo.',
    max_amount: 17500000, min_amount: 500000,
    deadline: '2025-10-01',
    eligible_sectors: JSON.stringify(['deeptech', 'biotech', 'cleantech', 'digital', 'saúde', 'espacial']),
    eligible_sizes: JSON.stringify(['startup', 'micro', 'pequena']),
    url: 'https://eic.ec.europa.eu/eic-accelerator', funding_type: 'misto', region: 'todas', category: 'inovacao', cofinancing_rate: 70
  },
  {
    title: 'EIC Pathfinder — Investigação Exploratória',
    source: 'Comissão Europeia / EIC',
    description: 'Apoio a investigação exploratória de base científica com elevado potencial transformador. Fase de prova de conceito tecnológico.',
    max_amount: 4000000, min_amount: 500000,
    deadline: '2025-11-12',
    eligible_sectors: JSON.stringify(['investigação', 'deeptech', 'quantum', 'AI', 'biotecnologia', 'neurociências']),
    eligible_sizes: JSON.stringify(['universidades', 'centros I&D', 'startups deeptech']),
    url: 'https://eic.ec.europa.eu/eic-pathfinder', funding_type: 'fundo_perdido', region: 'todas', category: 'investigacao', cofinancing_rate: 100
  },
  {
    title: 'EIC Transition — Prova de Conceito Tecnológico',
    source: 'Comissão Europeia / EIC',
    description: 'Financiamento para validação tecnológica e desenvolvimento de negócio de resultados do EIC Pathfinder e ERC. Ponte entre investigação e mercado.',
    max_amount: 2500000, min_amount: 500000,
    deadline: '2025-09-17',
    eligible_sectors: JSON.stringify(['deeptech', 'biotech', 'quantum', 'advanced materials', 'digital']),
    eligible_sizes: JSON.stringify(['startup', 'pequena', 'universidades']),
    url: 'https://eic.ec.europa.eu/eic-transition', funding_type: 'fundo_perdido', region: 'todas', category: 'investigacao', cofinancing_rate: 100
  },
  {
    title: 'ERC Starting Grant',
    source: 'Comissão Europeia / ERC',
    description: 'Bolsa para investigadores com 2-7 anos de experiência pós-doutoramento para estabelecerem equipas de investigação independentes de excelência.',
    max_amount: 1500000, min_amount: null,
    deadline: '2025-10-22',
    eligible_sectors: JSON.stringify(['investigação científica', 'todas as áreas']),
    eligible_sizes: JSON.stringify(['universidades', 'centros I&D']),
    url: 'https://erc.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'investigacao', cofinancing_rate: 100
  },
  {
    title: 'ERC Consolidator Grant',
    source: 'Comissão Europeia / ERC',
    description: 'Bolsa para investigadores com 7-12 anos de experiência pós-doutoramento consolidarem equipas e projetos de investigação de fronteira.',
    max_amount: 2000000, min_amount: null,
    deadline: '2026-01-28',
    eligible_sectors: JSON.stringify(['investigação científica', 'todas as áreas']),
    eligible_sizes: JSON.stringify(['universidades', 'centros I&D']),
    url: 'https://erc.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'investigacao', cofinancing_rate: 100
  },
  {
    title: 'ERC Advanced Grant',
    source: 'Comissão Europeia / ERC',
    description: 'Bolsa para investigadores sénior de excelência estabelecida para projetos de investigação pioneira de alto risco.',
    max_amount: 3500000, min_amount: null,
    deadline: '2025-08-28',
    eligible_sectors: JSON.stringify(['investigação científica', 'todas as áreas']),
    eligible_sizes: JSON.stringify(['universidades', 'centros I&D']),
    url: 'https://erc.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'investigacao', cofinancing_rate: 100
  },
  {
    title: 'ERC Proof of Concept',
    source: 'Comissão Europeia / ERC',
    description: 'Mini-bolsa para investigadores ERC explorarem o potencial de comercialização dos resultados da sua investigação financiada pelo ERC.',
    max_amount: 150000, min_amount: null,
    deadline: '2025-11-20',
    eligible_sectors: JSON.stringify(['todos']),
    eligible_sizes: JSON.stringify(['universidades', 'centros I&D']),
    url: 'https://erc.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'investigacao', cofinancing_rate: 100
  },
  {
    title: 'MSCA — Postdoctoral Fellowships',
    source: 'Comissão Europeia / Marie Curie',
    description: 'Bolsas para investigadores pós-doutoramento realizarem projetos em organizações europeias. Inclui componente de mobilidade internacional.',
    max_amount: 200000, min_amount: null,
    deadline: '2025-09-10',
    eligible_sectors: JSON.stringify(['investigação científica', 'inovação']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://marie-sklodowska-curie-actions.ec.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'investigacao', cofinancing_rate: 100
  },
  {
    title: 'MSCA — Staff Exchanges',
    source: 'Comissão Europeia / Marie Curie',
    description: 'Financiamento a trocas temporárias de investigadores e pessoal entre organizações de diferentes países. Promove transferência de conhecimento.',
    max_amount: 500000, min_amount: 50000,
    deadline: '2026-03-05',
    eligible_sectors: JSON.stringify(['investigação', 'tecnologia', 'indústria', 'todos']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://marie-sklodowska-curie-actions.ec.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'formacao', cofinancing_rate: 100
  },
  {
    title: 'MSCA — Doctoral Networks',
    source: 'Comissão Europeia / Marie Curie',
    description: 'Redes de doutoramento europeias para formação de investigadores em consórcio de universidades e empresas.',
    max_amount: 3000000, min_amount: 300000,
    deadline: '2025-11-14',
    eligible_sectors: JSON.stringify(['investigação', 'todos']),
    eligible_sizes: JSON.stringify(['universidades', 'empresas (parceiras)']),
    url: 'https://marie-sklodowska-curie-actions.ec.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'formacao', cofinancing_rate: 100
  },
  {
    title: 'Horizonte Europa — Cluster Saúde (Pilar II)',
    source: 'Comissão Europeia / HEU',
    description: 'Financiamento a projetos de I&D em saúde: doenças raras, cancro, saúde mental, resistência antimicrobiana, saúde digital e diagnóstico.',
    max_amount: 10000000, min_amount: 1000000,
    deadline: '2025-09-04',
    eligible_sectors: JSON.stringify(['saúde', 'biotech', 'pharma', 'medtech', 'digital saúde']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://ec.europa.eu/info/funding-tenders/opportunities', funding_type: 'fundo_perdido', region: 'todas', category: 'saude', cofinancing_rate: 100
  },
  {
    title: 'Horizonte Europa — Cluster Digital, Indústria e Espaço',
    source: 'Comissão Europeia / HEU',
    description: 'Financiamento a I&D em IA, robótica, manufatura avançada, 5G/6G, cloud/edge computing, semicondutores, gémeos digitais e tecnologias espaciais.',
    max_amount: 8000000, min_amount: 500000,
    deadline: '2025-11-18',
    eligible_sectors: JSON.stringify(['IA', 'robótica', 'digital', 'manufatura', 'telecomunicações', 'espacial']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://ec.europa.eu/info/funding-tenders/opportunities', funding_type: 'fundo_perdido', region: 'todas', category: 'digitalizacao', cofinancing_rate: 100
  },
  {
    title: 'Horizonte Europa — Cluster Clima, Energia e Mobilidade',
    source: 'Comissão Europeia / HEU',
    description: 'I&D em energias renováveis, hidrogénio, armazenamento de energia, mobilidade elétrica, aviação limpa e descarbonização de indústrias pesadas.',
    max_amount: 12000000, min_amount: 1000000,
    deadline: '2026-01-14',
    eligible_sectors: JSON.stringify(['energia', 'transportes', 'construção', 'indústria', 'mobilidade']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://ec.europa.eu/info/funding-tenders/opportunities', funding_type: 'fundo_perdido', region: 'todas', category: 'energia', cofinancing_rate: 100
  },
  {
    title: 'Horizonte Europa — Cluster Alimentação, Bioeconomia e Recursos Naturais',
    source: 'Comissão Europeia / HEU',
    description: 'Projetos de I&D em agricultura sustentável, bioeconomia circular, silvicultura, alimentação saudável, biotecnologia azul e marinha.',
    max_amount: 6000000, min_amount: 500000,
    deadline: '2025-10-08',
    eligible_sectors: JSON.stringify(['agro-alimentar', 'bioeconomia', 'florestal', 'marítimo', 'biotecnologia']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://ec.europa.eu/info/funding-tenders/opportunities', funding_type: 'fundo_perdido', region: 'todas', category: 'agro', cofinancing_rate: 100
  },

  // ─── LIFE ─────────────────────────────────────────────────────────────────
  {
    title: 'LIFE — Natureza e Biodiversidade',
    source: 'Comissão Europeia / CINEA',
    description: 'Financiamento a projetos de conservação de espécies e habitats naturais, gestão de áreas protegidas Natura 2000 e restauração de ecossistemas.',
    max_amount: 5000000, min_amount: 500000,
    deadline: '2025-09-16',
    eligible_sectors: JSON.stringify(['ambiente', 'conservação natureza', 'biodiversidade', 'ONGs']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://cinea.ec.europa.eu/programmes/life', funding_type: 'fundo_perdido', region: 'todas', category: 'ambiente', cofinancing_rate: 60
  },
  {
    title: 'LIFE — Economia Circular e Qualidade de Vida',
    source: 'Comissão Europeia / CINEA',
    description: 'Projetos demonstradores de economia circular, redução de resíduos plásticos, qualidade do ar e solo, e gestão sustentável de recursos.',
    max_amount: 4000000, min_amount: 300000,
    deadline: '2025-09-16',
    eligible_sectors: JSON.stringify(['ambiente', 'gestão resíduos', 'indústria', 'municípios']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://cinea.ec.europa.eu/programmes/life', funding_type: 'fundo_perdido', region: 'todas', category: 'ambiente', cofinancing_rate: 60
  },
  {
    title: 'LIFE — Transição para Energia Limpa',
    source: 'Comissão Europeia / CINEA',
    description: 'Projetos de demonstração de eficiência energética, energias renováveis e armazenamento de energia em comunidades e indústrias.',
    max_amount: 5000000, min_amount: 500000,
    deadline: '2025-09-16',
    eligible_sectors: JSON.stringify(['energia', 'construção', 'indústria', 'comunidades energéticas']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://cinea.ec.europa.eu/programmes/life', funding_type: 'fundo_perdido', region: 'todas', category: 'energia', cofinancing_rate: 60
  },
  {
    title: 'LIFE — Ação Climática (Mitigação e Adaptação)',
    source: 'Comissão Europeia / CINEA',
    description: 'Projetos de mitigação de emissões GEE e adaptação às alterações climáticas: governação climática, planos de adaptação, soluções baseadas na natureza.',
    max_amount: 4000000, min_amount: 300000,
    deadline: '2025-09-16',
    eligible_sectors: JSON.stringify(['ambiente', 'energia', 'agricultura', 'municípios', 'ONGs']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://cinea.ec.europa.eu/programmes/life', funding_type: 'fundo_perdido', region: 'todas', category: 'ambiente', cofinancing_rate: 60
  },

  // ─── Digital Europe Programme ──────────────────────────────────────────────
  {
    title: 'Digital Europe — IA: Ambientes de Teste e Experimentação',
    source: 'Comissão Europeia / DEP',
    description: 'Apoio ao desenvolvimento e acesso a infraestruturas de teste de IA, bancos de dados e ferramentas para desenvolvimento de sistemas de IA.',
    max_amount: 5000000, min_amount: 500000,
    deadline: '2025-11-20',
    eligible_sectors: JSON.stringify(['IA', 'digital', 'industria', 'saúde', 'mobilidade']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://digital-strategy.ec.europa.eu/digital-europe-programme', funding_type: 'fundo_perdido', region: 'todas', category: 'digitalizacao', cofinancing_rate: 50
  },
  {
    title: 'Digital Europe — Cibersegurança',
    source: 'Comissão Europeia / DEP / ENISA',
    description: 'Financiamento a capacidades de cibersegurança: infraestrutura, certificação, operações de segurança (SOC) e competências avançadas.',
    max_amount: 3000000, min_amount: 200000,
    deadline: '2025-10-08',
    eligible_sectors: JSON.stringify(['cibersegurança', 'digital', 'infraestrutura crítica', 'defesa']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://digital-strategy.ec.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'digitalizacao', cofinancing_rate: 50
  },
  {
    title: 'Digital Europe — Competências Digitais Avançadas',
    source: 'Comissão Europeia / DEP',
    description: 'Bolsas e programas de formação avançada em tecnologias digitais: IA, cloud, cibersegurança, computação de alto desempenho (HPC).',
    max_amount: 2000000, min_amount: 100000,
    deadline: '2025-09-25',
    eligible_sectors: JSON.stringify(['educação', 'formação', 'digital']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://digital-strategy.ec.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'formacao', cofinancing_rate: 50
  },
  {
    title: 'Digital Europe — European Digital Innovation Hubs (EDIH)',
    source: 'Comissão Europeia / DEP',
    description: 'Acesso gratuito a serviços de digitalização, IA, HPC e cibersegurança para PMEs através da rede EDIH Portugal (DIH Portugal).',
    max_amount: 30000, min_amount: 0,
    deadline: '2026-12-31',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://dihportugal.pt', funding_type: 'voucher', region: 'nacional', category: 'digitalizacao', cofinancing_rate: 100
  },

  // ─── Creative Europe ───────────────────────────────────────────────────────
  {
    title: 'Creative Europe — Subprograma Cultura',
    source: 'Comissão Europeia / Creative Europe',
    description: 'Apoio a projetos de cooperação cultural europeia, circulação de obras e artistas, desenvolvimento de capacidades do setor cultural e criativo.',
    max_amount: 2000000, min_amount: 50000,
    deadline: '2025-10-07',
    eligible_sectors: JSON.stringify(['cultura', 'artes', 'música', 'literatura', 'arquitetura', 'design']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://creative-europe.ec.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'cultura', cofinancing_rate: 70
  },
  {
    title: 'Creative Europe — MEDIA (Cinema e Audiovisual)',
    source: 'Comissão Europeia / Creative Europe MEDIA',
    description: 'Apoio ao desenvolvimento, distribuição e promoção de obras audiovisuais europeias: filmes, séries, documentários, jogos de vídeo.',
    max_amount: 1000000, min_amount: 25000,
    deadline: '2025-11-06',
    eligible_sectors: JSON.stringify(['cinema', 'audiovisual', 'videojogos', 'streaming', 'televisão']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://creative-europe.ec.europa.eu/media', funding_type: 'fundo_perdido', region: 'todas', category: 'cultura', cofinancing_rate: 60
  },
  {
    title: 'Creative Europe — Setor Transversal (Jornalismo e Media)',
    source: 'Comissão Europeia / Creative Europe',
    description: 'Apoio à inovação nos media, jornalismo digital, literacia mediática e cooperação europeia no setor da imprensa e media.',
    max_amount: 500000, min_amount: 50000,
    deadline: '2026-01-15',
    eligible_sectors: JSON.stringify(['media', 'jornalismo', 'comunicação', 'publicação']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://creative-europe.ec.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'cultura', cofinancing_rate: 50
  },

  // ─── Erasmus+ ─────────────────────────────────────────────────────────────
  {
    title: 'Erasmus+ — KA2: Parcerias de Cooperação',
    source: 'Comissão Europeia / Erasmus+ / ANQEP',
    description: 'Apoio a parcerias transnacionais entre escolas, universidades, formação profissional e organizações de juventude para projetos de cooperação.',
    max_amount: 400000, min_amount: 30000,
    deadline: '2025-03-20',
    eligible_sectors: JSON.stringify(['educação', 'formação profissional', 'juventude', 'desporto']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://erasmus-plus.ec.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'formacao', cofinancing_rate: 80
  },
  {
    title: 'Erasmus+ — KA1: Mobilidade Individual',
    source: 'Comissão Europeia / Erasmus+ / ANQEP',
    description: 'Bolsas de mobilidade para estudantes, docentes e pessoal de organizações educativas e de formação realizarem estágios ou formação no estrangeiro.',
    max_amount: 200000, min_amount: 10000,
    deadline: '2026-02-05',
    eligible_sectors: JSON.stringify(['educação', 'formação profissional', 'juventude']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://erasmus-plus.ec.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'formacao', cofinancing_rate: 100
  },
  {
    title: 'Erasmus+ — Alianças para a Inovação',
    source: 'Comissão Europeia / Erasmus+',
    description: 'Parcerias entre universidades e empresas para desenvolver currículos inovadores, estimular empreendedorismo e competências para o futuro do trabalho.',
    max_amount: 1000000, min_amount: 100000,
    deadline: '2025-10-28',
    eligible_sectors: JSON.stringify(['educação superior', 'empresas', 'inovação', 'todos']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://erasmus-plus.ec.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'inovacao', cofinancing_rate: 80
  },

  // ─── CEF — Connecting Europe Facility ─────────────────────────────────────
  {
    title: 'CEF Digital — Conectividade e 5G',
    source: 'Comissão Europeia / CEF / CINEA',
    description: 'Financiamento à implantação de redes de conectividade digital: fibra óptica, 5G em corredores de transporte, backbone transfronteiriço.',
    max_amount: 10000000, min_amount: 1000000,
    deadline: '2025-11-13',
    eligible_sectors: JSON.stringify(['telecomunicações', 'infraestrutura digital', 'transportes']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://cinea.ec.europa.eu/programmes/cef', funding_type: 'fundo_perdido', region: 'todas', category: 'digitalizacao', cofinancing_rate: 50
  },
  {
    title: 'CEF Energia — Infraestrutura Energética',
    source: 'Comissão Europeia / CEF / CINEA',
    description: 'Apoio a projetos de infraestrutura energética de interesse comum: redes elétricas transfronteiriças, hidrogénio, armazenamento e smart grids.',
    max_amount: 50000000, min_amount: 1000000,
    deadline: '2026-01-15',
    eligible_sectors: JSON.stringify(['energia', 'hidrogénio', 'redes elétricas', 'infraestrutura']),
    eligible_sizes: JSON.stringify(['grandes empresas', 'utilities', 'consórcios']),
    url: 'https://cinea.ec.europa.eu/programmes/cef', funding_type: 'fundo_perdido', region: 'todas', category: 'energia', cofinancing_rate: 50
  },

  // ─── InvestEU / BEI / FEI ─────────────────────────────────────────────────
  {
    title: 'InvestEU — Janela PME (Garantias EIB/EIF)',
    source: 'Comissão Europeia / BEI / FEI',
    description: 'Garantias de crédito e instrumentos financeiros do Fundo InvestEU para facilitar acesso ao financiamento de PMEs inovadoras e sustentáveis.',
    max_amount: 5000000, min_amount: 25000,
    deadline: null,
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.eif.org', funding_type: 'garantia', region: 'todas', category: 'inovacao', cofinancing_rate: null
  },
  {
    title: 'InvestEU — Investigação e Inovação',
    source: 'Comissão Europeia / BEI',
    description: 'Empréstimos e garantias do BEI para projetos de I&D e inovação de grande escala. Suporta o risco tecnológico de projetos inovadores.',
    max_amount: 25000000, min_amount: 7500000,
    deadline: null,
    eligible_sectors: JSON.stringify(['tecnologia', 'saúde', 'digital', 'energia', 'indústria']),
    eligible_sizes: JSON.stringify(['média', 'grande']),
    url: 'https://www.bei.org', funding_type: 'emprestimo', region: 'todas', category: 'investigacao', cofinancing_rate: null
  },
  {
    title: 'FEI — COSME Garantia de Empréstimo (LGF)',
    source: 'FEI / COSME / Banca Parceira',
    description: 'Garantias do Fundo Europeu de Investimento para PMEs acederem a crédito bancário sem colateral suficiente. Disponível via banca participante em Portugal.',
    max_amount: 1500000, min_amount: 10000,
    deadline: null,
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.eif.org/cosme', funding_type: 'garantia', region: 'todas', category: 'inovacao', cofinancing_rate: null
  },
  {
    title: 'FEI — EaSI Garantia de Microfinanciamento',
    source: 'FEI / EaSI',
    description: 'Microcrédito garantido pelo FEI para microempresas e empreendedores em desvantagem social acederem a financiamento até €25.000.',
    max_amount: 25000, min_amount: 1000,
    deadline: null,
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'startup', 'empreendedores individuais']),
    url: 'https://www.eif.org/easi', funding_type: 'emprestimo', region: 'todas', category: 'social', cofinancing_rate: null
  },

  // ─── EEA / Norway Grants ───────────────────────────────────────────────────
  {
    title: 'EEA Grants — Blue Growth (Crescimento Azul)',
    source: 'EEA Grants / Islândia, Liechtenstein, Noruega',
    description: 'Financiamento a projetos de economia do mar: aquicultura sustentável, biotecnologia marinha, energias renováveis offshore e monitorização oceânica.',
    max_amount: 1500000, min_amount: 100000,
    deadline: '2025-08-31',
    eligible_sectors: JSON.stringify(['maritime', 'aquicultura', 'biotecnologia azul', 'energia offshore', 'pesca']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.eeagrants.gov.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'maritimo', cofinancing_rate: 85
  },
  {
    title: 'EEA Grants — Inovação Empresarial',
    source: 'EEA Grants / Norway Grants',
    description: 'Financiamento a projetos de inovação empresarial em parceria com entidade norueguesa, islandesa ou liechtensteiniana.',
    max_amount: 2000000, min_amount: 150000,
    deadline: '2025-10-31',
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.eeagrants.gov.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'inovacao', cofinancing_rate: 85
  },
  {
    title: 'EEA Grants — Inovação Verde (Green Industry)',
    source: 'EEA Grants / Norway Grants',
    description: 'Apoio a projetos de inovação industrial verde: tecnologias limpas, produção mais limpa, ecodesign e economia circular em indústrias portuguesas.',
    max_amount: 3000000, min_amount: 200000,
    deadline: '2025-09-30',
    eligible_sectors: JSON.stringify(['indústria', 'ambiente', 'energia', 'tecnologias limpas']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.eeagrants.gov.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'ambiente', cofinancing_rate: 85
  },
  {
    title: 'EEA Grants — Active Citizens Fund',
    source: 'EEA Grants / Norway Grants',
    description: 'Financiamento a organizações da sociedade civil e ONGs para projetos de democracia, direitos fundamentais, inclusão social e bem-estar.',
    max_amount: 150000, min_amount: 10000,
    deadline: '2025-11-30',
    eligible_sectors: JSON.stringify(['sociedade civil', 'ONGs', 'educação cívica', 'inclusão']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.eeagrants.gov.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'social', cofinancing_rate: 90
  },
  {
    title: 'EEA Grants — Investigação em Portugal',
    source: 'EEA Grants / FCT / Norway Grants',
    description: 'Financiamento a projetos de investigação científica em parceria com entidades norueguesas. Áreas: saúde, ambiente, energia e ciências sociais.',
    max_amount: 800000, min_amount: 50000,
    deadline: '2026-01-15',
    eligible_sectors: JSON.stringify(['investigação científica', 'saúde', 'ambiente', 'energia', 'ciências sociais']),
    eligible_sizes: JSON.stringify(['universidades', 'centros I&D']),
    url: 'https://www.eeagrants.gov.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'investigacao', cofinancing_rate: 85
  },

  // ─── FEADER / PDR 2030 ────────────────────────────────────────────────────
  {
    title: 'PDR2030 — Apoio ao Investimento Agrícola (M4)',
    source: 'PDR2030 / FEADER',
    description: 'Apoio ao investimento em explorações agrícolas: modernização de infraestruturas, equipamentos, sistemas de irrigação e tecnologia de precisão.',
    max_amount: 500000, min_amount: 5000,
    deadline: '2025-12-31',
    eligible_sectors: JSON.stringify(['agricultura', 'vinha', 'olivicultura', 'horticultura', 'pecuária']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.ifap.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'agro', cofinancing_rate: 40
  },
  {
    title: 'PDR2030 — Agroindústria (M4.2)',
    source: 'PDR2030 / FEADER',
    description: 'Apoio ao investimento em transformação e comercialização de produtos agrícolas e florestais. Inclui modernização de unidades industriais agro-alimentares.',
    max_amount: 2000000, min_amount: 50000,
    deadline: '2026-03-31',
    eligible_sectors: JSON.stringify(['agro-alimentar', 'transformação agrícola', 'vinho', 'azeite', 'laticínios', 'carne']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.ifap.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'agro', cofinancing_rate: 40
  },
  {
    title: 'PDR2030 — Jovem Agricultor (M6)',
    source: 'PDR2030 / FEADER',
    description: 'Prémio de instalação para jovens agricultores com menos de 40 anos que se instalem pela primeira vez como chefe de exploração.',
    max_amount: 50000, min_amount: null,
    deadline: '2025-09-30',
    eligible_sectors: JSON.stringify(['agricultura', 'pecuária', 'horticultura', 'vinha']),
    eligible_sizes: JSON.stringify(['individual', 'micro']),
    url: 'https://www.ifap.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'agro', cofinancing_rate: 100
  },
  {
    title: 'PDR2030 — LEADER: Desenvolvimento Local (M19)',
    source: 'PDR2030 / FEADER / GAL',
    description: 'Apoio a projetos de desenvolvimento rural integrado através de Grupos de Ação Local (GAL). Valorização de recursos locais e dinamização rural.',
    max_amount: 200000, min_amount: 5000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['turismo rural', 'artesanato', 'agro-alimentar local', 'cultura', 'serviços rurais']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.portugal2020.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'agro', cofinancing_rate: 65
  },
  {
    title: 'PDR2030 — Florestação e Valorização Florestal',
    source: 'PDR2030 / FEADER / ICNF',
    description: 'Apoio à florestação com espécies autóctones, gestão florestal sustentável, prevenção de incêndios e valorização de produtos florestais não madeireiros.',
    max_amount: 300000, min_amount: 5000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['floresta', 'biomassa', 'cortiça', 'resina', 'cogumelos']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.ifap.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'agro', cofinancing_rate: 80
  },
  {
    title: 'PDR2030 — Regadio e Infraestruturas Coletivas',
    source: 'PDR2030 / FEADER',
    description: 'Apoio a infraestruturas coletivas de regadio, eletrificação e viários de acesso em zonas rurais. Melhoria de eficiência hídrica.',
    max_amount: 10000000, min_amount: 100000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['agricultura', 'regadio', 'infraestrutura rural']),
    eligible_sizes: JSON.stringify(['associações', 'cooperativas', 'municípios']),
    url: 'https://www.ifap.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'agro', cofinancing_rate: 75
  },

  // ─── FEAMPA ───────────────────────────────────────────────────────────────
  {
    title: 'FEAMPA — Aquicultura Sustentável',
    source: 'FEAMPA / DGRM',
    description: 'Apoio ao desenvolvimento da aquicultura nacional: novas unidades, modernização, introdução de espécies, aquicultura offshore e em recirculação.',
    max_amount: 1500000, min_amount: 25000,
    deadline: '2026-03-31',
    eligible_sectors: JSON.stringify(['aquicultura', 'pesca', 'maricultura']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.dgrm.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'maritimo', cofinancing_rate: 50
  },
  {
    title: 'FEAMPA — Transformação e Comercialização de Produtos da Pesca',
    source: 'FEAMPA / DGRM',
    description: 'Apoio ao investimento em indústrias de transformação de produtos da pesca e aquicultura: modernização, higiene, qualidade e rastreabilidade.',
    max_amount: 2000000, min_amount: 30000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['indústria conserveira', 'pesca', 'aquicultura', 'agro-alimentar']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.dgrm.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'maritimo', cofinancing_rate: 50
  },
  {
    title: 'FEAMPA — Portos de Pesca e Infraestrutura Marítima',
    source: 'FEAMPA / DGRM',
    description: 'Investimentos em portos de pesca, instalações de desembarque, leiloeiras e infraestrutura de apoio às comunidades piscatórias.',
    max_amount: 5000000, min_amount: 100000,
    deadline: '2026-12-31',
    eligible_sectors: JSON.stringify(['pesca', 'infraestrutura portuária', 'municípios costeiros']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.dgrm.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'maritimo', cofinancing_rate: 70
  },

  // ─── Interreg ─────────────────────────────────────────────────────────────
  {
    title: 'Interreg Atlantic Area',
    source: 'Interreg / FEDER',
    description: 'Cooperação transnacional entre regiões do Espaço Atlântico (Portugal, Espanha, França, Irlanda, Reino Unido). Temas: azul, verde, digital e conexões.',
    max_amount: 3000000, min_amount: 100000,
    deadline: '2025-09-30',
    eligible_sectors: JSON.stringify(['maritimo', 'ambiente', 'digital', 'energia', 'inovação transnacional']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.atlanticarea.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'inovacao', cofinancing_rate: 75
  },
  {
    title: 'Interreg SUDOE — Espaço Sudoeste Europeu',
    source: 'Interreg / FEDER',
    description: 'Cooperação entre regiões de Portugal, Espanha, França e Gibraltar. Foco em inovação, sustentabilidade, eficiência de recursos e integração territorial.',
    max_amount: 2000000, min_amount: 80000,
    deadline: '2025-10-31',
    eligible_sectors: JSON.stringify(['inovação', 'ambiente', 'energia', 'digital', 'cultura']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.interreg-sudoe.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'inovacao', cofinancing_rate: 75
  },
  {
    title: 'Interreg Euro-MED',
    source: 'Interreg / FEDER',
    description: 'Cooperação entre países da bacia mediterrânica: economia azul, turismo sustentável, patrimônio cultural, energia e adaptação climática.',
    max_amount: 2500000, min_amount: 100000,
    deadline: '2026-01-31',
    eligible_sectors: JSON.stringify(['mediterrânico', 'turismo', 'cultura', 'ambiente', 'energia']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://interreg-euro-med.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'inovacao', cofinancing_rate: 75
  },
  {
    title: 'Interreg Portugal-Espanha (POCTEP)',
    source: 'Interreg / FEDER',
    description: 'Cooperação transfronteiriça Portugal-Espanha: risco de incêndio, ambiente, cultura, turismo, empresas e mobilidade nas regiões de fronteira.',
    max_amount: 1500000, min_amount: 50000,
    deadline: '2025-12-15',
    eligible_sectors: JSON.stringify(['todos os setores nas regiões fronteiriças']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.poctep.eu', funding_type: 'fundo_perdido', region: 'nacional', category: 'inovacao', cofinancing_rate: 75
  },
  {
    title: 'Interreg Europe — Aprendizagem entre Regiões',
    source: 'Interreg / FEDER',
    description: 'Projetos de aprendizagem inter-regional: troca de boas práticas de política regional entre autoridades públicas e organizações de desenvolvimento.',
    max_amount: 2000000, min_amount: 100000,
    deadline: '2026-04-01',
    eligible_sectors: JSON.stringify(['políticas públicas', 'inovação regional', 'ambiente', 'economia digital']),
    eligible_sizes: JSON.stringify(['autoridades públicas', 'organismos de desenvolvimento']),
    url: 'https://www.interregeurope.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'inovacao', cofinancing_rate: 80
  },

  // ─── FCT / Investigação Nacional ──────────────────────────────────────────
  {
    title: 'FCT — Projetos de Investigação Científica e Tecnológica',
    source: 'FCT / Fundação para a Ciência e Tecnologia',
    description: 'Financiamento a projetos de investigação fundamental e aplicada em todas as áreas do conhecimento por equipas de investigadores em Portugal.',
    max_amount: 250000, min_amount: 50000,
    deadline: '2025-10-15',
    eligible_sectors: JSON.stringify(['todas as áreas científicas']),
    eligible_sizes: JSON.stringify(['universidades', 'laboratórios', 'centros I&D']),
    url: 'https://www.fct.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'investigacao', cofinancing_rate: 100
  },
  {
    title: 'FCT — Bolsas de Doutoramento (BD)',
    source: 'FCT',
    description: 'Bolsas individuais para realização de doutoramento em Portugal ou no estrangeiro em todas as áreas científicas.',
    max_amount: 80000, min_amount: null,
    deadline: '2025-04-30',
    eligible_sectors: JSON.stringify(['todas as áreas científicas']),
    eligible_sizes: JSON.stringify(['investigadores']),
    url: 'https://www.fct.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'investigacao', cofinancing_rate: 100
  },
  {
    title: 'FCT — MIT Portugal / Carnegie Mellon / Austin',
    source: 'FCT / Programas Internacionais',
    description: 'Programas de doutoramento e investigação em parceria com MIT, Carnegie Mellon, Texas e outros parceiros internacionais de elite.',
    max_amount: 100000, min_amount: null,
    deadline: '2025-05-31',
    eligible_sectors: JSON.stringify(['engenharia', 'tecnologia', 'bioengenharia', 'ciência computacional']),
    eligible_sizes: JSON.stringify(['investigadores', 'universidades']),
    url: 'https://www.fct.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'investigacao', cofinancing_rate: 100
  },

  // ─── AICEP ────────────────────────────────────────────────────────────────
  {
    title: 'AICEP — Portugal Exporta',
    source: 'AICEP Portugal Global',
    description: 'Apoio à internacionalização de empresas portuguesas: participação em feiras internacionais, missões empresariais, promoção e marketing internacional.',
    max_amount: 100000, min_amount: 5000,
    deadline: '2025-08-31',
    eligible_sectors: JSON.stringify(['todos os setores exportadores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.portugalglobal.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'internacionalizacao', cofinancing_rate: 50
  },
  {
    title: 'AICEP — International Growth (Linha de Crédito)',
    source: 'AICEP / Banco de Fomento',
    description: 'Linha de crédito para projetos de internacionalização de PMEs: abertura de mercados, investimento no exterior, joint ventures internacionais.',
    max_amount: 5000000, min_amount: 100000,
    deadline: null,
    eligible_sectors: JSON.stringify(['todos os setores com potencial exportador']),
    eligible_sizes: JSON.stringify(['pequena', 'média']),
    url: 'https://www.portugalglobal.pt', funding_type: 'emprestimo', region: 'nacional', category: 'internacionalizacao', cofinancing_rate: null
  },

  // ─── Turismo de Portugal ───────────────────────────────────────────────────
  {
    title: 'Turismo de Portugal — Fundo Ambiental Turismo',
    source: 'Turismo de Portugal / PT2030',
    description: 'Apoio a projetos de turismo sustentável: certificação ambiental de alojamentos, eficiência energética em unidades turísticas e turismo de natureza.',
    max_amount: 500000, min_amount: 25000,
    deadline: '2025-11-30',
    eligible_sectors: JSON.stringify(['hotelaria', 'turismo', 'animação turística', 'restauração']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.turismodeportugal.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'turismo', cofinancing_rate: 45
  },
  {
    title: 'Turismo de Portugal — Linha Turismo Acessível',
    source: 'Turismo de Portugal',
    description: 'Apoio a investimentos para tornar empreendimentos turísticos mais acessíveis a pessoas com mobilidade reduzida e outras necessidades especiais.',
    max_amount: 200000, min_amount: 10000,
    deadline: '2025-10-31',
    eligible_sectors: JSON.stringify(['hotelaria', 'animação turística', 'restauração', 'alojamento local']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.turismodeportugal.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'turismo', cofinancing_rate: 75
  },
  {
    title: 'Turismo de Portugal — Programa de Valorização de Recursos Endógenos',
    source: 'Turismo de Portugal / PT2030',
    description: 'Apoio a projetos que criem ou valorizem ofertas turísticas baseadas em recursos endógenos: gastronomia, artesanato, romarias, paisagem.',
    max_amount: 300000, min_amount: 15000,
    deadline: '2026-03-31',
    eligible_sectors: JSON.stringify(['turismo cultural', 'turismo rural', 'gastronomia', 'artesanato']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.turismodeportugal.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'turismo', cofinancing_rate: 50
  },

  // ─── IEFP / Emprego ───────────────────────────────────────────────────────
  {
    title: 'IEFP — Apoios à Contratação (Medida Emprego)',
    source: 'IEFP / FSE+',
    description: 'Apoio financeiro a empresas que contratem desempregados inscritos no IEFP: jovens, desempregados de longa duração e grupos vulneráveis.',
    max_amount: 25000, min_amount: null,
    deadline: null,
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.iefp.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'emprego', cofinancing_rate: 100
  },
  {
    title: 'IEFP — Estágios Profissionais',
    source: 'IEFP / FSE+',
    description: 'Apoio a empresas que acolham estagiários: comparticipação da bolsa de estágio até 80% para jovens até 30 anos e desempregados.',
    max_amount: 20000, min_amount: null,
    deadline: null,
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.iefp.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'emprego', cofinancing_rate: 80
  },
  {
    title: 'IEFP — Formação Profissional de Ativos',
    source: 'IEFP / FSE+',
    description: 'Financiamento à formação profissional de trabalhadores empregados: upskilling e reskilling em competências digitais, técnicas e transversais.',
    max_amount: 50000, min_amount: null,
    deadline: null,
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.iefp.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'formacao', cofinancing_rate: 70
  },
  {
    title: 'PT2030 — FSE+ Qualificação de Adultos',
    source: 'PT2030 / FSE+ / DGAE',
    description: 'Financiamento a cursos EFA, RVCC e programas de qualificação de adultos com baixas qualificações para reconhecimento de competências.',
    max_amount: 500000, min_amount: 20000,
    deadline: '2026-12-31',
    eligible_sectors: JSON.stringify(['educação e formação', 'todos']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.fse.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'formacao', cofinancing_rate: 85
  },

  // ─── Espaço / Space ───────────────────────────────────────────────────────
  {
    title: 'ESA BIC Portugal — Incubação de Startups Espaciais',
    source: 'ESA / Portugal Space / IAPMEI',
    description: 'Incubação de startups com tecnologia espacial ou que apliquem dados/tecnologias espaciais em outras indústrias (downstream applications).',
    max_amount: 50000, min_amount: null,
    deadline: '2025-11-30',
    eligible_sectors: JSON.stringify(['espacial', 'satélites', 'observação terra', 'telecomunicações', 'GPS', 'drones']),
    eligible_sizes: JSON.stringify(['startup', 'micro']),
    url: 'https://portlandspace.pt/bic', funding_type: 'misto', region: 'nacional', category: 'espacial', cofinancing_rate: 100
  },
  {
    title: 'EU Space Programme — Acesso a Dados Copernicus',
    source: 'Comissão Europeia / ESA',
    description: 'Acesso gratuito a dados de satélite Copernicus para desenvolvimento de aplicações: monitorização ambiental, agricultura de precisão, gestão de riscos.',
    max_amount: 0, min_amount: 0,
    deadline: null,
    eligible_sectors: JSON.stringify(['agricultura', 'ambiente', 'urbanismo', 'energia', 'seguros', 'turismo']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.copernicus.eu', funding_type: 'voucher', region: 'todas', category: 'espacial', cofinancing_rate: 100
  },

  // ─── Fundações e Programas Privados ───────────────────────────────────────
  {
    title: 'Fundação Calouste Gulbenkian — Programas de Arte e Cultura',
    source: 'Fundação Calouste Gulbenkian',
    description: 'Apoios a projetos culturais e artísticos, criação artística, formação cultural e cooperação internacional lusófona.',
    max_amount: 100000, min_amount: 5000,
    deadline: '2025-10-01',
    eligible_sectors: JSON.stringify(['cultura', 'artes', 'música', 'teatro', 'dança', 'literatura']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://gulbenkian.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'cultura', cofinancing_rate: 80
  },
  {
    title: 'Fundação Calouste Gulbenkian — Programa Inovação Social',
    source: 'Fundação Calouste Gulbenkian',
    description: 'Apoio a projetos de inovação social com impacto comprovado: saúde, educação, inclusão, bem-estar e desenvolvimento de comunidades.',
    max_amount: 200000, min_amount: 20000,
    deadline: '2025-09-15',
    eligible_sectors: JSON.stringify(['inovação social', 'educação', 'saúde', 'inclusão', 'comunidades']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://gulbenkian.pt/inovacao-social', funding_type: 'fundo_perdido', region: 'nacional', category: 'social', cofinancing_rate: 80
  },
  {
    title: 'BPI La Caixa — Inovação Social',
    source: 'Fundação BPI / La Caixa',
    description: 'Apoio a projetos de inovação social com impacto nas comunidades. Financiamento a fundo perdido com acompanhamento e mentoria.',
    max_amount: 150000, min_amount: 15000,
    deadline: '2025-07-15',
    eligible_sectors: JSON.stringify(['inovação social', 'educação', 'saúde', 'ambiente', 'inclusão']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://fundacaobpi.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'social', cofinancing_rate: 100
  },
  {
    title: 'Fundação Champalimaud — Research Grants',
    source: 'Fundação Champalimaud',
    description: 'Financiamento a investigação em neurociências e oncologia. Apoio a projetos translacionais com potencial clínico.',
    max_amount: 1500000, min_amount: null,
    deadline: '2025-12-01',
    eligible_sectors: JSON.stringify(['saúde', 'neurociências', 'oncologia', 'biotecnologia']),
    eligible_sizes: JSON.stringify(['universidades', 'centros I&D', 'biotech']),
    url: 'https://fchampalimaud.org', funding_type: 'fundo_perdido', region: 'nacional', category: 'saude', cofinancing_rate: 100
  },
  {
    title: 'EDP Ventures — Investimento em Cleantech',
    source: 'EDP Ventures',
    description: 'Investimento de capital de risco em startups de energia limpa, mobilidade elétrica, eficiência energética e tecnologias low-carbon.',
    max_amount: 3000000, min_amount: 200000,
    deadline: null,
    eligible_sectors: JSON.stringify(['energia renovável', 'cleantech', 'mobilidade elétrica', 'storage', 'hidrogénio']),
    eligible_sizes: JSON.stringify(['startup', 'micro', 'pequena']),
    url: 'https://edpventures.com', funding_type: 'equity', region: 'nacional', category: 'energia', cofinancing_rate: null
  },
  {
    title: 'Portugal Ventures — Capital de Risco',
    source: 'Portugal Ventures / IFD',
    description: 'Investimento de capital de risco em startups tecnológicas e inovadoras em fase de arranque e crescimento. Tickets entre €250K e €2M.',
    max_amount: 2000000, min_amount: 250000,
    deadline: null,
    eligible_sectors: JSON.stringify(['tecnologia', 'digital', 'biotech', 'cleantech', 'medtech']),
    eligible_sizes: JSON.stringify(['startup', 'micro', 'pequena']),
    url: 'https://www.portugalmais.pt', funding_type: 'equity', region: 'nacional', category: 'inovacao', cofinancing_rate: null
  },

  // ─── Fundo de Transição Justa (FTJ) ──────────────────────────────────────
  {
    title: 'Fundo de Transição Justa — Diversificação Económica',
    source: 'FTJ / FEDER / PT2030',
    description: 'Apoio a investimentos produtivos e criação de emprego em territórios afetados pela transição energética (ex: Alentejo interior e Setúbal/Sines).',
    max_amount: 3000000, min_amount: 100000,
    deadline: '2027-12-31',
    eligible_sectors: JSON.stringify(['indústria', 'energia renovável', 'tecnologia', 'serviços', 'turismo']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.compete2030.pt/ftj', funding_type: 'fundo_perdido', region: 'alentejo', category: 'inovacao', cofinancing_rate: 65
  },
  {
    title: 'Fundo de Transição Justa — Investigação e Inovação Limpa',
    source: 'FTJ / PT2030',
    description: 'I&D e inovação em tecnologias limpas como alternativa a setores em declínio: hidrogénio verde, geotermia, eficiência industrial.',
    max_amount: 2000000, min_amount: 100000,
    deadline: '2027-12-31',
    eligible_sectors: JSON.stringify(['hidrogénio', 'geotermia', 'economia circular', 'cleantech']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.compete2030.pt/ftj', funding_type: 'fundo_perdido', region: 'alentejo', category: 'energia', cofinancing_rate: 70
  },

  // ─── Regiões Autónomas ────────────────────────────────────────────────────
  {
    title: 'POSEI — Açores e Madeira (Medidas Específicas Agrícolas)',
    source: 'Comissão Europeia / FEAGA',
    description: 'Medidas específicas para compensar as desvantagens dos produtores agrícolas nas Regiões Ultraperiféricas portuguesas (Açores e Madeira).',
    max_amount: 500000, min_amount: null,
    deadline: null,
    eligible_sectors: JSON.stringify(['agricultura', 'pecuária', 'vinicultura', 'horticultura']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.ifap.pt', funding_type: 'fundo_perdido', region: 'acores', category: 'agro', cofinancing_rate: 100
  },
  {
    title: 'PRRA — Plano de Recuperação e Resiliência dos Açores',
    source: 'PRR / Governo dos Açores',
    description: 'Investimentos específicos para recuperação e resiliência do arquipélago dos Açores: transição digital, sustentabilidade e coesão social.',
    max_amount: 2000000, min_amount: 50000,
    deadline: '2026-06-30',
    eligible_sectors: JSON.stringify(['todos os setores nos Açores']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.azores.gov.pt', funding_type: 'fundo_perdido', region: 'acores', category: 'inovacao', cofinancing_rate: 85
  },
  {
    title: 'PRAM — Programa Regional da Madeira (PT2030)',
    source: 'PT2030 / FEDER / Governo da Madeira',
    description: 'Programa regional de desenvolvimento da Madeira: competitividade empresarial, inovação, ambiente e coesão social com cofinanciamento europeu.',
    max_amount: 1500000, min_amount: 25000,
    deadline: '2026-12-31',
    eligible_sectors: JSON.stringify(['todos os setores na Madeira']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.arditi.pt', funding_type: 'fundo_perdido', region: 'madeira', category: 'inovacao', cofinancing_rate: 85
  },

  // ─── Banco de Fomento / Instrumentos Financeiros ──────────────────────────
  {
    title: 'Banco de Fomento — Linha Inovação e Digitalização',
    source: 'Banco de Fomento Portugal',
    description: 'Linha de crédito bonificada para PMEs investirem em digitalização, automatização e projetos de inovação. Taxa de juro reduzida garantida pelo Estado.',
    max_amount: 2000000, min_amount: 25000,
    deadline: null,
    eligible_sectors: JSON.stringify(['todos os setores']),
    eligible_sizes: JSON.stringify(['micro', 'pequena', 'média']),
    url: 'https://www.bfp.pt', funding_type: 'emprestimo', region: 'nacional', category: 'digitalizacao', cofinancing_rate: null
  },
  {
    title: 'Banco de Fomento — Fundo de Capital de Risco Portugal 2030',
    source: 'Banco de Fomento / IFD',
    description: 'Fundo de fundos que investe em fundos de capital de risco que apoiam startups e scale-ups portuguesas inovadoras.',
    max_amount: 5000000, min_amount: 500000,
    deadline: null,
    eligible_sectors: JSON.stringify(['tecnologia', 'digital', 'cleantech', 'biotech', 'todos']),
    eligible_sizes: JSON.stringify(['startup', 'micro', 'pequena']),
    url: 'https://www.bfp.pt', funding_type: 'equity', region: 'nacional', category: 'inovacao', cofinancing_rate: null
  },

  // ─── FSE+ / Social ────────────────────────────────────────────────────────
  {
    title: 'PT2030 — FSE+ Inclusão Social e Combate à Pobreza',
    source: 'PT2030 / FSE+ / EAPN',
    description: 'Financiamento a projetos de inclusão social: integração de grupos vulneráveis, luta contra a pobreza, acesso a serviços básicos.',
    max_amount: 500000, min_amount: 20000,
    deadline: '2026-12-31',
    eligible_sectors: JSON.stringify(['social', 'ONGs', 'IPSS', 'municípios']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.fse.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'social', cofinancing_rate: 85
  },
  {
    title: 'PT2030 — FSE+ Saúde e Cuidados de Longa Duração',
    source: 'PT2030 / FSE+ / SNS',
    description: 'Projetos de melhoria dos serviços de saúde, prevenção, cuidados continuados e telemedicina para reforço do SNS.',
    max_amount: 1000000, min_amount: 50000,
    deadline: '2026-12-31',
    eligible_sectors: JSON.stringify(['saúde', 'cuidados sociais', 'telemedicina', 'envelhecimento ativo']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.fse.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'saude', cofinancing_rate: 85
  },

  // ─── Energia e Hidrogénio ─────────────────────────────────────────────────
  {
    title: 'DGEG — Fundo para a Sustentabilidade Energética',
    source: 'DGEG / Fundo Sustentabilidade Sistémica Energética',
    description: 'Apoio a projetos de eficiência energética, energias renováveis, mobilidade elétrica e comunidades de energia em edifícios públicos e privados.',
    max_amount: 500000, min_amount: 10000,
    deadline: '2025-12-31',
    eligible_sectors: JSON.stringify(['energia', 'construção', 'transportes', 'indústria', 'municípios']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.dgeg.gov.pt', funding_type: 'fundo_perdido', region: 'nacional', category: 'energia', cofinancing_rate: 50
  },
  {
    title: 'Innovation Fund — Hidrogénio Limpo e Renováveis Offshore',
    source: 'Comissão Europeia / CINEA / EU ETS',
    description: 'Fundo de inovação da UE para projetos de grande escala em tecnologias de baixo carbono: hidrogénio limpo, CCS, renováveis inovadoras e baterias.',
    max_amount: 100000000, min_amount: 7500000,
    deadline: '2025-11-12',
    eligible_sectors: JSON.stringify(['hidrogénio', 'CCS', 'renováveis', 'baterias', 'processos industriais']),
    eligible_sizes: JSON.stringify(['grande', 'consórcios']),
    url: 'https://cinea.ec.europa.eu/innovation-fund', funding_type: 'fundo_perdido', region: 'todas', category: 'energia', cofinancing_rate: 60
  },
  {
    title: 'Horizonte Europa — Missão Hidrogénio e Energia Limpa',
    source: 'Comissão Europeia / HEU / Clean Hydrogen JU',
    description: 'Financiamento a projetos de I&D e demonstração de tecnologias de hidrogénio: eletrolisadores, pilhas de combustível, armazenamento e infraestrutura.',
    max_amount: 15000000, min_amount: 1000000,
    deadline: '2025-09-25',
    eligible_sectors: JSON.stringify(['hidrogénio', 'energia', 'indústria', 'transportes', 'manufatura']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.clean-hydrogen.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'energia', cofinancing_rate: 70
  },

  // ─── Saúde / Medtech ──────────────────────────────────────────────────────
  {
    title: 'EU4Health — Segurança Sanitária e Acesso a Medicamentos',
    source: 'Comissão Europeia / EU4Health / HaDEA',
    description: 'Financiamento a ações de saúde pública: preparação para crises sanitárias, acesso equitativo a medicamentos, saúde digital e promoção da saúde.',
    max_amount: 3000000, min_amount: 100000,
    deadline: '2025-10-30',
    eligible_sectors: JSON.stringify(['saúde', 'farmácia', 'saúde digital', 'ONGs saúde', 'SNS']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://health.ec.europa.eu/eu4health', funding_type: 'fundo_perdido', region: 'todas', category: 'saude', cofinancing_rate: 60
  },
  {
    title: 'IHI — Iniciativa de Medicamentos Inovadores',
    source: 'Comissão Europeia / IHI / Indústria Farmacêutica',
    description: 'Parceria público-privada para investigação e desenvolvimento de medicamentos: doenças raras, resistência antimicrobiana, saúde mental, oncologia.',
    max_amount: 20000000, min_amount: 1000000,
    deadline: '2025-11-27',
    eligible_sectors: JSON.stringify(['pharma', 'biotech', 'medtech', 'saúde', 'universidades']),
    eligible_sizes: JSON.stringify(['todos']),
    url: 'https://www.ihi.europa.eu', funding_type: 'fundo_perdido', region: 'todas', category: 'saude', cofinancing_rate: 100
  }
]

// Enrichment metadata: maps partial title keywords → new fields
const enrichmentMap = [
  { match: 'SI Inovação Empresarial', trl_min: 4, trl_max: 9, eligible_entities: ['pme', 'startup', 'empresa'], eligible_countries: ['PT'], funding_rate: 45, consortium_required: 0, call_status: 'open', history_years: [2018,2019,2020,2021,2022,2023,2024] },
  { match: 'SI Qualificação', trl_min: null, trl_max: null, eligible_entities: ['pme'], eligible_countries: ['PT'], funding_rate: 50, consortium_required: 0, call_status: 'open', history_years: [2019,2021,2023,2024] },
  { match: 'SI Internacionalização', trl_min: null, trl_max: null, eligible_entities: ['pme', 'empresa'], eligible_countries: ['PT'], funding_rate: 50, consortium_required: 0, call_status: 'open', history_years: [2020,2022,2024] },
  { match: 'Investigação & Desenvolvimento', trl_min: 1, trl_max: 7, eligible_entities: ['pme', 'grande empresa', 'universidade', 'centro investigacao'], eligible_countries: ['PT'], funding_rate: 80, consortium_required: 0, call_status: 'open', history_years: [2019,2021,2023,2024] },
  { match: 'Empreendedorismo Qualificado', trl_min: 3, trl_max: 9, eligible_entities: ['startup', 'micro'], eligible_countries: ['PT'], funding_rate: 75, consortium_required: 0, call_status: 'open', history_years: [2020,2022,2024] },
  { match: 'Eficiência Energética em PME', trl_min: 5, trl_max: 9, eligible_entities: ['pme'], eligible_countries: ['PT'], funding_rate: 40, consortium_required: 0, call_status: 'open', history_years: [2021,2023,2024] },
  { match: 'Capitalizar', trl_min: null, trl_max: null, eligible_entities: ['pme', 'startup'], eligible_countries: ['PT'], funding_rate: 85, consortium_required: 0, call_status: 'open', history_years: [2022,2023,2024] },
  { match: 'Agendas de Inovação', trl_min: 3, trl_max: 9, eligible_entities: ['grande empresa', 'consorcio', 'pme'], eligible_countries: ['PT'], funding_rate: 70, consortium_required: 1, call_status: 'open', history_years: [2022,2023] },
  { match: 'Startup Voucher', trl_min: 1, trl_max: 5, eligible_entities: ['startup', 'empreendedor individual'], eligible_countries: ['PT'], funding_rate: 100, consortium_required: 0, call_status: 'open', history_years: [2016,2018,2020,2022,2023,2024] },
  { match: 'Vales Inovação', trl_min: 3, trl_max: 7, eligible_entities: ['pme', 'micro'], eligible_countries: ['PT'], funding_rate: 75, consortium_required: 0, call_status: 'open', history_years: [2019,2021,2023,2024] },
  { match: 'EIC Accelerator', trl_min: 5, trl_max: 8, eligible_entities: ['startup', 'pme'], eligible_countries: ['EU'], funding_rate: 70, consortium_required: 0, call_status: 'open', history_years: [2019,2020,2021,2022,2023,2024] },
  { match: 'EIC Pathfinder', trl_min: 1, trl_max: 4, eligible_entities: ['universidade', 'centro investigacao', 'pme', 'startup'], eligible_countries: ['EU'], funding_rate: 100, consortium_required: 1, call_status: 'open', history_years: [2020,2021,2022,2023,2024] },
  { match: 'ERC', trl_min: 1, trl_max: 3, eligible_entities: ['investigador individual', 'universidade'], eligible_countries: ['EU'], funding_rate: 100, consortium_required: 0, call_status: 'open', history_years: [2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024] },
  { match: 'MSCA', trl_min: 1, trl_max: 5, eligible_entities: ['investigador individual', 'universidade', 'empresa'], eligible_countries: ['EU'], funding_rate: 100, consortium_required: 1, call_status: 'open', history_years: [2014,2016,2018,2020,2022,2024] },
  { match: 'LIFE', trl_min: 4, trl_max: 9, eligible_entities: ['empresa', 'ong', 'municipio', 'universidade'], eligible_countries: ['EU'], funding_rate: 60, consortium_required: 0, call_status: 'open', history_years: [2014,2016,2018,2020,2022,2024] },
  { match: 'Digital Europe', trl_min: 6, trl_max: 9, eligible_entities: ['empresa', 'administracao publica', 'universidade'], eligible_countries: ['EU'], funding_rate: 50, consortium_required: 1, call_status: 'open', history_years: [2021,2022,2023,2024] },
  { match: 'EIC Transition', trl_min: 3, trl_max: 6, eligible_entities: ['startup', 'pme', 'universidade'], eligible_countries: ['EU'], funding_rate: 100, consortium_required: 0, call_status: 'open', history_years: [2021,2022,2023,2024] },
  { match: 'ANI — P2020 I&DT', trl_min: 1, trl_max: 7, eligible_entities: ['pme', 'grande empresa', 'universidade'], eligible_countries: ['PT'], funding_rate: 75, consortium_required: 1, call_status: 'closed', expected_next_open: '2025-09-01', history_years: [2015,2017,2019,2021,2023] },
  { match: 'PRR — Infraestruturas Científicas', trl_min: 1, trl_max: 5, eligible_entities: ['universidade', 'centro investigacao', 'laboratorio'], eligible_countries: ['PT'], funding_rate: 100, consortium_required: 0, call_status: 'open', history_years: [2022,2023,2024] },
  { match: 'InvestEU', trl_min: 5, trl_max: 9, eligible_entities: ['pme', 'grande empresa', 'infraestrutura'], eligible_countries: ['EU'], funding_rate: null, consortium_required: 0, call_status: 'open', history_years: [2021,2022,2023,2024] },
  { match: 'EEA Grants', trl_min: null, trl_max: null, eligible_entities: ['ong', 'municipio', 'empresa', 'universidade'], eligible_countries: ['PT'], funding_rate: 85, consortium_required: 1, call_status: 'upcoming', expected_next_open: '2025-10-01', history_years: [2009,2014,2019,2024] },
  { match: 'Creative Europe', trl_min: null, trl_max: null, eligible_entities: ['empresa cultural', 'ong', 'municipio', 'associacao'], eligible_countries: ['EU'], funding_rate: 70, consortium_required: 1, call_status: 'open', history_years: [2014,2018,2021,2022,2023,2024] },
  { match: 'Erasmus+', trl_min: null, trl_max: null, eligible_entities: ['escola', 'universidade', 'empresa', 'ong', 'municipio'], eligible_countries: ['EU'], funding_rate: 80, consortium_required: 1, call_status: 'open', history_years: [2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024] },
  { match: 'CEF', trl_min: 6, trl_max: 9, eligible_entities: ['empresa', 'administracao publica', 'consorcio'], eligible_countries: ['EU'], funding_rate: 50, consortium_required: 0, call_status: 'open', history_years: [2014,2018,2021,2022,2023,2024] },
  { match: 'Interreg', trl_min: null, trl_max: null, eligible_entities: ['empresa', 'municipio', 'universidade', 'ong'], eligible_countries: ['EU','PT','ES','FR'], funding_rate: 75, consortium_required: 1, call_status: 'open', history_years: [2014,2018,2021,2022,2023,2024] },
  { match: 'FEADER', trl_min: null, trl_max: null, eligible_entities: ['agricultor', 'empresa agro', 'municipio rural', 'cooperativa'], eligible_countries: ['PT'], funding_rate: 50, consortium_required: 0, call_status: 'open', history_years: [2015,2017,2019,2021,2023,2024] },
  { match: 'FEAMPA', trl_min: null, trl_max: null, eligible_entities: ['pescador', 'empresa maritima', 'municipio costeiro', 'cooperativa pesca'], eligible_countries: ['PT'], funding_rate: 50, consortium_required: 0, call_status: 'open', history_years: [2015,2017,2019,2021,2023,2024] },
  { match: 'FCT', trl_min: 1, trl_max: 4, eligible_entities: ['investigador individual', 'universidade', 'laboratorio'], eligible_countries: ['PT'], funding_rate: 100, consortium_required: 0, call_status: 'open', history_years: [2019,2020,2021,2022,2023,2024] },
  { match: 'AICEP', trl_min: null, trl_max: null, eligible_entities: ['pme', 'grande empresa'], eligible_countries: ['PT'], funding_rate: 50, consortium_required: 0, call_status: 'open', history_years: [2019,2021,2022,2023,2024] },
  { match: 'Turismo de Portugal', trl_min: null, trl_max: null, eligible_entities: ['empresa turismo', 'pme', 'micro'], eligible_countries: ['PT'], funding_rate: 45, consortium_required: 0, call_status: 'open', history_years: [2019,2021,2022,2023,2024] },
  { match: 'IEFP', trl_min: null, trl_max: null, eligible_entities: ['empresa', 'entidade formadora', 'municipio'], eligible_countries: ['PT'], funding_rate: 80, consortium_required: 0, call_status: 'open', history_years: [2018,2019,2020,2021,2022,2023,2024] },
  { match: 'ESA BIC', trl_min: 1, trl_max: 6, eligible_entities: ['startup', 'micro'], eligible_countries: ['PT'], funding_rate: 100, consortium_required: 0, call_status: 'open', history_years: [2016,2018,2020,2022,2024] },
  { match: 'Portugal Ventures', trl_min: 4, trl_max: 9, eligible_entities: ['startup', 'micro', 'pequena empresa'], eligible_countries: ['PT'], funding_rate: null, consortium_required: 0, call_status: 'open', history_years: [] },
  { match: 'Banco de Fomento', trl_min: null, trl_max: null, eligible_entities: ['pme', 'startup', 'empresa'], eligible_countries: ['PT'], funding_rate: null, consortium_required: 0, call_status: 'open', history_years: [] },
  { match: 'FSE+', trl_min: null, trl_max: null, eligible_entities: ['ong', 'ipss', 'municipio', 'empresa', 'entidade formadora'], eligible_countries: ['PT'], funding_rate: 85, consortium_required: 0, call_status: 'open', history_years: [2015,2017,2019,2021,2022,2023,2024] },
  { match: 'Fundo Ambiental', trl_min: null, trl_max: null, eligible_entities: ['empresa', 'municipio', 'ong', 'particular'], eligible_countries: ['PT'], funding_rate: 50, consortium_required: 0, call_status: 'open', history_years: [2019,2021,2022,2023,2024] },
  { match: 'Fundo de Transição Justa', trl_min: 3, trl_max: 9, eligible_entities: ['empresa', 'municipio', 'entidade publica'], eligible_countries: ['PT'], funding_rate: 65, consortium_required: 0, call_status: 'open', history_years: [2022,2023,2024] },
  { match: 'IHI', trl_min: 1, trl_max: 6, eligible_entities: ['empresa pharma', 'universidade', 'hospital', 'biotech'], eligible_countries: ['EU'], funding_rate: 100, consortium_required: 1, call_status: 'open', history_years: [2021,2022,2023,2024] },
]

function enrichGrants() {
  const allGrants = db.prepare('SELECT id, title FROM grants').all()
  const update = db.prepare(`
    UPDATE grants SET
      trl_min = COALESCE(trl_min, @trl_min),
      trl_max = COALESCE(trl_max, @trl_max),
      eligible_entities = COALESCE(eligible_entities, @eligible_entities),
      eligible_countries = COALESCE(eligible_countries, @eligible_countries),
      funding_rate = COALESCE(funding_rate, @funding_rate),
      consortium_required = COALESCE(consortium_required, @consortium_required),
      call_status = COALESCE(NULLIF(call_status,''), @call_status),
      expected_next_open = COALESCE(expected_next_open, @expected_next_open),
      history_years = COALESCE(NULLIF(history_years,''), @history_years)
    WHERE id = @id
  `)
  let enriched = 0
  for (const grant of allGrants) {
    for (const rule of enrichmentMap) {
      if (grant.title.toLowerCase().includes(rule.match.toLowerCase())) {
        update.run({
          id: grant.id,
          trl_min: rule.trl_min ?? null,
          trl_max: rule.trl_max ?? null,
          eligible_entities: JSON.stringify(rule.eligible_entities || []),
          eligible_countries: JSON.stringify(rule.eligible_countries || []),
          funding_rate: rule.funding_rate ?? null,
          consortium_required: rule.consortium_required ?? 0,
          call_status: rule.call_status || 'open',
          expected_next_open: rule.expected_next_open || null,
          history_years: JSON.stringify(rule.history_years || [])
        })
        enriched++
        break
      }
    }
  }
  if (enriched > 0) console.log(`Enriched ${enriched} grants with TRL/entities/countries/status`)
}

function seedGrants() {
  // Load full export (1260+ grants) if available, otherwise fall back to hardcoded list
  let allGrants = grants
  try {
    const exportPath = require('path').join(__dirname, 'grants-export.json')
    if (require('fs').existsSync(exportPath)) {
      allGrants = JSON.parse(require('fs').readFileSync(exportPath, 'utf8'))
    }
  } catch (e) { /* use hardcoded fallback */ }

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO grants (
      title, source, description, max_amount, min_amount, deadline,
      eligible_sectors, eligible_sizes, eligible_entities, eligible_countries,
      url, is_active, funding_type, funding_rate, region, category, cofinancing_rate,
      trl_min, trl_max, consortium_required, call_status, expected_next_open,
      history_years, ai_relevance_score, ai_relevance_reason
    ) VALUES (
      @title, @source, @description, @max_amount, @min_amount, @deadline,
      @eligible_sectors, @eligible_sizes, @eligible_entities, @eligible_countries,
      @url, @is_active, @funding_type, @funding_rate, @region, @category, @cofinancing_rate,
      @trl_min, @trl_max, @consortium_required, @call_status, @expected_next_open,
      @history_years, @ai_relevance_score, @ai_relevance_reason
    )
  `)
  const upsertMany = db.transaction((rows) => {
    let added = 0
    for (const row of rows) {
      const r = upsert.run({
        title: row.title, source: row.source, description: row.description,
        max_amount: row.max_amount ?? null, min_amount: row.min_amount ?? null,
        deadline: row.deadline ?? null,
        eligible_sectors: Array.isArray(row.eligible_sectors) ? JSON.stringify(row.eligible_sectors) : (row.eligible_sectors ?? '[]'),
        eligible_sizes: Array.isArray(row.eligible_sizes) ? JSON.stringify(row.eligible_sizes) : (row.eligible_sizes ?? '[]'),
        eligible_entities: Array.isArray(row.eligible_entities) ? JSON.stringify(row.eligible_entities) : (row.eligible_entities ?? '[]'),
        eligible_countries: Array.isArray(row.eligible_countries) ? JSON.stringify(row.eligible_countries) : (row.eligible_countries ?? '[]'),
        url: row.url ?? null, is_active: row.is_active ?? 1,
        funding_type: row.funding_type ?? null, funding_rate: row.funding_rate ?? null,
        region: row.region ?? 'todas', category: row.category ?? null,
        cofinancing_rate: row.cofinancing_rate ?? null,
        trl_min: row.trl_min ?? null, trl_max: row.trl_max ?? null,
        consortium_required: row.consortium_required ?? 0,
        call_status: row.call_status ?? 'open',
        expected_next_open: row.expected_next_open ?? null,
        history_years: Array.isArray(row.history_years) ? JSON.stringify(row.history_years) : (row.history_years ?? '[]'),
        ai_relevance_score: row.ai_relevance_score ?? null,
        ai_relevance_reason: row.ai_relevance_reason ?? null
      })
      if (r.changes > 0) added++
    }
    return added
  })
  const added = upsertMany(allGrants)
  if (added > 0) console.log(`Seeded ${added} new grants (${allGrants.length} total in seed)`)
  if (allGrants === grants) enrichGrants()
}

module.exports = { seedGrants }
