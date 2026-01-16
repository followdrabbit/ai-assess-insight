-- =============================================================================
-- ENHANCED AUDIT LOGS - Add IP, User-Agent and metadata columns
-- =============================================================================

-- Add new columns for detailed audit tracking
ALTER TABLE public.change_logs
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS request_id uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS session_id text,
ADD COLUMN IF NOT EXISTS geo_country text,
ADD COLUMN IF NOT EXISTS geo_city text,
ADD COLUMN IF NOT EXISTS device_type text,
ADD COLUMN IF NOT EXISTS browser_name text,
ADD COLUMN IF NOT EXISTS os_name text;

-- Add index for faster queries on IP and date range
CREATE INDEX IF NOT EXISTS idx_change_logs_ip_address ON public.change_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_change_logs_created_at ON public.change_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_logs_entity_type_action ON public.change_logs(entity_type, action);

-- Add comment explaining the table purpose
COMMENT ON TABLE public.change_logs IS 'Detailed audit trail for all entity changes with full request context';
COMMENT ON COLUMN public.change_logs.ip_address IS 'Client IP address from request headers';
COMMENT ON COLUMN public.change_logs.user_agent IS 'Full User-Agent string from request';
COMMENT ON COLUMN public.change_logs.request_id IS 'Unique identifier for the request';
COMMENT ON COLUMN public.change_logs.session_id IS 'Browser session identifier';
COMMENT ON COLUMN public.change_logs.geo_country IS 'Country code derived from IP geolocation';
COMMENT ON COLUMN public.change_logs.geo_city IS 'City name derived from IP geolocation';
COMMENT ON COLUMN public.change_logs.device_type IS 'Device type (desktop, mobile, tablet)';
COMMENT ON COLUMN public.change_logs.browser_name IS 'Browser name parsed from User-Agent';
COMMENT ON COLUMN public.change_logs.os_name IS 'Operating system parsed from User-Agent';