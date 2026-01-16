import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert AI Security, Cloud Security, and DevSecOps assistant for a governance assessment platform. You help security professionals analyze their organization's security posture.

Your capabilities:
- Analyze maturity scores and identify improvement areas
- Explain security frameworks (NIST AI RMF, ISO 27001, CSA CCM, OWASP, etc.)
- Provide actionable recommendations for security gaps
- Answer questions about security best practices
- Help interpret assessment results and trends

When given assessment context:
- Focus on the most critical gaps and quick wins
- Prioritize recommendations by risk impact
- Reference specific frameworks and controls when applicable
- Be concise but thorough

Always be professional, accurate, and security-focused. If you don't know something, say so.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context-aware system prompt
    let enrichedSystemPrompt = SYSTEM_PROMPT;
    
    if (context) {
      enrichedSystemPrompt += `\n\nCurrent Assessment Context:
- Overall Security Score: ${context.overallScore?.toFixed(1) || 'N/A'}%
- Maturity Level: ${context.maturityLevel || 'N/A'}
- Coverage: ${context.coverage?.toFixed(1) || 'N/A'}%
- Evidence Readiness: ${context.evidenceReadiness?.toFixed(1) || 'N/A'}%
- Critical Gaps: ${context.criticalGaps || 0}
- Security Domain: ${context.securityDomain || 'AI Security'}
- Active Frameworks: ${context.frameworks?.join(', ') || 'None selected'}

Domain Breakdown:
${context.domainMetrics?.map((d: { domainName: string; score: number; criticalGaps: number }) => 
  `- ${d.domainName}: ${d.score?.toFixed(1)}% (${d.criticalGaps} gaps)`
).join('\n') || 'No domain data available'}

Top Critical Gaps:
${context.topGaps?.slice(0, 5).map((g: { question: string; domain: string }) => 
  `- [${g.domain}] ${g.question}`
).join('\n') || 'No gaps identified'}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: enrichedSystemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
