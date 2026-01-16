import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Demo user email
const DEMO_EMAIL = 'demo@aiassess.app';

// Response distribution for realistic demo data
// ~40% Sim, ~30% Parcial, ~20% Não, ~10% NA
const getRandomResponse = (index: number): string => {
  // Use simple modulo for better distribution
  const mod = index % 10;
  if (mod < 4) return 'Sim';       // 0,1,2,3 = 40%
  if (mod < 7) return 'Parcial';   // 4,5,6 = 30%
  if (mod < 9) return 'Não';       // 7,8 = 20%
  return 'NA';                      // 9 = 10%
};

// Evidence status based on response (using Portuguese values)
const getEvidenceStatus = (response: string, index: number): string | null => {
  if (response === 'NA') return null;
  if (response === 'Não') return null;
  const mod = index % 3;
  if (response === 'Sim') {
    return mod < 2 ? 'Sim' : 'Parcial';  // 66% Sim, 33% Parcial
  }
  // Parcial response
  return mod === 0 ? 'Parcial' : 'Não';
};

// Generate demo notes based on response
const getDemoNote = (response: string, questionId: string): string => {
  const notes: Record<string, string[]> = {
    'Sim': [
      'Controle implementado e documentado.',
      'Processo validado na última auditoria.',
      'Evidências atualizadas mensalmente.',
      'Em conformidade com políticas internas.',
    ],
    'Parcial': [
      'Em processo de implementação.',
      'Cobertura parcial - pendente expansão.',
      'Documentação em atualização.',
      'Gaps identificados no último assessment.',
    ],
    'Não': [
      'Priorizado para Q2 2026.',
      'Aguardando aprovação de orçamento.',
      'Dependência de projeto em andamento.',
      'Em análise de viabilidade.',
    ],
    'NA': [
      'Não aplicável ao contexto atual.',
      'Fora do escopo da organização.',
    ],
  };
  
  const options = notes[response] || notes['NA'];
  const index = questionId.length % options.length;
  return options[index];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find demo user
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Error listing users: ${listError.message}`);
    }

    const demoUser = users?.users?.find((user) => user.email === DEMO_EMAIL);
    
    if (!demoUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Demo user not found. Please run init-demo-user first.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const demoUserId = demoUser.id;

    // AI Security questions from JSON (hardcoded IDs)
    const aiSecurityQuestions = [
      // GOVERN (20 questions)
      'GOVERN-01-Q01', 'GOVERN-01-Q02', 'GOVERN-01-Q03', 'GOVERN-01-Q04',
      'GOVERN-02-Q01', 'GOVERN-02-Q02', 'GOVERN-02-Q03', 'GOVERN-02-Q04',
      'GOVERN-03-Q01', 'GOVERN-03-Q02', 'GOVERN-03-Q03', 'GOVERN-03-Q04',
      'GOVERN-04-Q01', 'GOVERN-04-Q02', 'GOVERN-04-Q03', 'GOVERN-04-Q04',
      'GOVERN-05-Q01', 'GOVERN-05-Q02', 'GOVERN-05-Q03',
      // MAP (28 questions)
      'MAP-01-Q01', 'MAP-01-Q02', 'MAP-01-Q03', 'MAP-01-Q04',
      'MAP-02-Q01', 'MAP-02-Q02', 'MAP-02-Q03', 'MAP-02-Q04',
      'MAP-03-Q01', 'MAP-03-Q02', 'MAP-03-Q03', 'MAP-03-Q04',
      'MAP-04-Q01', 'MAP-04-Q02', 'MAP-04-Q03', 'MAP-04-Q04',
      'MAP-05-Q01', 'MAP-05-Q02', 'MAP-05-Q03', 'MAP-05-Q04',
      'MAP-06-Q01', 'MAP-06-Q02', 'MAP-06-Q03', 'MAP-06-Q04',
      'MAP-07-Q01', 'MAP-07-Q02', 'MAP-07-Q03', 'MAP-07-Q04', 'MAP-07-Q05',
      // DATA (24 questions)
      'DATA-01-Q01', 'DATA-01-Q02', 'DATA-01-Q03', 'DATA-01-Q04', 'DATA-01-Q05', 'DATA-01-Q06',
      'DATA-02-Q01', 'DATA-02-Q02', 'DATA-02-Q03', 'DATA-02-Q04', 'DATA-02-Q05', 'DATA-02-Q06',
      'DATA-03-Q01', 'DATA-03-Q02', 'DATA-03-Q03', 'DATA-03-Q04', 'DATA-03-Q05', 'DATA-03-Q06',
      'DATA-04-Q01', 'DATA-04-Q02', 'DATA-04-Q03', 'DATA-04-Q04', 'DATA-04-Q05', 'DATA-04-Q06',
      // DEVELOP (18 questions)
      'DEVELOP-01-Q01', 'DEVELOP-01-Q02', 'DEVELOP-01-Q03', 'DEVELOP-01-Q04', 'DEVELOP-01-Q05', 'DEVELOP-01-Q06',
      'DEVELOP-02-Q01', 'DEVELOP-02-Q02', 'DEVELOP-02-Q03', 'DEVELOP-02-Q04', 'DEVELOP-02-Q05', 'DEVELOP-02-Q06',
      'DEVELOP-03-Q01', 'DEVELOP-03-Q02', 'DEVELOP-03-Q03', 'DEVELOP-03-Q04', 'DEVELOP-03-Q05', 'DEVELOP-03-Q06',
      // MEASURE (19 questions)
      'MEASURE-01-Q01', 'MEASURE-01-Q02', 'MEASURE-01-Q03',
      'MEASURE-02-Q01', 'MEASURE-02-Q02', 'MEASURE-02-Q03',
      'MEASURE-03-Q01', 'MEASURE-03-Q02', 'MEASURE-03-Q03',
      'MEASURE-04-Q01', 'MEASURE-04-Q02', 'MEASURE-04-Q03',
      'MEASURE-05-Q01', 'MEASURE-05-Q02', 'MEASURE-05-Q03',
      'MEASURE-06-Q01', 'MEASURE-06-Q02', 'MEASURE-06-Q03',
      // PROTECT (14 questions)
      'PROTECT-01-Q01', 'PROTECT-01-Q02', 'PROTECT-01-Q03', 'PROTECT-01-Q04',
      'PROTECT-02-Q01', 'PROTECT-02-Q02', 'PROTECT-02-Q03', 'PROTECT-02-Q04', 'PROTECT-02-Q05',
      'PROTECT-03-Q01', 'PROTECT-03-Q02', 'PROTECT-03-Q03',
      // DETECT (11 questions)
      'DETECT-01-Q01', 'DETECT-01-Q02', 'DETECT-01-Q03', 'DETECT-01-Q04',
      'DETECT-02-Q01', 'DETECT-02-Q02', 'DETECT-02-Q03', 'DETECT-02-Q04',
      // RESPOND (9 questions)
      'RESPOND-01-Q01', 'RESPOND-01-Q02', 'RESPOND-01-Q03', 'RESPOND-01-Q04',
      'RESPOND-02-Q01', 'RESPOND-02-Q02', 'RESPOND-02-Q03',
    ].map(id => ({ question_id: id, security_domain_id: 'AI_SECURITY' }));

    // Fetch all default questions from database (CLOUD_SECURITY, DEVSECOPS)
    const { data: dbQuestions, error: questionsError } = await supabaseAdmin
      .from('default_questions')
      .select('question_id, security_domain_id');

    if (questionsError) {
      throw new Error(`Error fetching questions: ${questionsError.message}`);
    }

    // Combine AI Security questions with database questions
    const questions = [...aiSecurityQuestions, ...(dbQuestions || [])];

    // Check existing answers
    const { data: existingAnswers } = await supabaseAdmin
      .from('answers')
      .select('question_id')
      .eq('user_id', demoUserId);

    const existingIds = new Set(existingAnswers?.map(a => a.question_id) || []);

    // Filter out questions that already have answers
    const questionsToAnswer = questions?.filter(q => !existingIds.has(q.question_id)) || [];

    if (questionsToAnswer.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Demo data already exists',
          answersCount: existingAnswers?.length || 0,
          created: false,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Generate answers for all questions
    const answers = questionsToAnswer.map((q, index) => {
      const response = getRandomResponse(index);
      const evidenceOk = getEvidenceStatus(response, index);
      const notes = getDemoNote(response, q.question_id);

      return {
        question_id: q.question_id,
        security_domain_id: q.security_domain_id,
        user_id: demoUserId,
        response,
        evidence_ok: evidenceOk,
        notes,
        evidence_links: response === 'Sim' && evidenceOk === 'Sim' 
          ? ['https://docs.example.com/evidence/' + q.question_id.toLowerCase()]
          : [],
      };
    });

    // Insert answers in batches
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < answers.length; i += batchSize) {
      const batch = answers.slice(i, i + batchSize);
      const { error: insertError } = await supabaseAdmin
        .from('answers')
        .insert(batch);

      if (insertError) {
        console.error('Batch insert error:', insertError);
        throw new Error(`Error inserting answers: ${insertError.message}`);
      }
      insertedCount += batch.length;
    }

    // Create assessment_meta for demo user with all frameworks enabled
    const frameworks = [
      'NIST_AI_RMF', 'ISO_27001_27002', 'LGPD', 'BACEN_4893',
      'CIS_CONTROLS', 'CSA_CCM', 'NIST_CSF', 'SOC2'
    ];

    await supabaseAdmin
      .from('assessment_meta')
      .upsert({
        id: 'current',
        user_id: demoUserId,
        enabled_frameworks: frameworks,
        selected_frameworks: frameworks,
        security_domain_id: 'AI_SECURITY',
        name: 'Demo Assessment',
        version: '2.0.0',
      }, { onConflict: 'id,user_id' });

    // Generate historical maturity snapshots for the last 90 days
    const securityDomains = ['AI_SECURITY', 'CLOUD_SECURITY', 'DEVSECOPS'];
    const domainNames: Record<string, string[]> = {
      'AI_SECURITY': ['Governança de IA', 'Mapeamento de Riscos', 'Gestão de Dados', 'Desenvolvimento Responsável', 'Medição e Avaliação', 'Proteção de Modelos', 'Detecção de Anomalias', 'Resposta a Incidentes'],
      'CLOUD_SECURITY': ['Identidade e Acesso', 'Proteção de Dados', 'Segurança de Rede', 'Configuração Segura', 'Monitoramento', 'Resposta a Incidentes', 'Conformidade', 'Resiliência'],
      'DEVSECOPS': ['Planejamento Seguro', 'Desenvolvimento Seguro', 'Build Seguro', 'Teste de Segurança', 'Deploy Seguro', 'Operação Segura', 'Monitoramento', 'Resposta a Incidentes'],
    };
    
    const frameworksByDomain: Record<string, string[]> = {
      'AI_SECURITY': ['NIST AI RMF', 'ISO/IEC 42001', 'EU AI Act'],
      'CLOUD_SECURITY': ['CSA CCM', 'CIS Controls', 'NIST CSF'],
      'DEVSECOPS': ['NIST SSDF', 'OWASP SAMM', 'CIS Controls'],
    };

    // Check existing snapshots
    const { data: existingSnapshots } = await supabaseAdmin
      .from('maturity_snapshots')
      .select('snapshot_date, security_domain_id')
      .eq('user_id', demoUserId);

    const existingSnapshotKeys = new Set(
      (existingSnapshots || []).map(s => `${s.snapshot_date}_${s.security_domain_id}`)
    );

    const snapshots = [];
    const today = new Date();
    
    for (const domainId of securityDomains) {
      // Generate snapshots for 90 days with progressive improvement
      for (let daysAgo = 90; daysAgo >= 0; daysAgo -= 3) { // Every 3 days
        const snapshotDate = new Date(today);
        snapshotDate.setDate(snapshotDate.getDate() - daysAgo);
        const dateStr = snapshotDate.toISOString().split('T')[0];
        
        // Skip if snapshot already exists
        const snapshotKey = `${dateStr}_${domainId}`;
        if (existingSnapshotKeys.has(snapshotKey)) continue;
        
        // Calculate progressive metrics (starting lower, improving over time)
        const progress = 1 - (daysAgo / 90); // 0 to 1
        const baseScore = 45 + Math.random() * 10; // Start at 45-55
        const scoreGrowth = progress * (25 + Math.random() * 10); // Grow by 25-35 points
        const noise = (Math.random() - 0.5) * 5; // Add some noise
        
        const overallScore = Math.min(95, Math.max(30, baseScore + scoreGrowth + noise));
        const baseCoverage = 50 + Math.random() * 10;
        const coverageGrowth = progress * (35 + Math.random() * 10);
        const overallCoverage = Math.min(98, Math.max(40, baseCoverage + coverageGrowth + noise));
        const evidenceReadiness = Math.min(95, Math.max(25, overallScore - 10 + Math.random() * 15));
        
        // Calculate maturity level based on score
        let maturityLevel = 1;
        if (overallScore >= 80) maturityLevel = 5;
        else if (overallScore >= 65) maturityLevel = 4;
        else if (overallScore >= 50) maturityLevel = 3;
        else if (overallScore >= 35) maturityLevel = 2;
        
        const totalQuestions = domainId === 'AI_SECURITY' ? 143 : domainId === 'CLOUD_SECURITY' ? 36 : 44;
        const answeredQuestions = Math.floor(totalQuestions * (overallCoverage / 100));
        const criticalGaps = Math.max(0, Math.floor((100 - overallScore) / 10) - Math.floor(progress * 3));
        
        // Generate domain metrics
        const domainMetrics = (domainNames[domainId] || []).map((name, idx) => {
          const domainVariance = (Math.random() - 0.5) * 20;
          return {
            domainId: `DOM-${idx + 1}`,
            domainName: name,
            score: Math.min(100, Math.max(20, overallScore + domainVariance)),
            coverage: Math.min(100, Math.max(30, overallCoverage + domainVariance * 0.5)),
            criticalGaps: Math.max(0, Math.floor((100 - overallScore - domainVariance) / 20)),
          };
        });
        
        // Generate framework metrics
        const frameworkMetrics = (frameworksByDomain[domainId] || []).map(fw => {
          const fwVariance = (Math.random() - 0.5) * 15;
          const fwTotal = Math.floor(totalQuestions / 3);
          return {
            framework: fw,
            score: Math.min(100, Math.max(25, overallScore + fwVariance)),
            coverage: Math.min(100, Math.max(35, overallCoverage + fwVariance * 0.5)),
            totalQuestions: fwTotal,
            answeredQuestions: Math.floor(fwTotal * (overallCoverage / 100)),
          };
        });

        // Generate framework category metrics
        const frameworkCategoryMetrics = [
          { categoryId: 'CAT-1', categoryName: 'Identificação', score: overallScore + (Math.random() - 0.5) * 10, coverage: overallCoverage },
          { categoryId: 'CAT-2', categoryName: 'Proteção', score: overallScore + (Math.random() - 0.5) * 10, coverage: overallCoverage },
          { categoryId: 'CAT-3', categoryName: 'Detecção', score: overallScore + (Math.random() - 0.5) * 10, coverage: overallCoverage },
          { categoryId: 'CAT-4', categoryName: 'Resposta', score: overallScore + (Math.random() - 0.5) * 10, coverage: overallCoverage },
          { categoryId: 'CAT-5', categoryName: 'Recuperação', score: overallScore + (Math.random() - 0.5) * 10, coverage: overallCoverage },
        ];
        
        snapshots.push({
          snapshot_date: dateStr,
          snapshot_type: 'automatic',
          security_domain_id: domainId,
          user_id: demoUserId,
          overall_score: Math.round(overallScore * 10) / 10,
          overall_coverage: Math.round(overallCoverage * 10) / 10,
          evidence_readiness: Math.round(evidenceReadiness * 10) / 10,
          maturity_level: maturityLevel,
          total_questions: totalQuestions,
          answered_questions: answeredQuestions,
          critical_gaps: criticalGaps,
          domain_metrics: domainMetrics,
          framework_metrics: frameworkMetrics,
          framework_category_metrics: frameworkCategoryMetrics,
        });
      }
    }

    // Insert snapshots in batches
    let snapshotsCreated = 0;
    if (snapshots.length > 0) {
      for (let i = 0; i < snapshots.length; i += batchSize) {
        const batch = snapshots.slice(i, i + batchSize);
        const { error: snapshotError } = await supabaseAdmin
          .from('maturity_snapshots')
          .insert(batch);

        if (snapshotError) {
          console.error('Snapshot insert error:', snapshotError);
          // Continue with other batches even if one fails
        } else {
          snapshotsCreated += batch.length;
        }
      }
    }

    // Create chart annotations for key milestones
    const annotationDates = [
      { daysAgo: 75, title: 'Início do Programa', type: 'milestone', color: '#22c55e' },
      { daysAgo: 60, title: 'Auditoria Interna', type: 'audit', color: '#3b82f6' },
      { daysAgo: 45, title: 'Treinamento de Equipe', type: 'milestone', color: '#8b5cf6' },
      { daysAgo: 30, title: 'Implementação NIST', type: 'framework', color: '#f59e0b' },
      { daysAgo: 15, title: 'Revisão de Políticas', type: 'policy', color: '#ef4444' },
      { daysAgo: 7, title: 'Auditoria Externa', type: 'audit', color: '#06b6d4' },
    ];

    const { data: existingAnnotations } = await supabaseAdmin
      .from('chart_annotations')
      .select('title')
      .eq('user_id', demoUserId);

    const existingTitles = new Set((existingAnnotations || []).map(a => a.title));

    const annotations = [];
    for (const domainId of securityDomains) {
      for (const ann of annotationDates) {
        const annDate = new Date(today);
        annDate.setDate(annDate.getDate() - ann.daysAgo);
        const dateStr = annDate.toISOString().split('T')[0];
        
        const fullTitle = `${ann.title} - ${domainId.replace('_', ' ')}`;
        if (existingTitles.has(fullTitle)) continue;
        
        annotations.push({
          annotation_date: dateStr,
          title: fullTitle,
          description: `Marco importante para o domínio ${domainId.replace('_', ' ')}`,
          annotation_type: ann.type,
          color: ann.color,
          security_domain_id: domainId,
          user_id: demoUserId,
        });
      }
    }

    let annotationsCreated = 0;
    if (annotations.length > 0) {
      const { error: annError } = await supabaseAdmin
        .from('chart_annotations')
        .insert(annotations);

      if (!annError) {
        annotationsCreated = annotations.length;
      }
    }

    // Summary by domain
    const domainSummary: Record<string, { total: number; yes: number; partial: number; no: number; na: number }> = {};
    
    for (const answer of answers) {
      const domain = answer.security_domain_id || 'UNKNOWN';
      if (!domainSummary[domain]) {
        domainSummary[domain] = { total: 0, yes: 0, partial: 0, no: 0, na: 0 };
      }
      domainSummary[domain].total++;
      if (answer.response === 'Sim') domainSummary[domain].yes++;
      else if (answer.response === 'Parcial') domainSummary[domain].partial++;
      else if (answer.response === 'Não') domainSummary[domain].no++;
      else domainSummary[domain].na++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data created successfully',
        answersCreated: insertedCount,
        snapshotsCreated,
        annotationsCreated,
        existingAnswers: existingAnswers?.length || 0,
        domainSummary,
        created: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error) {
    console.error('Error in init-demo-data:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
