-- Create table for default frameworks (base data)
CREATE TABLE public.default_frameworks (
  framework_id TEXT PRIMARY KEY,
  framework_name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  description TEXT,
  target_audience TEXT[] DEFAULT '{}',
  assessment_scope TEXT,
  default_enabled BOOLEAN DEFAULT false,
  version TEXT DEFAULT '1.0',
  category TEXT DEFAULT 'core',
  reference_links TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for domains
CREATE TABLE public.domains (
  domain_id TEXT PRIMARY KEY,
  domain_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 1,
  nist_ai_rmf_function TEXT,
  strategic_question TEXT,
  description TEXT,
  banking_relevance TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for subcategories
CREATE TABLE public.subcategories (
  subcat_id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES public.domains(domain_id) ON DELETE CASCADE,
  subcat_name TEXT NOT NULL,
  definition TEXT,
  objective TEXT,
  security_outcome TEXT,
  criticality TEXT DEFAULT 'Medium',
  weight NUMERIC DEFAULT 1.0,
  ownership_type TEXT,
  risk_summary TEXT,
  framework_refs TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for default questions (base data)
CREATE TABLE public.default_questions (
  question_id TEXT PRIMARY KEY,
  subcat_id TEXT NOT NULL REFERENCES public.subcategories(subcat_id) ON DELETE CASCADE,
  domain_id TEXT NOT NULL REFERENCES public.domains(domain_id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  expected_evidence TEXT,
  imperative_checks TEXT,
  risk_summary TEXT,
  frameworks TEXT[] DEFAULT '{}',
  ownership_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_subcategories_domain ON public.subcategories(domain_id);
CREATE INDEX idx_default_questions_domain ON public.default_questions(domain_id);
CREATE INDEX idx_default_questions_subcat ON public.default_questions(subcat_id);
CREATE INDEX idx_default_frameworks_enabled ON public.default_frameworks(default_enabled);

-- Enable RLS on all tables (public access for this demo tool)
ALTER TABLE public.default_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_questions ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for public access (as per user's previous choice)
CREATE POLICY "Allow all on default_frameworks" ON public.default_frameworks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on domains" ON public.domains FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on subcategories" ON public.subcategories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on default_questions" ON public.default_questions FOR ALL USING (true) WITH CHECK (true);

-- Add constraints for data integrity
ALTER TABLE public.default_frameworks 
  ADD CONSTRAINT df_framework_id_length CHECK (length(framework_id) <= 100),
  ADD CONSTRAINT df_framework_name_length CHECK (length(framework_name) <= 200),
  ADD CONSTRAINT df_short_name_length CHECK (length(short_name) <= 50);

ALTER TABLE public.domains
  ADD CONSTRAINT dom_domain_id_length CHECK (length(domain_id) <= 50),
  ADD CONSTRAINT dom_domain_name_length CHECK (length(domain_name) <= 200);

ALTER TABLE public.subcategories
  ADD CONSTRAINT sub_subcat_id_length CHECK (length(subcat_id) <= 50),
  ADD CONSTRAINT sub_subcat_name_length CHECK (length(subcat_name) <= 200);

ALTER TABLE public.default_questions
  ADD CONSTRAINT dq_question_id_length CHECK (length(question_id) <= 100),
  ADD CONSTRAINT dq_question_text_length CHECK (length(question_text) <= 2000);