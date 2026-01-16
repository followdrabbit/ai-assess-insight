-- Create SIEM metrics table for tracking health and performance
CREATE TABLE public.siem_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES public.siem_integrations(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  latency_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  events_batch_size INTEGER NOT NULL DEFAULT 1,
  response_status INTEGER
);

-- Enable RLS
ALTER TABLE public.siem_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policy - users can view metrics for their own integrations
CREATE POLICY "Users can view metrics for their own integrations"
ON public.siem_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.siem_integrations 
    WHERE siem_integrations.id = siem_metrics.integration_id 
    AND siem_integrations.user_id = auth.uid()
  )
);

-- Index for time-based queries
CREATE INDEX idx_siem_metrics_integration_time ON public.siem_metrics(integration_id, timestamp DESC);

-- Index for health calculations
CREATE INDEX idx_siem_metrics_success ON public.siem_metrics(integration_id, success, timestamp);

-- Add health tracking columns to siem_integrations
ALTER TABLE public.siem_integrations 
ADD COLUMN IF NOT EXISTS avg_latency_ms INTEGER,
ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS total_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown'));

-- Function to calculate integration health
CREATE OR REPLACE FUNCTION public.update_siem_integration_health(p_integration_id UUID)
RETURNS void AS $$
DECLARE
  v_avg_latency INTEGER;
  v_success_rate DECIMAL(5,2);
  v_total_failures INTEGER;
  v_consecutive_failures INTEGER;
  v_health_status TEXT;
  v_recent_success BOOLEAN;
BEGIN
  -- Calculate metrics from last 24 hours
  SELECT 
    COALESCE(AVG(latency_ms), 0)::INTEGER,
    COALESCE(
      (COUNT(*) FILTER (WHERE success = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100),
      0
    ),
    COALESCE(COUNT(*) FILTER (WHERE success = false), 0)
  INTO v_avg_latency, v_success_rate, v_total_failures
  FROM public.siem_metrics
  WHERE integration_id = p_integration_id
    AND timestamp > now() - INTERVAL '24 hours';

  -- Calculate consecutive failures (count from most recent)
  SELECT COUNT(*)
  INTO v_consecutive_failures
  FROM (
    SELECT success, timestamp,
           ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
    FROM public.siem_metrics
    WHERE integration_id = p_integration_id
    ORDER BY timestamp DESC
    LIMIT 100
  ) sub
  WHERE success = false
    AND rn <= (
      SELECT COALESCE(MIN(rn) - 1, 100)
      FROM (
        SELECT success, ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn
        FROM public.siem_metrics
        WHERE integration_id = p_integration_id
        ORDER BY timestamp DESC
        LIMIT 100
      ) inner_sub
      WHERE success = true
    );

  -- Determine health status
  IF v_success_rate >= 95 AND v_consecutive_failures < 3 THEN
    v_health_status := 'healthy';
  ELSIF v_success_rate >= 80 OR v_consecutive_failures < 5 THEN
    v_health_status := 'degraded';
  ELSE
    v_health_status := 'unhealthy';
  END IF;

  -- Update the integration
  UPDATE public.siem_integrations
  SET 
    avg_latency_ms = v_avg_latency,
    success_rate = v_success_rate,
    total_failures = v_total_failures,
    consecutive_failures = v_consecutive_failures,
    health_status = v_health_status
  WHERE id = p_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;