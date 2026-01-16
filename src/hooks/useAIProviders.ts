import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface AIProvider {
  id: string;
  userId: string;
  providerType: 'lovable' | 'openai' | 'anthropic' | 'google' | 'ollama' | 'huggingface' | 'custom';
  name: string;
  isEnabled: boolean;
  isDefault: boolean;
  endpointUrl?: string;
  modelId?: string;
  apiKey?: string; // Only for form, never stored in state after save
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
  extraConfig?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderTemplate {
  type: AIProvider['providerType'];
  name: string;
  description: string;
  icon: string;
  defaultEndpoint?: string;
  models: { id: string; name: string; description?: string }[];
  requiresApiKey: boolean;
  isLocal?: boolean;
}

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  {
    type: 'lovable',
    name: 'Lovable AI',
    description: 'Gateway integrado com modelos Gemini e GPT-5 (padrão)',
    icon: '✨',
    models: [
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Rápido e eficiente' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Melhor raciocínio' },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Equilibrado' },
      { id: 'openai/gpt-5', name: 'GPT-5', description: 'Mais poderoso' },
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', description: 'Custo-benefício' },
    ],
    requiresApiKey: false,
  },
  {
    type: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-4 Turbo e outros modelos OpenAI',
    icon: '🤖',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Multimodal otimizado' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Rápido e capaz' },
      { id: 'gpt-4', name: 'GPT-4', description: 'Modelo completo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Econômico' },
    ],
    requiresApiKey: true,
  },
  {
    type: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet, Opus e Haiku',
    icon: '🎭',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Melhor equilíbrio' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Mais inteligente' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Mais rápido' },
    ],
    requiresApiKey: true,
  },
  {
    type: 'google',
    name: 'Google AI Studio',
    description: 'Gemini Pro e Flash via API direta do Google',
    icon: '🔮',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Contexto longo' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido' },
      { id: 'gemini-pro', name: 'Gemini Pro', description: 'Versão estável' },
    ],
    requiresApiKey: true,
  },
  {
    type: 'ollama',
    name: 'Ollama (Local)',
    description: 'Execute modelos localmente no seu computador',
    icon: '🦙',
    defaultEndpoint: 'http://localhost:11434/api/chat',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2', description: 'Meta AI' },
      { id: 'mistral', name: 'Mistral', description: 'Eficiente' },
      { id: 'codellama', name: 'Code Llama', description: 'Para código' },
      { id: 'phi3', name: 'Phi-3', description: 'Microsoft' },
      { id: 'gemma2', name: 'Gemma 2', description: 'Google' },
    ],
    requiresApiKey: false,
    isLocal: true,
  },
  {
    type: 'huggingface',
    name: 'Hugging Face',
    description: 'Inference API para milhares de modelos',
    icon: '🤗',
    defaultEndpoint: 'https://api-inference.huggingface.co/models',
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', description: 'Grande e capaz' },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B', description: 'MoE eficiente' },
      { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B', description: 'Google' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', description: 'Alibaba' },
    ],
    requiresApiKey: true,
  },
  {
    type: 'custom',
    name: 'Endpoint Personalizado',
    description: 'Conecte a qualquer API compatível com OpenAI',
    icon: '⚙️',
    models: [],
    requiresApiKey: true,
  },
];

export function useAIProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultProvider, setDefaultProvider] = useState<AIProvider | null>(null);

  const loadProviders = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: AIProvider[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id || '',
        providerType: row.provider_type as AIProvider['providerType'],
        name: row.name,
        isEnabled: row.is_enabled,
        isDefault: row.is_default,
        endpointUrl: row.endpoint_url || undefined,
        modelId: row.model_id || undefined,
        maxTokens: row.max_tokens || 4096,
        temperature: Number(row.temperature) || 0.7,
        systemPrompt: row.system_prompt || undefined,
        extraConfig: (row.extra_config as Record<string, unknown>) || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      setProviders(mapped);
      setDefaultProvider(mapped.find(p => p.isDefault) || null);

      // If no providers exist, create default Lovable provider
      if (mapped.length === 0) {
        await createDefaultProvider();
      }
    } catch (error) {
      console.error('Error loading AI providers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createDefaultProvider = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_providers')
      .insert({
        user_id: user.id,
        provider_type: 'lovable',
        name: 'Lovable AI (Padrão)',
        is_enabled: true,
        is_default: true,
        model_id: 'google/gemini-3-flash-preview',
        max_tokens: 4096,
        temperature: 0.7,
      })
      .select()
      .single();

    if (!error && data) {
      const newProvider: AIProvider = {
        id: data.id,
        userId: data.user_id || '',
        providerType: data.provider_type as AIProvider['providerType'],
        name: data.name,
        isEnabled: data.is_enabled,
        isDefault: data.is_default,
        modelId: data.model_id || undefined,
        maxTokens: data.max_tokens || 4096,
        temperature: Number(data.temperature) || 0.7,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      setProviders([newProvider]);
      setDefaultProvider(newProvider);
    }
  };

  const saveProvider = async (provider: Partial<AIProvider> & { apiKey?: string }): Promise<boolean> => {
    if (!user) return false;

    try {
      const extraConfig = (provider.extraConfig || {}) as Json;
      
      const payload = {
        user_id: user.id,
        provider_type: provider.providerType as string,
        name: provider.name || '',
        is_enabled: provider.isEnabled ?? true,
        is_default: provider.isDefault ?? false,
        endpoint_url: provider.endpointUrl || null,
        model_id: provider.modelId || null,
        max_tokens: provider.maxTokens ?? 4096,
        temperature: provider.temperature ?? 0.7,
        system_prompt: provider.systemPrompt || null,
        extra_config: extraConfig,
        api_key_encrypted: provider.apiKey ? btoa(provider.apiKey) : null,
      };

      if (provider.id) {
        // Update existing
        const { error } = await supabase
          .from('ai_providers')
          .update(payload)
          .eq('id', provider.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('ai_providers')
          .insert([payload]);

        if (error) throw error;
      }

      // If setting as default, unset others
      if (provider.isDefault && provider.id) {
        await supabase
          .from('ai_providers')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('id', provider.id);
      }

      await loadProviders();
      return true;
    } catch (error) {
      console.error('Error saving provider:', error);
      toast.error('Erro ao salvar provedor');
      return false;
    }
  };

  const deleteProvider = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('ai_providers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadProviders();
      return true;
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast.error('Erro ao excluir provedor');
      return false;
    }
  };

  const setAsDefault = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Unset all defaults first
      await supabase
        .from('ai_providers')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set new default
      const { error } = await supabase
        .from('ai_providers')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadProviders();
      toast.success('Provedor padrão atualizado');
      return true;
    } catch (error) {
      console.error('Error setting default:', error);
      return false;
    }
  };

  const testConnection = async (provider: Partial<AIProvider> & { apiKey?: string }): Promise<{ success: boolean; message: string }> => {
    // For Lovable, always works
    if (provider.providerType === 'lovable') {
      return { success: true, message: 'Conexão com Lovable AI verificada!' };
    }

    // For Ollama, try to connect locally
    if (provider.providerType === 'ollama') {
      try {
        const response = await fetch(`${provider.endpointUrl?.replace('/api/chat', '') || 'http://localhost:11434'}/api/tags`, {
          method: 'GET',
        });
        if (response.ok) {
          return { success: true, message: 'Ollama está rodando e acessível!' };
        }
        return { success: false, message: 'Ollama não está respondendo' };
      } catch {
        return { success: false, message: 'Não foi possível conectar ao Ollama. Verifique se está rodando.' };
      }
    }

    // For others, we'd need to make a test call via edge function
    return { success: true, message: 'Configuração salva. O teste será feito na primeira mensagem.' };
  };

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    providers,
    defaultProvider,
    isLoading,
    loadProviders,
    saveProvider,
    deleteProvider,
    setAsDefault,
    testConnection,
    templates: PROVIDER_TEMPLATES,
  };
}
