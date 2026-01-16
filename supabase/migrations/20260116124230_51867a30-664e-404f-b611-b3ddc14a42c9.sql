-- Add notification preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_assessment_updates boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_security_alerts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_weekly_digest boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_new_features boolean DEFAULT true;