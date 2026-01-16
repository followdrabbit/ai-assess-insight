-- Add voice settings columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS voice_language TEXT DEFAULT 'pt-BR',
ADD COLUMN IF NOT EXISTS voice_rate NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS voice_pitch NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS voice_volume NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS voice_name TEXT,
ADD COLUMN IF NOT EXISTS voice_auto_speak BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.voice_language IS 'Preferred language for speech recognition and synthesis (pt-BR, en-US, es-ES)';
COMMENT ON COLUMN public.profiles.voice_rate IS 'Speech rate for text-to-speech (0.5 to 2.0)';
COMMENT ON COLUMN public.profiles.voice_pitch IS 'Voice pitch for text-to-speech (0.5 to 2.0)';
COMMENT ON COLUMN public.profiles.voice_volume IS 'Voice volume for text-to-speech (0 to 1)';
COMMENT ON COLUMN public.profiles.voice_name IS 'Preferred voice name for text-to-speech';
COMMENT ON COLUMN public.profiles.voice_auto_speak IS 'Auto-speak AI assistant responses';