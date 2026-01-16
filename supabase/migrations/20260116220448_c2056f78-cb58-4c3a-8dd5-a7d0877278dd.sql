-- Create voice_profiles table to store voice enrollment data
CREATE TABLE public.voice_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  profile_name TEXT NOT NULL DEFAULT 'Meu Perfil de Voz',
  enrollment_level TEXT NOT NULL DEFAULT 'standard' CHECK (enrollment_level IN ('standard', 'advanced')),
  enrollment_phrases_count INTEGER NOT NULL DEFAULT 0,
  voice_features JSONB,
  noise_threshold NUMERIC(4,2) DEFAULT 0.65,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enrolled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own voice profile" 
ON public.voice_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice profile" 
ON public.voice_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice profile" 
ON public.voice_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice profile" 
ON public.voice_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_voice_profiles_updated_at
BEFORE UPDATE ON public.voice_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create voice_enrollment_samples table to store individual training samples
CREATE TABLE public.voice_enrollment_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_profile_id UUID NOT NULL REFERENCES public.voice_profiles(id) ON DELETE CASCADE,
  phrase_index INTEGER NOT NULL,
  phrase_text TEXT NOT NULL,
  audio_features JSONB NOT NULL,
  duration_ms INTEGER NOT NULL,
  sample_rate INTEGER NOT NULL DEFAULT 16000,
  quality_score NUMERIC(4,2),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.voice_enrollment_samples ENABLE ROW LEVEL SECURITY;

-- Create policies via voice_profile ownership
CREATE POLICY "Users can view their own enrollment samples" 
ON public.voice_enrollment_samples 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.voice_profiles vp 
  WHERE vp.id = voice_profile_id AND vp.user_id = auth.uid()
));

CREATE POLICY "Users can create their own enrollment samples" 
ON public.voice_enrollment_samples 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.voice_profiles vp 
  WHERE vp.id = voice_profile_id AND vp.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own enrollment samples" 
ON public.voice_enrollment_samples 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.voice_profiles vp 
  WHERE vp.id = voice_profile_id AND vp.user_id = auth.uid()
));

-- Index for faster lookups
CREATE INDEX idx_voice_enrollment_samples_profile ON public.voice_enrollment_samples(voice_profile_id);