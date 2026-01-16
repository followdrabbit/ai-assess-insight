-- Create SIEM integrations configuration table
CREATE TABLE public.siem_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'cef', 'leef', 'syslog')),
  auth_type TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'basic', 'api_key')),
  auth_header TEXT,
  auth_value_encrypted TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  include_ip BOOLEAN NOT NULL DEFAULT true,
  include_geo BOOLEAN NOT NULL DEFAULT true,
  include_device BOOLEAN NOT NULL DEFAULT true,
  severity_filter TEXT[] DEFAULT ARRAY['high', 'medium', 'low'],
  entity_filter TEXT[],
  action_filter TEXT[],
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_error_at TIMESTAMP WITH TIME ZONE,
  last_error_message TEXT,
  events_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.siem_integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only manage their own integrations
CREATE POLICY "Users can view their own SIEM integrations"
ON public.siem_integrations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SIEM integrations"
ON public.siem_integrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SIEM integrations"
ON public.siem_integrations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SIEM integrations"
ON public.siem_integrations
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_siem_integrations_updated_at
BEFORE UPDATE ON public.siem_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit event queue table for async SIEM forwarding
CREATE TABLE public.siem_event_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES public.siem_integrations(id) ON DELETE CASCADE,
  event_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on queue (only system can access)
ALTER TABLE public.siem_event_queue ENABLE ROW LEVEL SECURITY;

-- Index for pending events
CREATE INDEX idx_siem_event_queue_pending ON public.siem_event_queue(status, created_at) WHERE status = 'pending';

-- Index for integration lookup
CREATE INDEX idx_siem_integrations_enabled ON public.siem_integrations(user_id, is_enabled) WHERE is_enabled = true;