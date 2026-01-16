-- Create question versions table to track changes
CREATE TABLE public.question_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  question_text TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  subcat_id TEXT,
  criticality TEXT,
  ownership_type TEXT,
  risk_summary TEXT,
  expected_evidence TEXT,
  imperative_checks TEXT,
  frameworks TEXT[],
  security_domain_id TEXT,
  change_type TEXT NOT NULL DEFAULT 'update',
  change_summary TEXT,
  changed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_question_versions_question_id ON public.question_versions(question_id);
CREATE INDEX idx_question_versions_created_at ON public.question_versions(created_at DESC);

-- Enable RLS
ALTER TABLE public.question_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this app)
CREATE POLICY "Allow all operations on question_versions"
ON public.question_versions
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.question_versions IS 'Stores version history for custom questions to enable tracking changes and reverting';