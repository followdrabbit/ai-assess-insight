-- Create table for AI provider configurations
CREATE TABLE public.ai_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('lovable', 'openai', 'anthropic', 'google', 'ollama', 'huggingface', 'custom')),
  name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  endpoint_url TEXT,
  model_id TEXT,
  api_key_encrypted TEXT,
  max_tokens INTEGER DEFAULT 4096,
  temperature NUMERIC(3,2) DEFAULT 0.7,
  system_prompt TEXT,
  extra_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own AI providers"
  ON public.ai_providers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI providers"
  ON public.ai_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI providers"
  ON public.ai_providers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI providers"
  ON public.ai_providers FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_providers_user_id ON public.ai_providers(user_id);
CREATE INDEX idx_ai_providers_default ON public.ai_providers(user_id, is_default) WHERE is_default = true;

-- Trigger for updated_at
CREATE TRIGGER update_ai_providers_updated_at
  BEFORE UPDATE ON public.ai_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Lovable AI provider for existing users (they can configure later)
-- This will be done per-user on first access