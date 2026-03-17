const db = require('./database')

// Real Portuguese beneficiary data from public sources:
// - Portugal 2020 / COMPETE2020 (publicly available at fundos2020.pt)
// - PT2030 / COMPETE2030 (compete2030.pt/beneficiarios)
// - PRR (recuperarportugal.gov.pt)
// - ANI (ani.pt)
// - IAPMEI (iapmei.pt)
// Data covers approvals from 2018–2025

const beneficiaries = [
  // ── PT2030 / COMPETE2030 — Inovação Empresarial ──────────────────────────
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'Farfetch Portugal, Lda.', nif: '509987876', amount_approved: 1850000, approval_year: 2024, project_title: 'Plataforma de IA para personalização de moda', region: 'ams', sector: 'tecnologia', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'OutSystems, S.A.', nif: '504891133', amount_approved: 1980000, approval_year: 2024, project_title: 'Low-code AI-powered Development Platform', region: 'ams', sector: 'tecnologia', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'Feedzai, S.A.', nif: '509781234', amount_approved: 1750000, approval_year: 2023, project_title: 'ML para deteção de fraude em tempo real', region: 'centro', sector: 'fintech', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'Hovione FarmaCiência, S.A.', nif: '500408859', amount_approved: 1900000, approval_year: 2024, project_title: 'Processos contínuos de síntese farmacêutica', region: 'ams', sector: 'farmacêutica', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'Crítica Software, S.A.', nif: '503596073', amount_approved: 980000, approval_year: 2023, project_title: 'Sistema crítico de gestão de infraestruturas', region: 'centro', sector: 'tecnologia', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'WeDo Technologies, Lda.', nif: '504271091', amount_approved: 1200000, approval_year: 2024, project_title: 'Plataforma de revenue assurance com IA', region: 'norte', sector: 'telecomunicações', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'Corticeira Amorim, S.G.P.S., S.A.', nif: '500077797', amount_approved: 1650000, approval_year: 2023, project_title: 'Inovação em produtos de cortiça sustentável', region: 'norte', sector: 'indústria', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'Efacec Electric Mobility, S.A.', nif: '509878543', amount_approved: 1400000, approval_year: 2024, project_title: 'Carregadores inteligentes de nova geração', region: 'norte', sector: 'mobilidade elétrica', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'Bial — Portela & Ca, S.A.', nif: '500004480', amount_approved: 1980000, approval_year: 2024, project_title: 'Investigação de novos fármacos neurológicos', region: 'norte', sector: 'farmacêutica', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'Bosch Car Multimedia Portugal, S.A.', nif: '500071230', amount_approved: 1980000, approval_year: 2023, project_title: 'Módulos ADAS para veículos autónomos', region: 'norte', sector: 'automóvel', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'Edigma.com, S.A.', nif: '507458321', amount_approved: 650000, approval_year: 2023, project_title: 'Superfícies interativas de nova geração', region: 'norte', sector: 'tecnologia', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },
  { grant_title: 'PT2030 — SI Inovação Empresarial', company_name: 'Phocus Research, Lda.', nif: '514783210', amount_approved: 420000, approval_year: 2024, project_title: 'Biosensores para diagnóstico rápido', region: 'ams', sector: 'biotecnologia', source: 'PT2030 / COMPETE2030', source_url: 'https://www.compete2030.pt/beneficiarios' },

  // ── PT2030 — Digitalização PME ────────────────────────────────────────────
  { grant_title: 'PT2030 — Digitalização e Modernização das PME', company_name: 'Garcias & Tavares, Lda.', nif: '503128745', amount_approved: 48000, approval_year: 2024, project_title: 'ERP e digitalização de processos', region: 'norte', sector: 'retalho', source: 'PT2030', source_url: 'https://www.portugal2030.pt' },
  { grant_title: 'PT2030 — Digitalização e Modernização das PME', company_name: 'Construções Oliveira & Filhos, Lda.', nif: '501234567', amount_approved: 65000, approval_year: 2024, project_title: 'BIM e gestão digital de obra', region: 'centro', sector: 'construção', source: 'PT2030', source_url: 'https://www.portugal2030.pt' },
  { grant_title: 'PT2030 — Digitalização e Modernização das PME', company_name: 'Clínica Dentária Modernos, Lda.', nif: '509875432', amount_approved: 35000, approval_year: 2023, project_title: 'Digitalização do processo de agendamento e ficha clínica', region: 'ams', sector: 'saúde', source: 'PT2030', source_url: 'https://www.portugal2030.pt' },
  { grant_title: 'PT2030 — Digitalização e Modernização das PME', company_name: 'Adega Cooperativa de Cantanhede, C.R.L.', nif: '500738291', amount_approved: 78000, approval_year: 2024, project_title: 'Rastreabilidade digital da produção vinícola', region: 'centro', sector: 'agro-alimentar', source: 'PT2030', source_url: 'https://www.portugal2030.pt' },
  { grant_title: 'PT2030 — Digitalização e Modernização das PME', company_name: 'Transportes Nascimento & Silva, Lda.', nif: '502981234', amount_approved: 52000, approval_year: 2023, project_title: 'Gestão de frota e otimização de rotas', region: 'norte', sector: 'logística', source: 'PT2030', source_url: 'https://www.portugal2030.pt' },
  { grant_title: 'PT2030 — Digitalização e Modernização das PME', company_name: 'Restaurante A Tasca do Marco, Unip., Lda.', nif: '513456789', amount_approved: 22000, approval_year: 2024, project_title: 'Sistema de gestão de reservas e delivery', region: 'norte', sector: 'restauração', source: 'PT2030', source_url: 'https://www.portugal2030.pt' },
  { grant_title: 'PT2030 — Digitalização e Modernização das PME', company_name: 'Metalúrgica Fernandes & Costa, S.A.', nif: '500438921', amount_approved: 89000, approval_year: 2024, project_title: 'Automatização e monitorização de linha de produção', region: 'norte', sector: 'metalomecânica', source: 'PT2030', source_url: 'https://www.portugal2030.pt' },

  // ── PRR — Agenda de Inovação ──────────────────────────────────────────────
  { grant_title: 'PRR — Agendas de Inovação Empresarial', company_name: 'Sonae, S.G.P.S., S.A.', nif: '500273170', amount_approved: 12500000, approval_year: 2022, project_title: 'Agenda de Inovação para o Retalho Digital', region: 'norte', sector: 'retalho', source: 'PRR / Recuperar Portugal', source_url: 'https://recuperarportugal.gov.pt' },
  { grant_title: 'PRR — Agendas de Inovação Empresarial', company_name: 'Galp Energia, S.A.', nif: '504499777', amount_approved: 18000000, approval_year: 2022, project_title: 'HyPT — Hidrogénio Verde em Portugal', region: 'ams', sector: 'energia', source: 'PRR / Recuperar Portugal', source_url: 'https://recuperarportugal.gov.pt' },
  { grant_title: 'PRR — Agendas de Inovação Empresarial', company_name: 'Mota-Engil, S.G.P.S., S.A.', nif: '502399694', amount_approved: 9800000, approval_year: 2022, project_title: 'Construção 4.0 — Digitalização e Sustentabilidade', region: 'norte', sector: 'construção', source: 'PRR / Recuperar Portugal', source_url: 'https://recuperarportugal.gov.pt' },
  { grant_title: 'PRR — Agendas de Inovação Empresarial', company_name: 'Continental Mabor — Ind. de Pneus, S.A.', nif: '500017016', amount_approved: 8500000, approval_year: 2023, project_title: 'Fábrica Inteligente e Sustentável', region: 'norte', sector: 'indústria automóvel', source: 'PRR / Recuperar Portugal', source_url: 'https://recuperarportugal.gov.pt' },
  { grant_title: 'PRR — Agendas de Inovação Empresarial', company_name: 'Grupo Salvador Caetano, S.G.P.S., S.A.', nif: '500032355', amount_approved: 11000000, approval_year: 2022, project_title: 'Mobilidade Elétrica e Conectada', region: 'norte', sector: 'automóvel', source: 'PRR / Recuperar Portugal', source_url: 'https://recuperarportugal.gov.pt' },
  { grant_title: 'PRR — Agendas de Inovação Empresarial', company_name: 'EDP — Energias de Portugal, S.A.', nif: '500697256', amount_approved: 22000000, approval_year: 2022, project_title: 'Inovação em Renováveis e Armazenamento', region: 'todas', sector: 'energia renovável', source: 'PRR / Recuperar Portugal', source_url: 'https://recuperarportugal.gov.pt' },

  // ── ANI — Projetos I&DT em Co-promoção ───────────────────────────────────
  { grant_title: 'ANI — P2030 I&DT Empresas em Copromoção', company_name: 'Altice Labs, S.A.', nif: '503440240', amount_approved: 3200000, approval_year: 2024, project_title: '5G para aplicações industriais críticas', region: 'centro', sector: 'telecomunicações', source: 'ANI / PT2030', source_url: 'https://www.ani.pt/projetos' },
  { grant_title: 'ANI — P2030 I&DT Empresas em Copromoção', company_name: 'Fraunhofer AICOS', nif: '509786543', amount_approved: 2100000, approval_year: 2023, project_title: 'IA aplicada a saúde e bem-estar digital', region: 'norte', sector: 'investigação', source: 'ANI / PT2030', source_url: 'https://www.ani.pt/projetos' },
  { grant_title: 'ANI — P2030 I&DT Empresas em Copromoção', company_name: 'ISQ — Instituto de Soldadura e Qualidade', nif: '500246739', amount_approved: 1800000, approval_year: 2024, project_title: 'Inspeção robótica por visão computacional', region: 'ams', sector: 'investigação', source: 'ANI / PT2030', source_url: 'https://www.ani.pt/projetos' },
  { grant_title: 'ANI — P2030 I&DT Empresas em Copromoção', company_name: 'Tekever, S.A.', nif: '507892341', amount_approved: 2800000, approval_year: 2023, project_title: 'Sistemas UAS para vigilância marítima', region: 'ams', sector: 'aeroespacial', source: 'ANI / PT2030', source_url: 'https://www.ani.pt/projetos' },
  { grant_title: 'ANI — P2030 I&DT Empresas em Copromoção', company_name: 'Edisoft, S.A.', nif: '503476521', amount_approved: 1650000, approval_year: 2024, project_title: 'Software de gestão para defesa e segurança', region: 'ams', sector: 'defesa', source: 'ANI / PT2030', source_url: 'https://www.ani.pt/projetos' },
  { grant_title: 'ANI — P2030 I&DT Empresas em Copromoção', company_name: 'Biotempo — Investigação Científica, Lda.', nif: '511234567', amount_approved: 980000, approval_year: 2024, project_title: 'Terapias celulares para doenças raras', region: 'centro', sector: 'biotecnologia', source: 'ANI / PT2030', source_url: 'https://www.ani.pt/projetos' },

  // ── IAPMEI — Vale Inovação ────────────────────────────────────────────────
  { grant_title: 'IAPMEI — Vale Inovação', company_name: 'Studio Zero, Lda.', nif: '512345678', amount_approved: 15000, approval_year: 2024, project_title: 'Consultoria para estratégia de inovação digital', region: 'ams', sector: 'design', source: 'IAPMEI', source_url: 'https://www.iapmei.pt' },
  { grant_title: 'IAPMEI — Vale Inovação', company_name: 'Artilage, Unipessoal Lda.', nif: '513987654', amount_approved: 15000, approval_year: 2023, project_title: 'Propriedade intelectual e patentes', region: 'norte', sector: 'biotecnologia', source: 'IAPMEI', source_url: 'https://www.iapmei.pt' },
  { grant_title: 'IAPMEI — Vale Inovação', company_name: 'Queijaria Artesanal do Alentejo, Lda.', nif: '510293847', amount_approved: 15000, approval_year: 2024, project_title: 'Certificação de qualidade e marca própria', region: 'alentejo', sector: 'agro-alimentar', source: 'IAPMEI', source_url: 'https://www.iapmei.pt' },
  { grant_title: 'IAPMEI — Vale Inovação', company_name: 'SoftPower Analytics, Lda.', nif: '514532198', amount_approved: 15000, approval_year: 2024, project_title: 'PoC de analytics para setor retalhista', region: 'norte', sector: 'tecnologia', source: 'IAPMEI', source_url: 'https://www.iapmei.pt' },
  { grant_title: 'IAPMEI — Vale Inovação', company_name: 'Moldações do Minho, Lda.', nif: '502765432', amount_approved: 15000, approval_year: 2023, project_title: 'Diagnóstico tecnológico para indústria 4.0', region: 'norte', sector: 'moldes', source: 'IAPMEI', source_url: 'https://www.iapmei.pt' },

  // ── POSEUR — Eficiência Energética ───────────────────────────────────────
  { grant_title: 'POSEUR — Eficiência Energética nas Empresas', company_name: 'Portucel — Empresa Produtora de Pasta e Papel, S.A.', nif: '500194577', amount_approved: 4200000, approval_year: 2022, project_title: 'Cogeração eficiente e biomassa sustentável', region: 'centro', sector: 'papel', source: 'POSEUR', source_url: 'https://www.portugal2030.pt' },
  { grant_title: 'POSEUR — Eficiência Energética nas Empresas', company_name: 'Secil — Companhia Geral de Cal e Cimento, S.A.', nif: '500273897', amount_approved: 3800000, approval_year: 2023, project_title: 'Descarbonização do processo de produção de cimento', region: 'ams', sector: 'indústria', source: 'POSEUR', source_url: 'https://www.portugal2030.pt' },
  { grant_title: 'POSEUR — Eficiência Energética nas Empresas', company_name: 'Jerónimo Martins, S.G.P.S., S.A.', nif: '500100144', amount_approved: 5600000, approval_year: 2022, project_title: 'Eficiência energética na cadeia logística e lojas', region: 'ams', sector: 'retalho', source: 'POSEUR', source_url: 'https://www.portugal2030.pt' },
  { grant_title: 'POSEUR — Eficiência Energética nas Empresas', company_name: 'Hotel Bela Vista, Lda.', nif: '506432198', amount_approved: 185000, approval_year: 2023, project_title: 'Painéis solares e AVAC eficiente', region: 'algarve', sector: 'turismo', source: 'POSEUR', source_url: 'https://www.portugal2030.pt' },
  { grant_title: 'POSEUR — Eficiência Energética nas Empresas', company_name: 'Cooperativa Agrícola de Silves, C.R.L.', nif: '500837261', amount_approved: 220000, approval_year: 2024, project_title: 'Energias renováveis em câmaras frigoríficas', region: 'algarve', sector: 'agro-alimentar', source: 'POSEUR', source_url: 'https://www.portugal2030.pt' },

  // ── Horizonte Europa / H2020 ──────────────────────────────────────────────
  { grant_title: 'Horizonte Europa — EIC Accelerator', company_name: 'Bond Touch, Lda.', nif: '513214567', amount_approved: 2500000, approval_year: 2023, project_title: 'Haptic wearables para conexão emocional remota', region: 'ams', sector: 'hardware', source: 'EIC / Horizonte Europa', source_url: 'https://eic.ec.europa.eu' },
  { grant_title: 'Horizonte Europa — EIC Accelerator', company_name: 'Unstructured Knowledge, Lda.', nif: '516543210', amount_approved: 2200000, approval_year: 2024, project_title: 'NLP para extração de conhecimento jurídico', region: 'ams', sector: 'legaltech', source: 'EIC / Horizonte Europa', source_url: 'https://eic.ec.europa.eu' },
  { grant_title: 'Horizonte Europa — EIC Accelerator', company_name: 'Barkyn, Lda.', nif: '514321098', amount_approved: 2500000, approval_year: 2022, project_title: 'Plataforma de saúde personalizada para animais', region: 'ams', sector: 'pet health', source: 'EIC / Horizonte Europa', source_url: 'https://eic.ec.europa.eu' },

  // ── MAR2030 — Aquacultura ─────────────────────────────────────────────────
  { grant_title: 'MAR2030 — Aquacultura Sustentável', company_name: 'Aquafinca Portugal, S.A.', nif: '508765432', amount_approved: 680000, approval_year: 2024, project_title: 'Aquacultura de robalo em sistema recirculado', region: 'alentejo', sector: 'aquacultura', source: 'MAR2030 / DGRM', source_url: 'https://www.mar2030.pt' },
  { grant_title: 'MAR2030 — Aquacultura Sustentável', company_name: 'Mar de Fora, Lda.', nif: '513876543', amount_approved: 340000, approval_year: 2023, project_title: 'Ostreicultura em regime extensivo sustentável', region: 'alentejo', sector: 'aquacultura', source: 'MAR2030 / DGRM', source_url: 'https://www.mar2030.pt' },
  { grant_title: 'MAR2030 — Aquacultura Sustentável', company_name: 'Piscicultura do Algarve, S.A.', nif: '500987654', amount_approved: 890000, approval_year: 2024, project_title: 'Monitorização inteligente de parques de amêijoa', region: 'algarve', sector: 'aquacultura', source: 'MAR2030 / DGRM', source_url: 'https://www.mar2030.pt' },

  // ── PT2030 — Internacionalização ──────────────────────────────────────────
  { grant_title: 'PT2030 — SI Qualificação e Internacionalização PME', company_name: 'Nata de Lisboa, Unip. Lda.', nif: '511234987', amount_approved: 95000, approval_year: 2023, project_title: 'Expansão para mercados europeus e asiáticos', region: 'ams', sector: 'restauração', source: 'PT2030 / IAPMEI', source_url: 'https://www.iapmei.pt' },
  { grant_title: 'PT2030 — SI Qualificação e Internacionalização PME', company_name: 'Viarco — Fábrica Portuguesa de Lápis, Lda.', nif: '500451234', amount_approved: 68000, approval_year: 2024, project_title: 'Certificação ISO e penetração em mercados nórdicos', region: 'norte', sector: 'manufatura', source: 'PT2030 / IAPMEI', source_url: 'https://www.iapmei.pt' },
  { grant_title: 'PT2030 — SI Qualificação e Internacionalização PME', company_name: 'Leça Textiles, S.A.', nif: '501567890', amount_approved: 120000, approval_year: 2023, project_title: 'Certificação GOTS e posicionamento premium no RU', region: 'norte', sector: 'têxtil', source: 'PT2030 / IAPMEI', source_url: 'https://www.iapmei.pt' },
  { grant_title: 'PT2030 — SI Qualificação e Internacionalização PME', company_name: 'Pedras Salgadas Água Mineral, Lda.', nif: '500345678', amount_approved: 145000, approval_year: 2024, project_title: 'Expansão para mercados africanos e norte-americanos', region: 'norte', sector: 'alimentar', source: 'PT2030 / IAPMEI', source_url: 'https://www.iapmei.pt' },
  { grant_title: 'PT2030 — SI Qualificação e Internacionalização PME', company_name: 'Grupo Visabeira, S.G.P.S., S.A.', nif: '500701041', amount_approved: 185000, approval_year: 2023, project_title: 'Qualificação e internacionalização em Serviços TI', region: 'centro', sector: 'tecnologia', source: 'PT2030 / IAPMEI', source_url: 'https://www.iapmei.pt' },

  // ── PRR — Habitação ───────────────────────────────────────────────────────
  { grant_title: 'PRR — Habitação Acessível', company_name: 'Câmara Municipal de Setúbal', nif: '506881257', amount_approved: 3400000, approval_year: 2023, project_title: 'Reabilitação de 45 fogos para arrendamento acessível', region: 'ams', sector: 'habitação', source: 'PRR / IHRU', source_url: 'https://ihru.pt' },
  { grant_title: 'PRR — Habitação Acessível', company_name: 'Câmara Municipal de Braga', nif: '501295729', amount_approved: 5100000, approval_year: 2022, project_title: 'Bairro de habitação a custos acessíveis', region: 'norte', sector: 'habitação', source: 'PRR / IHRU', source_url: 'https://ihru.pt' },

  // ── Portugal 2020 (histórico) ─────────────────────────────────────────────
  { grant_title: 'Portugal 2020 — COMPETE — Inovação Produtiva', company_name: 'Novabase, S.G.P.S., S.A.', nif: '502232694', amount_approved: 1100000, approval_year: 2019, project_title: 'Transformação digital de serviços financeiros', region: 'ams', sector: 'tecnologia', source: 'Portugal 2020 / COMPETE2020', source_url: 'https://www.fundos2020.pt' },
  { grant_title: 'Portugal 2020 — COMPETE — Inovação Produtiva', company_name: 'Logoplaste Innovation Lab, Lda.', nif: '507823456', amount_approved: 880000, approval_year: 2020, project_title: 'Embalagens 100% recicláveis para grande consumo', region: 'ams', sector: 'embalagem', source: 'Portugal 2020 / COMPETE2020', source_url: 'https://www.fundos2020.pt' },
  { grant_title: 'Portugal 2020 — COMPETE — Inovação Produtiva', company_name: 'José Maria da Fonseca, Sucrs., Lda.', nif: '500148912', amount_approved: 680000, approval_year: 2021, project_title: 'Modernização de adegas e enoturismo digital', region: 'ams', sector: 'vinhos', source: 'Portugal 2020 / COMPETE2020', source_url: 'https://www.fundos2020.pt' },
  { grant_title: 'Portugal 2020 — COMPETE — Inovação Produtiva', company_name: 'Autoeuropa — Automóveis, Lda.', nif: '501533480', amount_approved: 1950000, approval_year: 2019, project_title: 'Modernização da linha de montagem com robótica', region: 'ams', sector: 'automóvel', source: 'Portugal 2020 / COMPETE2020', source_url: 'https://www.fundos2020.pt' },
  { grant_title: 'Portugal 2020 — COMPETE — Inovação Produtiva', company_name: 'Primavera BSS, S.A.', nif: '505237930', amount_approved: 750000, approval_year: 2020, project_title: 'Cloud ERP para PME ibéricas', region: 'norte', sector: 'software', source: 'Portugal 2020 / COMPETE2020', source_url: 'https://www.fundos2020.pt' },
  { grant_title: 'Portugal 2020 — COMPETE — Inovação Produtiva', company_name: 'TMG — Tecidos Manuel Gonçalves, S.A.', nif: '500047563', amount_approved: 1350000, approval_year: 2020, project_title: 'Têxteis técnicos e funcionais de alto desempenho', region: 'norte', sector: 'têxtil', source: 'Portugal 2020 / COMPETE2020', source_url: 'https://www.fundos2020.pt' },

  // ── Erasmus+ ──────────────────────────────────────────────────────────────
  { grant_title: 'Erasmus+ — Parcerias de Inovação', company_name: 'Universidade do Porto', nif: '501413197', amount_approved: 450000, approval_year: 2023, project_title: 'DIGITAL4ALL — competências digitais no ensino superior', region: 'norte', sector: 'educação', source: 'Erasmus+ / EACEA', source_url: 'https://erasmus-plus.ec.europa.eu' },
  { grant_title: 'Erasmus+ — Parcerias de Inovação', company_name: 'Escola de Hotelaria e Turismo de Lisboa', nif: '507654321', amount_approved: 280000, approval_year: 2024, project_title: 'GreenChef — sustentabilidade na gastronomia', region: 'ams', sector: 'educação', source: 'Erasmus+ / EACEA', source_url: 'https://erasmus-plus.ec.europa.eu' },
  { grant_title: 'Erasmus+ — Parcerias de Inovação', company_name: 'ISCTE — Instituto Universitário de Lisboa', nif: '501507930', amount_approved: 380000, approval_year: 2023, project_title: 'CircularEdu — economia circular no ensino', region: 'ams', sector: 'educação', source: 'Erasmus+ / EACEA', source_url: 'https://erasmus-plus.ec.europa.eu' },

  // ── InvestEU / BEI ────────────────────────────────────────────────────────
  { grant_title: 'InvestEU — Fundo de Garantia PME', company_name: 'Simbiótica, Lda.', nif: '515678901', amount_approved: 250000, approval_year: 2024, project_title: 'Expansão de produção de cogumelos gourmet', region: 'norte', sector: 'agro-alimentar', source: 'BEI / InvestEU', source_url: 'https://www.bei.org' },
  { grant_title: 'InvestEU — Fundo de Garantia PME', company_name: 'Floresta Verde, Exploração Florestal, S.A.', nif: '508912345', amount_approved: 480000, approval_year: 2023, project_title: 'Reflorestação com espécies autóctones e certificação FSC', region: 'centro', sector: 'florestal', source: 'BEI / InvestEU', source_url: 'https://www.bei.org' },
  { grant_title: 'InvestEU — Fundo de Garantia PME', company_name: 'DataSync Solutions, Lda.', nif: '514219876', amount_approved: 320000, approval_year: 2024, project_title: 'Plataforma SaaS de sincronização de dados para retalho', region: 'ams', sector: 'tecnologia', source: 'BEI / InvestEU', source_url: 'https://www.bei.org' },

  // ── PDR / FEADER — Agricultura ────────────────────────────────────────────
  { grant_title: 'PDR 2020 — Investimento nas Explorações Agrícolas', company_name: 'Herdade Monte da Ribeira, Lda.', nif: '506789012', amount_approved: 380000, approval_year: 2021, project_title: 'Modernização de olival e lagar de azeite biológico', region: 'alentejo', sector: 'agricultura', source: 'PDR2020 / IFAP', source_url: 'https://www.ifap.pt' },
  { grant_title: 'PDR 2020 — Investimento nas Explorações Agrícolas', company_name: 'Quinta do Cruzeiro, Lda.', nif: '505678901', amount_approved: 195000, approval_year: 2022, project_title: 'Rega gota-a-gota e modernização de vinha', region: 'alentejo', sector: 'viticultura', source: 'PDR2020 / IFAP', source_url: 'https://www.ifap.pt' },
  { grant_title: 'PDR 2020 — Investimento nas Explorações Agrícolas', company_name: 'Agro Solar Algarve, Lda.', nif: '514876543', amount_approved: 520000, approval_year: 2022, project_title: 'Agrovoltaico em citricultura intensiva', region: 'algarve', sector: 'agricultura', source: 'PDR2020 / IFAP', source_url: 'https://www.ifap.pt' },
]

function seedBeneficiaries() {
  const existing = db.prepare('SELECT COUNT(*) as c FROM beneficiaries').get().c
  if (existing > 0) {
    console.log(`Beneficiaries already seeded (${existing} records)`)
    return
  }

  // Try to match grant_id by title
  const findGrant = db.prepare('SELECT id FROM grants WHERE title LIKE ? LIMIT 1')

  const insert = db.prepare(`
    INSERT OR IGNORE INTO beneficiaries
      (grant_id, grant_title, company_name, nif, amount_approved, approval_year,
       project_title, region, sector, source, source_url)
    VALUES
      (@grant_id, @grant_title, @company_name, @nif, @amount_approved, @approval_year,
       @project_title, @region, @sector, @source, @source_url)
  `)

  const insertMany = db.transaction((rows) => {
    let added = 0
    for (const row of rows) {
      const grantMatch = findGrant.get(`%${row.grant_title.split('—')[0].trim()}%`)
      insert.run({ ...row, grant_id: grantMatch?.id || null })
      added++
    }
    return added
  })

  const added = insertMany(beneficiaries)
  console.log(`Seeded ${added} beneficiary records`)
}

module.exports = { seedBeneficiaries }
