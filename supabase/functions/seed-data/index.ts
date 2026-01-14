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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, data } = await req.json();

    if (action === "seed-frameworks") {
      // Insert default frameworks
      const { error } = await supabase
        .from("default_frameworks")
        .upsert(defaultFrameworks, { onConflict: "framework_id" });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Frameworks seeded successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "seed-domains") {
      const { domains } = data;
      const { error } = await supabase
        .from("domains")
        .upsert(domains.map((d: any) => ({
          domain_id: d.domainId,
          domain_name: d.domainName,
          display_order: d.order,
          nist_ai_rmf_function: d.nistAiRmfFunction,
          strategic_question: d.strategicQuestion,
          description: d.description,
          banking_relevance: d.bankingRelevance
        })), { onConflict: "domain_id" });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Domains seeded successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "seed-subcategories") {
      const { subcategories } = data;
      const { error } = await supabase
        .from("subcategories")
        .upsert(subcategories.map((s: any) => ({
          subcat_id: s.subcatId,
          domain_id: s.domainId,
          subcat_name: s.subcatName,
          definition: s.definition,
          objective: s.objective,
          security_outcome: s.securityOutcome,
          criticality: s.criticality,
          weight: s.weight,
          ownership_type: s.ownershipType,
          risk_summary: s.riskSummary,
          framework_refs: s.frameworkRefs || []
        })), { onConflict: "subcat_id" });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Subcategories seeded successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "seed-questions") {
      const { questions } = data;
      // Insert in batches of 50 to avoid timeout
      const batchSize = 50;
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        const { error } = await supabase
          .from("default_questions")
          .upsert(batch.map((q: any) => ({
            question_id: q.questionId,
            subcat_id: q.subcatId,
            domain_id: q.domainId,
            question_text: q.questionText,
            expected_evidence: q.expectedEvidence,
            imperative_checks: q.imperativeChecks,
            risk_summary: q.riskSummary,
            frameworks: q.frameworks || [],
            ownership_type: q.ownershipType
          })), { onConflict: "question_id" });

        if (error) throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: `${questions.length} questions seeded successfully` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
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
