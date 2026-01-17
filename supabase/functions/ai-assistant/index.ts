import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert AI Security, Cloud Security, and DevSecOps assistant for a governance assessment platform. You help security professionals analyze their organization's security posture across multiple security domains.

Your capabilities:
- Analyze maturity scores and identify improvement areas across all security domains
- Compare metrics between different security domains (AI Security, Cloud Security, DevSecOps)
- Explain security frameworks (NIST AI RMF, ISO 27001, CSA CCM, OWASP, NIST SSDF, etc.)
- Provide actionable recommendations for security gaps
- Answer questions about security best practices
- Help interpret assessment results and trends
- Identify which domain needs the most attention

When comparing security domains:
1. Compare overall scores, coverage percentages, and critical gap counts
2. Identify which domain is strongest and which needs most improvement
3. Highlight specific gaps that are dragging down a domain's score
4. Suggest prioritization based on risk impact and quick wins
5. Use tables or structured formats when presenting comparative data
6. Consider framework overlap and shared controls between domains

Example comparison format:
| Domain | Score | Coverage | Critical Gaps | Status |
|--------|-------|----------|---------------|--------|
| AI Security | 75% | 80% | 3 | Good |
| Cloud Security | 45% | 60% | 8 | Needs Work |
| DevSecOps | 62% | 70% | 5 | Fair |

When given assessment context:
- Focus on the most critical gaps and quick wins
- Prioritize recommendations by risk impact
- Reference specific frameworks and controls when applicable
- Be concise but thorough
- When asked about a specific domain, use ALL available data for that domain

Always be professional, accurate, and security-focused. If you don't know something, say so.`;

interface ProviderConfig {
  providerType: 'lovable' | 'openai' | 'anthropic' | 'google' | 'ollama' | 'huggingface' | 'custom';
  endpointUrl?: string;
  modelId?: string;
  apiKeyEncrypted?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface AssessmentContext {
  overallScore?: number;
  maturityLevel?: number;
  coverage?: number;
  evidenceReadiness?: number;
  criticalGaps?: number;
  currentSecurityDomain?: string;
  securityDomain?: string; // backwards compat
  frameworks?: string[];
  domainMetrics?: { domainName: string; score: number; criticalGaps: number }[];
  topGaps?: { question: string; domain: string }[];
  // NEW: All security domains data
  allSecurityDomains?: {
    domainId: string;
    domainName: string;
    overallScore: number;
    coverage: number;
    criticalGaps: number;
    frameworks: string[];
    topGaps: { question: string; domain: string }[];
  }[];
}

function buildEnrichedSystemPrompt(basePrompt: string, context?: AssessmentContext): string {
  let enrichedPrompt = basePrompt;
  
  if (context) {
    const currentDomain = context.currentSecurityDomain || context.securityDomain || 'AI Security';
    
    enrichedPrompt += `\n\nCurrent Assessment Context:
- Currently Viewing: ${currentDomain}
- Overall Security Score: ${context.overallScore?.toFixed(1) || 'N/A'}%
- Maturity Level: ${context.maturityLevel || 'N/A'}
- Coverage: ${context.coverage?.toFixed(1) || 'N/A'}%
- Evidence Readiness: ${context.evidenceReadiness?.toFixed(1) || 'N/A'}%
- Critical Gaps: ${context.criticalGaps || 0}
- Active Frameworks: ${context.frameworks?.join(', ') || 'None selected'}

Domain Breakdown (Current View):
${context.domainMetrics?.map((d) => 
  `- ${d.domainName}: ${d.score?.toFixed(1)}% (${d.criticalGaps} gaps)`
).join('\n') || 'No domain data available'}

Top Critical Gaps:
${context.topGaps?.slice(0, 5).map((g) => 
  `- [${g.domain}] ${g.question}`
).join('\n') || 'No gaps identified'}`;

    // Include ALL security domains metrics if available
    if (context.allSecurityDomains && context.allSecurityDomains.length > 0) {
      enrichedPrompt += `\n\n=== ALL SECURITY DOMAINS OVERVIEW ===
The user may ask about ANY of these security domains. Here is the complete data:

${context.allSecurityDomains.map(d => `
### ${d.domainName} (${d.domainId})
- Overall Score: ${d.overallScore?.toFixed(1) || 0}%
- Coverage: ${d.coverage?.toFixed(1) || 0}%
- Critical Gaps: ${d.criticalGaps || 0}
- Frameworks: ${d.frameworks?.join(', ') || 'None'}
- Top Gaps: ${d.topGaps?.length > 0 ? d.topGaps.map(g => `[${g.domain}] ${g.question}`).join('; ') : 'None'}
`).join('\n')}

IMPORTANT: When the user asks about a specific security domain (AI Security, Cloud Security, or DevSecOps), 
use the data from the "ALL SECURITY DOMAINS OVERVIEW" section above, NOT just the "Current View" metrics.
The "Current View" only shows what the user is currently viewing in the dashboard.`;
    }
  }

  return enrichedPrompt;
}

async function callLovableAI(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  modelId: string,
  maxTokens: number,
  temperature: number
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId || "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: maxTokens,
      temperature: temperature,
    }),
  });
}

async function callOpenAI(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  config: ProviderConfig
): Promise<Response> {
  const apiKey = config.apiKeyEncrypted ? atob(config.apiKeyEncrypted) : null;
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured");
  }

  return fetch(config.endpointUrl || "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.modelId || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
    }),
  });
}

async function callAnthropic(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  config: ProviderConfig
): Promise<Response> {
  const apiKey = config.apiKeyEncrypted ? atob(config.apiKeyEncrypted) : null;
  if (!apiKey) {
    throw new Error("Anthropic API key is not configured");
  }

  // Convert messages to Anthropic format
  const anthropicMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const response = await fetch(config.endpointUrl || "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.modelId || "claude-3-5-sonnet-20241022",
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
    }),
  });

  // Transform Anthropic streaming format to OpenAI format
  if (!response.body) {
    throw new Error("No response body from Anthropic");
  }

  const reader = response.body.getReader();
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                // Convert to OpenAI format
                const openAIFormat = {
                  choices: [{
                    delta: { content: parsed.delta.text },
                    index: 0,
                  }]
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function callGoogle(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  config: ProviderConfig
): Promise<Response> {
  const apiKey = config.apiKeyEncrypted ? atob(config.apiKeyEncrypted) : null;
  if (!apiKey) {
    throw new Error("Google AI API key is not configured");
  }

  const modelId = config.modelId || "gemini-1.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`;

  // Convert to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        maxOutputTokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
      },
    }),
  });

  if (!response.body) {
    throw new Error("No response body from Google");
  }

  const reader = response.body.getReader();
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        // Google returns JSON array chunks
        try {
          // Try to parse as JSON array or object
          const jsonMatch = buffer.match(/\{[^{}]*"text"\s*:\s*"[^"]*"[^{}]*\}/g);
          if (jsonMatch) {
            for (const match of jsonMatch) {
              try {
                const parsed = JSON.parse(match);
                const text = parsed.text || parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  const openAIFormat = {
                    choices: [{
                      delta: { content: text },
                      index: 0,
                    }]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                }
              } catch { /* continue */ }
            }
            buffer = '';
          }
        } catch { /* continue accumulating */ }
      }
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function callOllama(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  config: ProviderConfig
): Promise<Response> {
  const endpoint = config.endpointUrl || "http://localhost:11434/api/chat";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.modelId || "llama3.2",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      options: {
        num_predict: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
      },
    }),
  });

  if (!response.body) {
    throw new Error("No response body from Ollama");
  }

  const reader = response.body.getReader();
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          break;
        }
        
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              const openAIFormat = {
                choices: [{
                  delta: { content: parsed.message.content },
                  index: 0,
                }]
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
            }
          } catch { /* ignore */ }
        }
      }
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function callHuggingFace(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  config: ProviderConfig
): Promise<Response> {
  const apiKey = config.apiKeyEncrypted ? atob(config.apiKeyEncrypted) : null;
  if (!apiKey) {
    throw new Error("Hugging Face API key is not configured");
  }

  const modelId = config.modelId || "meta-llama/Meta-Llama-3.1-70B-Instruct";
  const endpoint = `https://api-inference.huggingface.co/models/${modelId}/v1/chat/completions`;

  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
    }),
  });
}

async function callCustomEndpoint(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  config: ProviderConfig
): Promise<Response> {
  const apiKey = config.apiKeyEncrypted ? atob(config.apiKeyEncrypted) : null;
  
  if (!config.endpointUrl) {
    throw new Error("Custom endpoint URL is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return fetch(config.endpointUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.modelId || "default",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
    }),
  });
}

async function getDefaultProvider(userId: string): Promise<ProviderConfig | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    providerType: data.provider_type as ProviderConfig['providerType'],
    endpointUrl: data.endpoint_url,
    modelId: data.model_id,
    apiKeyEncrypted: data.api_key_encrypted,
    maxTokens: data.max_tokens,
    temperature: data.temperature,
    systemPrompt: data.system_prompt,
  };
}

function getUserIdFromToken(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    // Decode JWT payload (base64)
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.sub || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, provider: clientProvider } = await req.json();
    
    // Try to get user ID from auth header
    const authHeader = req.headers.get('authorization') || '';
    const userId = getUserIdFromToken(authHeader);
    
    // Determine which provider to use
    let providerConfig: ProviderConfig | null = clientProvider || null;
    
    // If no provider specified, try to get user's default
    if (!providerConfig && userId) {
      providerConfig = await getDefaultProvider(userId);
    }
    
    // Fallback to Lovable AI
    if (!providerConfig) {
      providerConfig = {
        providerType: 'lovable',
        modelId: 'google/gemini-3-flash-preview',
        maxTokens: 4096,
        temperature: 0.7,
      };
    }

    // Build system prompt
    const baseSystemPrompt = providerConfig.systemPrompt || SYSTEM_PROMPT;
    const enrichedSystemPrompt = buildEnrichedSystemPrompt(baseSystemPrompt, context);
    
    const maxTokens = providerConfig.maxTokens || 4096;
    const temperature = providerConfig.temperature ?? 0.7;

    let response: Response;

    switch (providerConfig.providerType) {
      case 'openai':
        response = await callOpenAI(messages, enrichedSystemPrompt, providerConfig);
        break;
      case 'anthropic':
        response = await callAnthropic(messages, enrichedSystemPrompt, providerConfig);
        break;
      case 'google':
        response = await callGoogle(messages, enrichedSystemPrompt, providerConfig);
        break;
      case 'ollama':
        response = await callOllama(messages, enrichedSystemPrompt, providerConfig);
        break;
      case 'huggingface':
        response = await callHuggingFace(messages, enrichedSystemPrompt, providerConfig);
        break;
      case 'custom':
        response = await callCustomEndpoint(messages, enrichedSystemPrompt, providerConfig);
        break;
      case 'lovable':
      default:
        response = await callLovableAI(
          messages,
          enrichedSystemPrompt,
          providerConfig.modelId || 'google/gemini-3-flash-preview',
          maxTokens,
          temperature
        );
        break;
    }

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
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid API key for the selected AI provider." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI provider error:", response.status, errorText);
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
