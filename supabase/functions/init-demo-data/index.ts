import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Demo user email
const DEMO_EMAIL = 'demo@aiassess.app';

// Response distribution for realistic demo data
// ~40% Sim, ~30% Parcial, ~20% Não, ~10% NA
const getRandomResponse = (seed: number): string => {
  const rand = (seed * 9301 + 49297) % 233280 / 233280;
  if (rand < 0.40) return 'Sim';
  if (rand < 0.70) return 'Parcial';
  if (rand < 0.90) return 'Não';
  return 'NA';
};

// Evidence status based on response (using Portuguese values)
const getEvidenceStatus = (response: string, seed: number): string | null => {
  if (response === 'NA') return null;
  if (response === 'Não') return null;
  const rand = (seed * 7919 + 31337) % 233280 / 233280;
  if (response === 'Sim') {
    return rand < 0.7 ? 'Sim' : 'Parcial';
  }
  // Parcial response
  return rand < 0.5 ? 'Parcial' : 'Não';
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

    // Fetch all default questions
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('default_questions')
      .select('question_id, security_domain_id');

    if (questionsError) {
      throw new Error(`Error fetching questions: ${questionsError.message}`);
    }

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
      const seed = q.question_id.charCodeAt(q.question_id.length - 1) + index;
      const response = getRandomResponse(seed);
      const evidenceOk = getEvidenceStatus(response, seed);
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

    // Summary by domain
    const domainSummary: Record<string, { total: number; yes: number; partial: number; no: number; na: number }> = {};
    
    for (const answer of answers) {
      const domain = answer.security_domain_id || 'UNKNOWN';
      if (!domainSummary[domain]) {
        domainSummary[domain] = { total: 0, yes: 0, partial: 0, no: 0, na: 0 };
      }
      domainSummary[domain].total++;
      if (answer.response === 'Yes') domainSummary[domain].yes++;
      else if (answer.response === 'Partial') domainSummary[domain].partial++;
      else if (answer.response === 'No') domainSummary[domain].no++;
      else domainSummary[domain].na++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data created successfully',
        answersCreated: insertedCount,
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
