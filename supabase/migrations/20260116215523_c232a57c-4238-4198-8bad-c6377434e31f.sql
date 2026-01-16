-- Add speech-to-text provider settings to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stt_provider TEXT DEFAULT 'web-speech-api',
ADD COLUMN IF NOT EXISTS stt_api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS stt_model TEXT DEFAULT 'whisper-1',
ADD COLUMN IF NOT EXISTS stt_endpoint_url TEXT;