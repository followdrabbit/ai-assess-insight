-- ============================================
-- AI Security Assessment Database Schema
-- ============================================

-- Custom Frameworks table
CREATE TABLE public.custom_frameworks (
  framework_id TEXT PRIMARY KEY,
  framework_name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  description TEXT,
  target_audience TEXT[] DEFAULT '{}',
  assessment_scope TEXT,
  default_enabled BOOLEAN DEFAULT false,
  version TEXT DEFAULT '1.0.0',
  category TEXT DEFAULT 'custom' CHECK (category IN ('core', 'high-value', 'tech-focused', 'custom')),
  reference_links TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Custom Questions table
CREATE TABLE public.custom_questions (
  question_id TEXT PRIMARY KEY,
  subcat_id TEXT,
  domain_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  expected_evidence TEXT,
  imperative_checks TEXT,
  risk_summary TEXT,
  frameworks TEXT[] DEFAULT '{}',
  ownership_type TEXT CHECK (ownership_type IN ('Executive', 'GRC', 'Engineering')),
  criticality TEXT DEFAULT 'Medium' CHECK (criticality IN ('Low', 'Medium', 'High', 'Critical')),
  is_disabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Answers table
CREATE TABLE public.answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id TEXT NOT NULL UNIQUE,
  framework_id TEXT,
  response TEXT CHECK (response IN ('Sim', 'Parcial', 'Não', 'NA')),
  evidence_ok TEXT CHECK (evidence_ok IN ('Sim', 'Parcial', 'Não', 'NA')),
  notes TEXT DEFAULT '',
  evidence_links TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Assessment metadata table
CREATE TABLE public.assessment_meta (
  id TEXT PRIMARY KEY DEFAULT 'current',
  name TEXT DEFAULT 'Avaliação de Maturidade em Segurança de IA',
  enabled_frameworks TEXT[] DEFAULT ARRAY['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD'],
  selected_frameworks TEXT[] DEFAULT '{}',
  version TEXT DEFAULT '2.0.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Disabled default questions table
CREATE TABLE public.disabled_questions (
  question_id TEXT PRIMARY KEY,
  disabled_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Change logs for audit trail
CREATE TABLE public.change_logs (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('framework', 'question', 'setting', 'answer')),
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'disable', 'enable')),
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_answers_question_id ON public.answers(question_id);
CREATE INDEX idx_answers_framework_id ON public.answers(framework_id);
CREATE INDEX idx_custom_questions_domain ON public.custom_questions(domain_id);
CREATE INDEX idx_change_logs_entity ON public.change_logs(entity_type, entity_id);
CREATE INDEX idx_change_logs_created_at ON public.change_logs(created_at DESC);

-- Enable Row Level Security on all tables
ALTER TABLE public.custom_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disabled_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this assessment tool)
CREATE POLICY "Allow all on custom_frameworks" ON public.custom_frameworks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on custom_questions" ON public.custom_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on answers" ON public.answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on assessment_meta" ON public.assessment_meta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on disabled_questions" ON public.disabled_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on change_logs" ON public.change_logs FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_custom_frameworks_updated_at
  BEFORE UPDATE ON public.custom_frameworks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_questions_updated_at
  BEFORE UPDATE ON public.custom_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_answers_updated_at
  BEFORE UPDATE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessment_meta_updated_at
  BEFORE UPDATE ON public.assessment_meta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default assessment metadata
INSERT INTO public.assessment_meta (id, name, enabled_frameworks, selected_frameworks, version)
VALUES ('current', 'Avaliação de Maturidade em Segurança de IA', ARRAY['NIST_AI_RMF', 'ISO_27001_27002', 'LGPD'], '{}', '2.0.0')
ON CONFLICT (id) DO NOTHING;