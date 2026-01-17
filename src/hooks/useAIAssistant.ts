import { useState, useCallback, useRef, useEffect } from 'react';
import { useDashboardMetrics } from './useDashboardMetrics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getEnabledSecurityDomains, SecurityDomain } from '@/lib/securityDomains';
import { questions as defaultQuestions } from '@/lib/dataset';
import { calculateOverallMetrics, getCriticalGaps, ActiveQuestion } from '@/lib/scoring';
import { useAnswersStore } from '@/lib/stores';
import { getFrameworksBySecurityDomain } from '@/lib/frameworks';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isCommand?: boolean;
}

interface ProviderInfo {
  name: string;
  modelId: string;
  providerType: string;
}

interface SecurityDomainMetrics {
  domainId: string;
  domainName: string;
  overallScore: number;
  coverage: number;
  criticalGaps: number;
  frameworks: string[];
  topGaps: { question: string; domain: string }[];
}

interface UseAIAssistantReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  stopGeneration: () => void;
  addSystemMessage: (content: string) => void;
  currentProvider: ProviderInfo | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export function useAIAssistant(): UseAIAssistantReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<ProviderInfo | null>(null);
  const [allDomainsMetrics, setAllDomainsMetrics] = useState<SecurityDomainMetrics[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { user } = useAuth();
  const { metrics, criticalGaps, enabledFrameworks, currentDomainInfo } = useDashboardMetrics();
  const { answers } = useAnswersStore();

  // Load metrics for ALL security domains (not just selected)
  useEffect(() => {
    async function loadAllDomainsMetrics() {
      try {
        const enabledDomains = await getEnabledSecurityDomains();
        
        const metricsPromises = enabledDomains.map(async (domain: SecurityDomain) => {
          // Get questions for this domain
          const domainQuestions: ActiveQuestion[] = defaultQuestions
            .filter(q => {
              // Check if question belongs to frameworks of this security domain
              const domainFrameworks = getFrameworksBySecurityDomain(domain.domainId);
              const domainFrameworkIds = new Set(domainFrameworks.map(f => f.frameworkId));
              return (q.frameworks || []).some((fw: string) => domainFrameworkIds.has(fw));
            })
            .map(q => ({
              questionId: q.questionId,
              questionText: q.questionText,
              subcatId: q.subcatId,
              domainId: q.domainId,
              ownershipType: q.ownershipType,
              frameworks: q.frameworks || []
            }));
          
          if (domainQuestions.length === 0) return null;

          const domainMetrics = calculateOverallMetrics(answers, domainQuestions);
          const domainGaps = getCriticalGaps(answers, 0.5, domainQuestions);
          const domainFrameworks = getFrameworksBySecurityDomain(domain.domainId);
          
          return {
            domainId: domain.domainId,
            domainName: domain.domainName,
            overallScore: domainMetrics.overallScore,
            coverage: domainMetrics.coverage,
            criticalGaps: domainMetrics.criticalGaps,
            frameworks: domainFrameworks.map(f => f.shortName),
            topGaps: domainGaps.slice(0, 5).map(g => ({
              question: g.questionText,
              domain: g.domainName,
            })),
          };
        });

        const results = await Promise.all(metricsPromises);
        setAllDomainsMetrics(results.filter((m): m is SecurityDomainMetrics => m !== null));
      } catch (error) {
        console.error('Error loading all domains metrics:', error);
      }
    }

    loadAllDomainsMetrics();
  }, [answers]);

  // Load the default provider info
  useEffect(() => {
    async function loadDefaultProvider() {
      if (!user) {
        setCurrentProvider({
          name: 'Lovable AI',
          modelId: 'google/gemini-3-flash-preview',
          providerType: 'lovable',
        });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('ai_providers')
          .select('name, model_id, provider_type')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .eq('is_enabled', true)
          .single();

        if (error || !data) {
          setCurrentProvider({
            name: 'Lovable AI',
            modelId: 'google/gemini-3-flash-preview',
            providerType: 'lovable',
          });
          return;
        }

        setCurrentProvider({
          name: data.name,
          modelId: data.model_id || 'default',
          providerType: data.provider_type,
        });
      } catch {
        setCurrentProvider({
          name: 'Lovable AI',
          modelId: 'google/gemini-3-flash-preview',
          providerType: 'lovable',
        });
      }
    }

    loadDefaultProvider();
  }, [user]);

  const buildContext = useCallback(() => {
    return {
      // Current selected domain metrics (for backwards compatibility)
      overallScore: metrics.overallScore,
      maturityLevel: metrics.maturityLevel,
      coverage: metrics.coverage,
      evidenceReadiness: metrics.evidenceReadiness,
      criticalGaps: metrics.criticalGaps,
      currentSecurityDomain: currentDomainInfo?.domainName || 'AI Security',
      frameworks: enabledFrameworks.map(f => f.shortName),
      domainMetrics: metrics.domainMetrics.map(d => ({
        domainName: d.domainName,
        score: d.score,
        criticalGaps: d.criticalGaps,
      })),
      topGaps: criticalGaps.slice(0, 10).map(g => ({
        question: g.questionText,
        domain: g.domainName,
      })),
      // NEW: All security domains metrics (AI Security, Cloud Security, DevSecOps)
      allSecurityDomains: allDomainsMetrics.map(d => ({
        domainId: d.domainId,
        domainName: d.domainName,
        overallScore: d.overallScore,
        coverage: d.coverage,
        criticalGaps: d.criticalGaps,
        frameworks: d.frameworks,
        topGaps: d.topGaps,
      })),
    };
  }, [metrics, criticalGaps, enabledFrameworks, currentDomainInfo, allDomainsMetrics]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Prepare messages for API (without ids and timestamps)
    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    abortControllerRef.current = new AbortController();

    try {
      // Get auth token for the request
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          context: buildContext(),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      const assistantId = crypto.randomUUID();

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              assistantContent += deltaContent;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            // Incomplete JSON, put back and wait
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              assistantContent += deltaContent;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled, not an error
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
        setError(errorMessage);
        // Remove the empty assistant message if error occurred
        setMessages(prev => prev.filter(m => m.content !== ''));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, buildContext]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      isCommand: true,
    };
    setMessages(prev => [...prev, systemMessage]);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    stopGeneration,
    addSystemMessage,
    currentProvider,
  };
}
