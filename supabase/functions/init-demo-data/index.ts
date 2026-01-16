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
