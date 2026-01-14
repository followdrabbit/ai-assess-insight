import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default frameworks data
const defaultFrameworks = [
  {
    framework_id: "NIST_AI_RMF",
    framework_name: "NIST AI Risk Management Framework",
    short_name: "NIST AI RMF",
    description: "Framework primário para gestão de riscos de IA, organizando controles em quatro funções: Govern, Map, Measure, Manage.",
    target_audience: ["Executive", "GRC"],
    assessment_scope: "Governança, mapeamento de riscos, medição e gestão de sistemas de IA",
    default_enabled: true,
    version: "1.0",
    category: "core",
    reference_links: ["https://www.nist.gov/itl/ai-risk-management-framework"]
  },
  {
    framework_id: "ISO_27001_27002",
    framework_name: "ISO/IEC 27001 / 27002",
    short_name: "ISO 27001/27002",
    description: "Padrão internacional para gestão de segurança da informação, fornecendo baseline de controles de segurança.",
    target_audience: ["GRC", "Engineering"],
    assessment_scope: "Controles de segurança da informação, políticas, gestão de ativos e acessos",
    default_enabled: true,
    version: "2022",
    category: "core",
    reference_links: ["https://www.iso.org/standard/27001"]
  },
  {
    framework_id: "ISO_23894",
    framework_name: "ISO/IEC 23894",
    short_name: "ISO 23894",
    description: "Orientação para gestão de riscos em sistemas de IA, complementando frameworks de segurança tradicionais.",
    target_audience: ["GRC", "Executive"],
    assessment_scope: "Riscos específicos de IA, viés, explicabilidade e impacto em direitos",
    default_enabled: false,
    version: "2023",
    category: "high-value",
    reference_links: ["https://www.iso.org/standard/77304.html"]
  },
  {
    framework_id: "LGPD",
    framework_name: "LGPD (Lei Geral de Proteção de Dados)",
    short_name: "LGPD",
    description: "Legislação brasileira de proteção de dados pessoais, incluindo requisitos para decisões automatizadas.",
    target_audience: ["GRC", "Executive"],
    assessment_scope: "Privacidade, consentimento, direitos dos titulares e impacto de decisões automatizadas",
    default_enabled: true,
    version: "Lei 13.709/2018",
    category: "core",
    reference_links: ["https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"]
  },
  {
    framework_id: "NIST_SSDF",
    framework_name: "NIST Secure Software Development Framework",
    short_name: "NIST SSDF",
    description: "Práticas de desenvolvimento seguro para ciclo de vida de software, aplicável a pipelines de ML/AI.",
    target_audience: ["Engineering"],
    assessment_scope: "Segurança do ciclo de desenvolvimento, código, dependências e deploy",
    default_enabled: false,
    version: "1.1",
    category: "high-value",
    reference_links: ["https://csrc.nist.gov/Projects/ssdf"]
  },
  {
    framework_id: "CSA_AI",
    framework_name: "CSA AI Security / AI Governance Guidance",
    short_name: "CSA AI Security",
    description: "Orientações práticas de segurança para IA em ambientes cloud, cobrindo plataformas e infraestrutura.",
    target_audience: ["Engineering", "GRC"],
    assessment_scope: "Segurança de plataformas de IA, cloud, APIs e infraestrutura",
    default_enabled: false,
    version: "2024",
    category: "high-value",
    reference_links: ["https://cloudsecurityalliance.org/research/ai/"]
  },
  {
    framework_id: "OWASP_LLM",
    framework_name: "OWASP Top 10 for LLM Applications",
    short_name: "OWASP LLM Top 10",
    description: "Principais riscos de segurança em aplicações que utilizam Large Language Models.",
    target_audience: ["Engineering"],
    assessment_scope: "Prompt injection, data leakage, insecure plugins, model theft e outros riscos de LLM",
    default_enabled: false,
    version: "1.1",
    category: "tech-focused",
    reference_links: ["https://owasp.org/www-project-top-10-for-large-language-model-applications/"]
  },
  {
    framework_id: "OWASP_API",
    framework_name: "OWASP API Security Top 10",
    short_name: "OWASP API Top 10",
    description: "Principais vulnerabilidades de segurança em APIs, essencial para sistemas de IA expostos via API.",
    target_audience: ["Engineering"],
    assessment_scope: "Autenticação, autorização, rate limiting, injeção e exposição de dados via API",
    default_enabled: false,
    version: "2023",
    category: "tech-focused",
    reference_links: ["https://owasp.org/API-Security/"]
  },
  {
    framework_id: "CSA_CCM",
    framework_name: "CSA Cloud Controls Matrix",
    short_name: "CSA CCM",
    description: "Framework de controles de segurança para cloud computing, com 17 domínios cobrindo governança, IAM, proteção de dados e infraestrutura.",
    target_audience: ["GRC", "Engineering"],
    assessment_scope: "Controles de segurança cloud: identidade, criptografia, logging, BCM, compliance e infraestrutura",
    default_enabled: false,
    version: "4.0",
    category: "high-value",
    reference_links: ["https://cloudsecurityalliance.org/research/cloud-controls-matrix/"]
  }
];

// Default domains data
const defaultDomains = [
  {
    domain_id: "GOV",
    domain_name: "Governança de IA",
    display_order: 1,
    nist_ai_rmf_function: "GOVERN",
    strategic_question: "Como a organização governa e supervisiona o uso de IA?",
    description: "Estabelecimento de políticas, estruturas de governança e responsabilidades para sistemas de IA",
    banking_relevance: "Essencial para compliance regulatório e gestão de riscos operacionais"
  },
  {
    domain_id: "MAP",
    domain_name: "Mapeamento de Riscos",
    display_order: 2,
    nist_ai_rmf_function: "MAP",
    strategic_question: "Como identificamos e categorizamos os riscos de IA?",
    description: "Identificação, categorização e documentação de riscos associados a sistemas de IA",
    banking_relevance: "Fundamental para avaliação de riscos de crédito, fraude e conformidade"
  },
  {
    domain_id: "MEA",
    domain_name: "Medição e Monitoramento",
    display_order: 3,
    nist_ai_rmf_function: "MEASURE",
    strategic_question: "Como medimos e monitoramos o desempenho e riscos de IA?",
    description: "Métricas, KPIs e processos de monitoramento contínuo de sistemas de IA",
    banking_relevance: "Crítico para detecção de drift, viés e degradação de modelos"
  },
  {
    domain_id: "MAN",
    domain_name: "Gestão e Mitigação",
    display_order: 4,
    nist_ai_rmf_function: "MANAGE",
    strategic_question: "Como gerenciamos e mitigamos os riscos identificados?",
    description: "Ações de mitigação, controles e processos de gestão de riscos de IA",
    banking_relevance: "Necessário para resposta a incidentes e continuidade de negócios"
  },
  {
    domain_id: "SEC",
    domain_name: "Segurança Técnica",
    display_order: 5,
    nist_ai_rmf_function: "MANAGE",
    strategic_question: "Quais controles técnicos protegem os sistemas de IA?",
    description: "Controles de segurança técnica, proteção de dados e infraestrutura de IA",
    banking_relevance: "Proteção contra ataques adversariais e vazamento de dados sensíveis"
  },
  {
    domain_id: "PRI",
    domain_name: "Privacidade e Proteção de Dados",
    display_order: 6,
    nist_ai_rmf_function: "GOVERN",
    strategic_question: "Como protegemos dados pessoais em sistemas de IA?",
    description: "Conformidade com LGPD, proteção de dados pessoais e direitos dos titulares",
    banking_relevance: "Obrigatório para sigilo bancário e proteção de dados de clientes"
  }
];

// Default subcategories data
const defaultSubcategories = [
  // GOV subcategories
  {
    subcat_id: "GOV.1",
    domain_id: "GOV",
    subcat_name: "Políticas e Procedimentos",
    definition: "Estabelecimento de políticas formais para uso de IA",
    objective: "Garantir governança estruturada de IA",
    security_outcome: "Políticas documentadas e comunicadas",
    criticality: "Critical",
    weight: 1.5,
    ownership_type: "Executive",
    risk_summary: "Falta de direcionamento pode levar a uso inadequado de IA",
    framework_refs: ["NIST AI RMF", "ISO 27001"]
  },
  {
    subcat_id: "GOV.2",
    domain_id: "GOV",
    subcat_name: "Papéis e Responsabilidades",
    definition: "Definição clara de responsabilidades na gestão de IA",
    objective: "Estabelecer accountability para sistemas de IA",
    security_outcome: "Responsabilidades claramente definidas",
    criticality: "High",
    weight: 1.3,
    ownership_type: "Executive",
    risk_summary: "Responsabilidades difusas podem causar gaps de controle",
    framework_refs: ["NIST AI RMF", "ISO 27001"]
  },
  {
    subcat_id: "GOV.3",
    domain_id: "GOV",
    subcat_name: "Comitê de IA",
    definition: "Estrutura de governança com representação multidisciplinar",
    objective: "Supervisão estratégica de iniciativas de IA",
    security_outcome: "Decisões informadas e balanceadas",
    criticality: "High",
    weight: 1.2,
    ownership_type: "Executive",
    risk_summary: "Falta de supervisão pode resultar em decisões unilaterais",
    framework_refs: ["NIST AI RMF"]
  },
  // MAP subcategories
  {
    subcat_id: "MAP.1",
    domain_id: "MAP",
    subcat_name: "Inventário de Sistemas de IA",
    definition: "Catalogação de todos os sistemas de IA em uso",
    objective: "Visibilidade completa do landscape de IA",
    security_outcome: "Inventário atualizado e completo",
    criticality: "Critical",
    weight: 1.5,
    ownership_type: "GRC",
    risk_summary: "Shadow AI pode introduzir riscos desconhecidos",
    framework_refs: ["NIST AI RMF", "ISO 27001"]
  },
  {
    subcat_id: "MAP.2",
    domain_id: "MAP",
    subcat_name: "Classificação de Riscos",
    definition: "Categorização de sistemas por nível de risco",
    objective: "Priorização de controles baseada em risco",
    security_outcome: "Sistemas classificados por criticidade",
    criticality: "High",
    weight: 1.3,
    ownership_type: "GRC",
    risk_summary: "Classificação inadequada pode subestimar riscos críticos",
    framework_refs: ["NIST AI RMF", "ISO 23894"]
  },
  {
    subcat_id: "MAP.3",
    domain_id: "MAP",
    subcat_name: "Análise de Impacto",
    definition: "Avaliação de impactos potenciais de sistemas de IA",
    objective: "Compreender consequências de falhas ou viés",
    security_outcome: "Impactos documentados e comunicados",
    criticality: "High",
    weight: 1.3,
    ownership_type: "GRC",
    risk_summary: "Impactos não mapeados podem causar danos reputacionais",
    framework_refs: ["NIST AI RMF", "LGPD"]
  },
  // MEA subcategories
  {
    subcat_id: "MEA.1",
    domain_id: "MEA",
    subcat_name: "Métricas de Desempenho",
    definition: "KPIs para monitoramento de sistemas de IA",
    objective: "Acompanhamento contínuo de performance",
    security_outcome: "Dashboards e alertas implementados",
    criticality: "High",
    weight: 1.2,
    ownership_type: "Engineering",
    risk_summary: "Sem métricas, degradação pode passar despercebida",
    framework_refs: ["NIST AI RMF"]
  },
  {
    subcat_id: "MEA.2",
    domain_id: "MEA",
    subcat_name: "Detecção de Drift",
    definition: "Monitoramento de mudanças em dados e modelos",
    objective: "Identificar degradação de modelos",
    security_outcome: "Alertas de drift configurados",
    criticality: "High",
    weight: 1.3,
    ownership_type: "Engineering",
    risk_summary: "Drift não detectado pode causar decisões incorretas",
    framework_refs: ["NIST AI RMF"]
  },
  {
    subcat_id: "MEA.3",
    domain_id: "MEA",
    subcat_name: "Auditoria de Viés",
    definition: "Avaliação periódica de viés em modelos",
    objective: "Garantir equidade nas decisões de IA",
    security_outcome: "Relatórios de viés documentados",
    criticality: "Critical",
    weight: 1.5,
    ownership_type: "GRC",
    risk_summary: "Viés pode causar discriminação e sanções regulatórias",
    framework_refs: ["NIST AI RMF", "LGPD", "ISO 23894"]
  },
  // MAN subcategories
  {
    subcat_id: "MAN.1",
    domain_id: "MAN",
    subcat_name: "Planos de Mitigação",
    definition: "Estratégias documentadas para mitigar riscos",
    objective: "Reduzir probabilidade e impacto de riscos",
    security_outcome: "Planos aprovados e implementados",
    criticality: "High",
    weight: 1.3,
    ownership_type: "GRC",
    risk_summary: "Sem planos, resposta a riscos será ad-hoc",
    framework_refs: ["NIST AI RMF", "ISO 27001"]
  },
  {
    subcat_id: "MAN.2",
    domain_id: "MAN",
    subcat_name: "Resposta a Incidentes",
    definition: "Procedimentos para incidentes envolvendo IA",
    objective: "Resposta rápida e eficaz a falhas de IA",
    security_outcome: "Playbooks de incidentes testados",
    criticality: "Critical",
    weight: 1.5,
    ownership_type: "Engineering",
    risk_summary: "Resposta lenta pode amplificar danos",
    framework_refs: ["NIST AI RMF", "ISO 27001"]
  },
  {
    subcat_id: "MAN.3",
    domain_id: "MAN",
    subcat_name: "Rollback e Fallback",
    definition: "Capacidade de reverter decisões de IA",
    objective: "Garantir recuperabilidade de sistemas",
    security_outcome: "Procedimentos de rollback testados",
    criticality: "High",
    weight: 1.2,
    ownership_type: "Engineering",
    risk_summary: "Sem rollback, erros podem ser irreversíveis",
    framework_refs: ["NIST AI RMF"]
  },
  // SEC subcategories
  {
    subcat_id: "SEC.1",
    domain_id: "SEC",
    subcat_name: "Segurança de Modelos",
    definition: "Proteção contra ataques adversariais",
    objective: "Garantir integridade de modelos de IA",
    security_outcome: "Modelos protegidos e testados",
    criticality: "Critical",
    weight: 1.5,
    ownership_type: "Engineering",
    risk_summary: "Modelos vulneráveis podem ser manipulados",
    framework_refs: ["OWASP LLM", "CSA AI Security"]
  },
  {
    subcat_id: "SEC.2",
    domain_id: "SEC",
    subcat_name: "Segurança de APIs",
    definition: "Proteção de interfaces de IA",
    objective: "Prevenir acesso não autorizado",
    security_outcome: "APIs seguras e monitoradas",
    criticality: "High",
    weight: 1.3,
    ownership_type: "Engineering",
    risk_summary: "APIs inseguras expõem dados e modelos",
    framework_refs: ["OWASP API", "ISO 27001"]
  },
  {
    subcat_id: "SEC.3",
    domain_id: "SEC",
    subcat_name: "Proteção de Dados de Treinamento",
    definition: "Segurança dos dados usados para treinar modelos",
    objective: "Garantir confidencialidade e integridade",
    security_outcome: "Dados de treinamento protegidos",
    criticality: "Critical",
    weight: 1.5,
    ownership_type: "Engineering",
    risk_summary: "Dados comprometidos podem envenenar modelos",
    framework_refs: ["ISO 27001", "LGPD"]
  },
  // PRI subcategories
  {
    subcat_id: "PRI.1",
    domain_id: "PRI",
    subcat_name: "Minimização de Dados",
    definition: "Coleta apenas de dados necessários",
    objective: "Reduzir exposição de dados pessoais",
    security_outcome: "Dados coletados são justificados",
    criticality: "High",
    weight: 1.2,
    ownership_type: "GRC",
    risk_summary: "Coleta excessiva aumenta riscos de privacidade",
    framework_refs: ["LGPD", "ISO 27701"]
  },
  {
    subcat_id: "PRI.2",
    domain_id: "PRI",
    subcat_name: "Direitos dos Titulares",
    definition: "Suporte aos direitos LGPD dos titulares",
    objective: "Atender solicitações de titulares",
    security_outcome: "Processos de atendimento implementados",
    criticality: "Critical",
    weight: 1.5,
    ownership_type: "GRC",
    risk_summary: "Não atendimento pode gerar sanções",
    framework_refs: ["LGPD"]
  },
  {
    subcat_id: "PRI.3",
    domain_id: "PRI",
    subcat_name: "Explicabilidade",
    definition: "Capacidade de explicar decisões de IA",
    objective: "Atender Art. 20 da LGPD",
    security_outcome: "Explicações disponíveis para titulares",
    criticality: "Critical",
    weight: 1.5,
    ownership_type: "Engineering",
    risk_summary: "Decisões inexplicáveis podem ser contestadas",
    framework_refs: ["LGPD", "NIST AI RMF", "ISO 23894"]
  }
];

// Default questions data
const defaultQuestions = [
  // GOV.1 Questions
  {
    question_id: "GOV.1.1",
    subcat_id: "GOV.1",
    domain_id: "GOV",
    question_text: "A organização possui uma política formal de IA que define princípios éticos, escopo de aplicação e requisitos de conformidade?",
    expected_evidence: "Documento de política de IA aprovado pela alta administração",
    imperative_checks: "Verificar data de aprovação, signatários e escopo de aplicação",
    risk_summary: "Ausência de política pode levar a uso inconsistente e não ético de IA",
    frameworks: ["NIST AI RMF", "ISO 27001"],
    ownership_type: "Executive"
  },
  {
    question_id: "GOV.1.2",
    subcat_id: "GOV.1",
    domain_id: "GOV",
    question_text: "Existe um processo formal para revisão e atualização periódica das políticas de IA?",
    expected_evidence: "Procedimento de revisão com periodicidade definida e histórico de versões",
    imperative_checks: "Verificar última revisão e responsável pelo processo",
    risk_summary: "Políticas desatualizadas podem não cobrir novos riscos",
    frameworks: ["NIST AI RMF", "ISO 27001"],
    ownership_type: "GRC"
  },
  {
    question_id: "GOV.1.3",
    subcat_id: "GOV.1",
    domain_id: "GOV",
    question_text: "As políticas de IA são comunicadas a todos os stakeholders relevantes e há evidência de treinamento?",
    expected_evidence: "Registros de comunicação e listas de presença de treinamentos",
    imperative_checks: "Verificar cobertura de treinamento e frequência",
    risk_summary: "Stakeholders não informados podem violar políticas inadvertidamente",
    frameworks: ["NIST AI RMF", "ISO 27001"],
    ownership_type: "GRC"
  },
  // GOV.2 Questions
  {
    question_id: "GOV.2.1",
    subcat_id: "GOV.2",
    domain_id: "GOV",
    question_text: "Existem papéis e responsabilidades claramente definidos para gestão de riscos de IA (ex: AI Risk Owner, Model Owner)?",
    expected_evidence: "Matriz RACI ou documento equivalente com responsabilidades de IA",
    imperative_checks: "Verificar se todos os papéis críticos estão atribuídos",
    risk_summary: "Responsabilidades difusas podem criar gaps de controle",
    frameworks: ["NIST AI RMF", "ISO 27001"],
    ownership_type: "Executive"
  },
  {
    question_id: "GOV.2.2",
    subcat_id: "GOV.2",
    domain_id: "GOV",
    question_text: "Os responsáveis por sistemas de IA possuem autoridade e recursos adequados para exercer suas funções?",
    expected_evidence: "Descrições de cargo e alocação orçamentária",
    imperative_checks: "Verificar alinhamento entre responsabilidade e autoridade",
    risk_summary: "Responsáveis sem recursos não podem executar controles adequadamente",
    frameworks: ["NIST AI RMF"],
    ownership_type: "Executive"
  },
  // GOV.3 Questions
  {
    question_id: "GOV.3.1",
    subcat_id: "GOV.3",
    domain_id: "GOV",
    question_text: "Existe um comitê de IA ou fórum equivalente com representação multidisciplinar (negócio, TI, jurídico, compliance)?",
    expected_evidence: "Ata de constituição do comitê e lista de membros",
    imperative_checks: "Verificar frequência de reuniões e áreas representadas",
    risk_summary: "Decisões sem visão multidisciplinar podem ignorar riscos importantes",
    frameworks: ["NIST AI RMF"],
    ownership_type: "Executive"
  },
  {
    question_id: "GOV.3.2",
    subcat_id: "GOV.3",
    domain_id: "GOV",
    question_text: "O comitê de IA possui mandato claro e poder de decisão sobre aprovação de novos sistemas de IA?",
    expected_evidence: "Regimento interno do comitê com escopo de decisões",
    imperative_checks: "Verificar histórico de decisões e escalações",
    risk_summary: "Comitê sem poder de decisão pode ser apenas figurativo",
    frameworks: ["NIST AI RMF"],
    ownership_type: "Executive"
  },
  // MAP.1 Questions
  {
    question_id: "MAP.1.1",
    subcat_id: "MAP.1",
    domain_id: "MAP",
    question_text: "A organização mantém um inventário completo de todos os sistemas de IA em produção e desenvolvimento?",
    expected_evidence: "Planilha ou sistema de inventário com lista de sistemas de IA",
    imperative_checks: "Verificar completude e atualização do inventário",
    risk_summary: "Shadow AI pode introduzir riscos não gerenciados",
    frameworks: ["NIST AI RMF", "ISO 27001"],
    ownership_type: "GRC"
  },
  {
    question_id: "MAP.1.2",
    subcat_id: "MAP.1",
    domain_id: "MAP",
    question_text: "O inventário inclui informações sobre propósito, dados utilizados, modelo e responsável por cada sistema de IA?",
    expected_evidence: "Campos do inventário com metadados completos",
    imperative_checks: "Verificar qualidade das informações registradas",
    risk_summary: "Inventário incompleto dificulta gestão de riscos",
    frameworks: ["NIST AI RMF", "ISO 27001"],
    ownership_type: "GRC"
  },
  {
    question_id: "MAP.1.3",
    subcat_id: "MAP.1",
    domain_id: "MAP",
    question_text: "Existe um processo para identificar e registrar novos sistemas de IA antes de sua implantação?",
    expected_evidence: "Procedimento de registro com fluxo de aprovação",
    imperative_checks: "Verificar aderência ao processo em implantações recentes",
    risk_summary: "Sistemas não registrados podem operar sem controles adequados",
    frameworks: ["NIST AI RMF"],
    ownership_type: "GRC"
  },
  // MAP.2 Questions
  {
    question_id: "MAP.2.1",
    subcat_id: "MAP.2",
    domain_id: "MAP",
    question_text: "Existe uma metodologia formal para classificação de riscos de sistemas de IA (ex: baixo, médio, alto, crítico)?",
    expected_evidence: "Documento de metodologia de classificação de riscos de IA",
    imperative_checks: "Verificar critérios utilizados e exemplos de aplicação",
    risk_summary: "Classificação ad-hoc pode subestimar riscos críticos",
    frameworks: ["NIST AI RMF", "ISO 23894"],
    ownership_type: "GRC"
  },
  {
    question_id: "MAP.2.2",
    subcat_id: "MAP.2",
    domain_id: "MAP",
    question_text: "A classificação de riscos considera impacto em direitos dos titulares e potencial de discriminação?",
    expected_evidence: "Critérios de classificação incluindo aspectos de direitos humanos",
    imperative_checks: "Verificar alinhamento com LGPD Art. 20",
    risk_summary: "Ignorar impactos em direitos pode causar danos significativos",
    frameworks: ["NIST AI RMF", "LGPD", "ISO 23894"],
    ownership_type: "GRC"
  },
  // MAP.3 Questions
  {
    question_id: "MAP.3.1",
    subcat_id: "MAP.3",
    domain_id: "MAP",
    question_text: "São realizadas avaliações de impacto para sistemas de IA de alto risco antes de sua implantação?",
    expected_evidence: "Relatórios de avaliação de impacto (AIPD/DPIA)",
    imperative_checks: "Verificar escopo e profundidade das avaliações",
    risk_summary: "Implantação sem avaliação pode causar danos não antecipados",
    frameworks: ["NIST AI RMF", "LGPD"],
    ownership_type: "GRC"
  },
  {
    question_id: "MAP.3.2",
    subcat_id: "MAP.3",
    domain_id: "MAP",
    question_text: "Os resultados das avaliações de impacto são considerados nas decisões de go/no-go?",
    expected_evidence: "Evidência de decisões baseadas em avaliações de impacto",
    imperative_checks: "Verificar histórico de decisões e escalações",
    risk_summary: "Avaliações ignoradas não agregam valor à gestão de riscos",
    frameworks: ["NIST AI RMF", "LGPD"],
    ownership_type: "Executive"
  },
  // MEA.1 Questions
  {
    question_id: "MEA.1.1",
    subcat_id: "MEA.1",
    domain_id: "MEA",
    question_text: "Existem métricas definidas para monitorar o desempenho dos sistemas de IA (ex: acurácia, latência, disponibilidade)?",
    expected_evidence: "Dashboard ou relatório com métricas de desempenho",
    imperative_checks: "Verificar relevância e frequência de atualização das métricas",
    risk_summary: "Sem métricas, degradação pode passar despercebida",
    frameworks: ["NIST AI RMF"],
    ownership_type: "Engineering"
  },
  {
    question_id: "MEA.1.2",
    subcat_id: "MEA.1",
    domain_id: "MEA",
    question_text: "As métricas de desempenho incluem indicadores de equidade e viés (ex: disparidade entre grupos)?",
    expected_evidence: "Métricas de fairness documentadas e monitoradas",
    imperative_checks: "Verificar grupos protegidos considerados",
    risk_summary: "Métricas técnicas sozinhas podem mascarar viés",
    frameworks: ["NIST AI RMF", "ISO 23894"],
    ownership_type: "Engineering"
  },
  // MEA.2 Questions
  {
    question_id: "MEA.2.1",
    subcat_id: "MEA.2",
    domain_id: "MEA",
    question_text: "Existe monitoramento contínuo para detectar drift de dados ou modelos?",
    expected_evidence: "Sistema de monitoramento de drift configurado e operacional",
    imperative_checks: "Verificar alertas configurados e histórico de detecções",
    risk_summary: "Drift não detectado pode causar decisões incorretas",
    frameworks: ["NIST AI RMF"],
    ownership_type: "Engineering"
  },
  {
    question_id: "MEA.2.2",
    subcat_id: "MEA.2",
    domain_id: "MEA",
    question_text: "Existem thresholds definidos que disparam retreinamento ou revisão de modelos?",
    expected_evidence: "Documentação de thresholds e procedimento de ação",
    imperative_checks: "Verificar aderência aos thresholds em incidentes recentes",
    risk_summary: "Sem thresholds claros, resposta a drift será inconsistente",
    frameworks: ["NIST AI RMF"],
    ownership_type: "Engineering"
  },
  // MEA.3 Questions
  {
    question_id: "MEA.3.1",
    subcat_id: "MEA.3",
    domain_id: "MEA",
    question_text: "São realizadas auditorias periódicas de viés nos sistemas de IA?",
    expected_evidence: "Relatórios de auditoria de viés com periodicidade definida",
    imperative_checks: "Verificar metodologia e grupos analisados",
    risk_summary: "Viés não auditado pode causar discriminação sistêmica",
    frameworks: ["NIST AI RMF", "LGPD", "ISO 23894"],
    ownership_type: "GRC"
  },
  {
    question_id: "MEA.3.2",
    subcat_id: "MEA.3",
    domain_id: "MEA",
    question_text: "Os resultados de auditorias de viés são reportados à alta administração e ao comitê de IA?",
    expected_evidence: "Atas de reunião com apresentação de resultados",
    imperative_checks: "Verificar frequência e nível de detalhe dos reportes",
    risk_summary: "Resultados não comunicados não geram ação corretiva",
    frameworks: ["NIST AI RMF"],
    ownership_type: "GRC"
  },
  // MAN.1 Questions
  {
    question_id: "MAN.1.1",
    subcat_id: "MAN.1",
    domain_id: "MAN",
    question_text: "Existem planos de mitigação documentados para os principais riscos identificados em sistemas de IA?",
    expected_evidence: "Planos de mitigação com responsáveis e prazos",
    imperative_checks: "Verificar cobertura dos riscos prioritários",
    risk_summary: "Riscos sem planos de mitigação podem se materializar",
    frameworks: ["NIST AI RMF", "ISO 27001"],
    ownership_type: "GRC"
  },
  {
    question_id: "MAN.1.2",
    subcat_id: "MAN.1",
    domain_id: "MAN",
    question_text: "O progresso dos planos de mitigação é monitorado e reportado regularmente?",
    expected_evidence: "Relatórios de status dos planos de mitigação",
    imperative_checks: "Verificar frequência de atualização e escalações",
    risk_summary: "Planos não monitorados podem não ser executados",
    frameworks: ["NIST AI RMF", "ISO 27001"],
    ownership_type: "GRC"
  },
  // MAN.2 Questions
  {
    question_id: "MAN.2.1",
    subcat_id: "MAN.2",
    domain_id: "MAN",
    question_text: "Existem procedimentos de resposta a incidentes específicos para sistemas de IA?",
    expected_evidence: "Playbooks de resposta a incidentes de IA",
    imperative_checks: "Verificar cenários cobertos e responsáveis",
    risk_summary: "Incidentes de IA têm características únicas que exigem resposta especializada",
    frameworks: ["NIST AI RMF", "ISO 27001"],
    ownership_type: "Engineering"
  },
  {
    question_id: "MAN.2.2",
    subcat_id: "MAN.2",
    domain_id: "MAN",
    question_text: "Os procedimentos de resposta a incidentes são testados periodicamente?",
    expected_evidence: "Registros de testes ou simulações de incidentes",
    imperative_checks: "Verificar frequência e lições aprendidas",
    risk_summary: "Procedimentos não testados podem falhar em situações reais",
    frameworks: ["NIST AI RMF", "ISO 27001"],
    ownership_type: "Engineering"
  },
  // MAN.3 Questions
  {
    question_id: "MAN.3.1",
    subcat_id: "MAN.3",
    domain_id: "MAN",
    question_text: "Existe capacidade técnica para reverter decisões de IA quando necessário (rollback)?",
    expected_evidence: "Documentação de procedimentos de rollback",
    imperative_checks: "Verificar tempo de execução e impacto",
    risk_summary: "Sem rollback, erros de IA podem ser irreversíveis",
    frameworks: ["NIST AI RMF"],
    ownership_type: "Engineering"
  },
  {
    question_id: "MAN.3.2",
    subcat_id: "MAN.3",
    domain_id: "MAN",
    question_text: "Existem mecanismos de fallback para operação sem IA em caso de falha crítica?",
    expected_evidence: "Procedimentos de contingência documentados",
    imperative_checks: "Verificar RTO/RPO definidos para sistemas de IA",
    risk_summary: "Dependência total de IA pode causar paralisação em falhas",
    frameworks: ["NIST AI RMF"],
    ownership_type: "Engineering"
  },
  // SEC.1 Questions
  {
    question_id: "SEC.1.1",
    subcat_id: "SEC.1",
    domain_id: "SEC",
    question_text: "Os modelos de IA são protegidos contra ataques adversariais (ex: evasion, poisoning)?",
    expected_evidence: "Relatórios de testes de segurança adversarial",
    imperative_checks: "Verificar tipos de ataques testados e mitigações",
    risk_summary: "Modelos vulneráveis podem ser manipulados para decisões incorretas",
    frameworks: ["OWASP LLM", "CSA AI Security"],
    ownership_type: "Engineering"
  },
  {
    question_id: "SEC.1.2",
    subcat_id: "SEC.1",
    domain_id: "SEC",
    question_text: "Existe proteção contra extração de modelos (model stealing)?",
    expected_evidence: "Controles implementados para proteção de propriedade intelectual",
    imperative_checks: "Verificar rate limiting e monitoramento de queries",
    risk_summary: "Modelos extraídos podem ser replicados por concorrentes",
    frameworks: ["OWASP LLM", "CSA AI Security"],
    ownership_type: "Engineering"
  },
  // SEC.2 Questions
  {
    question_id: "SEC.2.1",
    subcat_id: "SEC.2",
    domain_id: "SEC",
    question_text: "As APIs de sistemas de IA implementam autenticação e autorização robustas?",
    expected_evidence: "Documentação de segurança de APIs com controles implementados",
    imperative_checks: "Verificar mecanismos de autenticação e níveis de acesso",
    risk_summary: "APIs inseguras expõem dados e permitem uso não autorizado",
    frameworks: ["OWASP API", "ISO 27001"],
    ownership_type: "Engineering"
  },
  {
    question_id: "SEC.2.2",
    subcat_id: "SEC.2",
    domain_id: "SEC",
    question_text: "Existe rate limiting e proteção contra abuso em APIs de IA?",
    expected_evidence: "Configuração de rate limiting e logs de bloqueios",
    imperative_checks: "Verificar thresholds e resposta a abusos",
    risk_summary: "APIs sem rate limiting podem ser exploradas para DoS ou extração",
    frameworks: ["OWASP API", "OWASP LLM"],
    ownership_type: "Engineering"
  },
  // SEC.3 Questions
  {
    question_id: "SEC.3.1",
    subcat_id: "SEC.3",
    domain_id: "SEC",
    question_text: "Os dados de treinamento são protegidos com criptografia em repouso e em trânsito?",
    expected_evidence: "Documentação de controles de criptografia implementados",
    imperative_checks: "Verificar algoritmos e gestão de chaves",
    risk_summary: "Dados não criptografados podem ser exfiltrados ou corrompidos",
    frameworks: ["ISO 27001", "LGPD"],
    ownership_type: "Engineering"
  },
  {
    question_id: "SEC.3.2",
    subcat_id: "SEC.3",
    domain_id: "SEC",
    question_text: "Existe controle de acesso restrito aos datasets de treinamento?",
    expected_evidence: "Matriz de acesso e logs de auditoria",
    imperative_checks: "Verificar princípio de menor privilégio",
    risk_summary: "Acesso amplo aumenta risco de vazamento ou envenenamento",
    frameworks: ["ISO 27001", "LGPD"],
    ownership_type: "Engineering"
  },
  // PRI.1 Questions
  {
    question_id: "PRI.1.1",
    subcat_id: "PRI.1",
    domain_id: "PRI",
    question_text: "Os sistemas de IA coletam apenas os dados pessoais necessários para sua finalidade (minimização)?",
    expected_evidence: "Mapeamento de dados com justificativa de necessidade",
    imperative_checks: "Verificar se há coleta além do necessário",
    risk_summary: "Coleta excessiva viola LGPD e aumenta riscos de privacidade",
    frameworks: ["LGPD"],
    ownership_type: "GRC"
  },
  {
    question_id: "PRI.1.2",
    subcat_id: "PRI.1",
    domain_id: "PRI",
    question_text: "Existe processo para anonimização ou pseudonimização de dados usados em IA?",
    expected_evidence: "Procedimentos de anonimização documentados",
    imperative_checks: "Verificar técnicas utilizadas e efetividade",
    risk_summary: "Dados identificáveis aumentam risco de reidentificação",
    frameworks: ["LGPD"],
    ownership_type: "Engineering"
  },
  // PRI.2 Questions
  {
    question_id: "PRI.2.1",
    subcat_id: "PRI.2",
    domain_id: "PRI",
    question_text: "Existe processo para atender solicitações de titulares sobre decisões automatizadas (Art. 20 LGPD)?",
    expected_evidence: "Procedimento de atendimento e registros de solicitações",
    imperative_checks: "Verificar SLA e completude das respostas",
    risk_summary: "Não atendimento pode gerar sanções da ANPD",
    frameworks: ["LGPD"],
    ownership_type: "GRC"
  },
  {
    question_id: "PRI.2.2",
    subcat_id: "PRI.2",
    domain_id: "PRI",
    question_text: "Os titulares são informados quando estão sujeitos a decisões automatizadas?",
    expected_evidence: "Políticas de privacidade e avisos de transparência",
    imperative_checks: "Verificar clareza e acessibilidade das informações",
    risk_summary: "Falta de transparência viola direitos dos titulares",
    frameworks: ["LGPD"],
    ownership_type: "GRC"
  },
  // PRI.3 Questions
  {
    question_id: "PRI.3.1",
    subcat_id: "PRI.3",
    domain_id: "PRI",
    question_text: "Os sistemas de IA possuem capacidade de explicar suas decisões de forma compreensível?",
    expected_evidence: "Documentação de mecanismos de explicabilidade",
    imperative_checks: "Verificar técnicas utilizadas (LIME, SHAP, etc.)",
    risk_summary: "Decisões inexplicáveis podem ser contestadas judicialmente",
    frameworks: ["LGPD", "NIST AI RMF", "ISO 23894"],
    ownership_type: "Engineering"
  },
  {
    question_id: "PRI.3.2",
    subcat_id: "PRI.3",
    domain_id: "PRI",
    question_text: "As explicações geradas são armazenadas para fins de auditoria e contestação?",
    expected_evidence: "Logs de explicações e política de retenção",
    imperative_checks: "Verificar período de retenção e acessibilidade",
    risk_summary: "Sem registro, não é possível justificar decisões passadas",
    frameworks: ["LGPD", "NIST AI RMF"],
    ownership_type: "Engineering"
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = await req.json();

    if (action === "seed-frameworks") {
      const { error } = await supabase
        .from("default_frameworks")
        .upsert(defaultFrameworks, { onConflict: "framework_id" });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Frameworks seeded successfully", count: defaultFrameworks.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "seed-domains") {
      const { error } = await supabase
        .from("domains")
        .upsert(defaultDomains, { onConflict: "domain_id" });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Domains seeded successfully", count: defaultDomains.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "seed-subcategories") {
      const { error } = await supabase
        .from("subcategories")
        .upsert(defaultSubcategories, { onConflict: "subcat_id" });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Subcategories seeded successfully", count: defaultSubcategories.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "seed-questions") {
      const batchSize = 50;
      for (let i = 0; i < defaultQuestions.length; i += batchSize) {
        const batch = defaultQuestions.slice(i, i + batchSize);
        const { error } = await supabase
          .from("default_questions")
          .upsert(batch, { onConflict: "question_id" });

        if (error) throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: `${defaultQuestions.length} questions seeded successfully`, count: defaultQuestions.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "seed-all") {
      // Seed frameworks
      const { error: fwError } = await supabase
        .from("default_frameworks")
        .upsert(defaultFrameworks, { onConflict: "framework_id" });
      if (fwError) throw fwError;

      // Seed domains
      const { error: domError } = await supabase
        .from("domains")
        .upsert(defaultDomains, { onConflict: "domain_id" });
      if (domError) throw domError;

      // Seed subcategories
      const { error: subError } = await supabase
        .from("subcategories")
        .upsert(defaultSubcategories, { onConflict: "subcat_id" });
      if (subError) throw subError;

      // Seed questions
      const batchSize = 50;
      for (let i = 0; i < defaultQuestions.length; i += batchSize) {
        const batch = defaultQuestions.slice(i, i + batchSize);
        const { error } = await supabase
          .from("default_questions")
          .upsert(batch, { onConflict: "question_id" });
        if (error) throw error;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "All data seeded successfully",
          counts: {
            frameworks: defaultFrameworks.length,
            domains: defaultDomains.length,
            subcategories: defaultSubcategories.length,
            questions: defaultQuestions.length
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Valid actions: seed-frameworks, seed-domains, seed-subcategories, seed-questions, seed-all" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
