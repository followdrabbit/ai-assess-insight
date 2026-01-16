import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Demo user credentials
const DEMO_EMAIL = 'demo@aiassess.app';
const DEMO_PASSWORD = 'Demo@2025!';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if demo user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Error listing users: ${listError.message}`);
    }

    const demoUserExists = existingUsers?.users?.some(
      (user) => user.email === DEMO_EMAIL
    );

    if (demoUserExists) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Demo user already exists',
          email: DEMO_EMAIL,
          created: false,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create demo user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        display_name: 'Demo User',
        organization: 'AI Assess Demo',
        role: 'Security Analyst',
      },
    });

    if (createError) {
      throw new Error(`Error creating demo user: ${createError.message}`);
    }

    // Create profile for demo user
    if (newUser?.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: newUser.user.id,
          email: DEMO_EMAIL,
          display_name: 'Demo User',
          organization: 'AI Assess Demo',
          role: 'Security Analyst',
          language: 'pt-BR',
          notify_security_alerts: true,
          notify_assessment_updates: true,
          notify_weekly_digest: true,
          notify_new_features: true,
        }, { onConflict: 'user_id' });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo user created successfully',
        email: DEMO_EMAIL,
        created: true,
        userId: newUser?.user?.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error) {
    console.error('Error in init-demo-user:', error);
    
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
