-- Create table for storing maturity snapshots over time
CREATE TABLE public.maturity_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_type TEXT NOT NULL DEFAULT 'automatic' CHECK (snapshot_type IN ('automatic', 'manual')),
  
  -- Overall metrics
  overall_score NUMERIC(5,4) NOT NULL,
  overall_coverage NUMERIC(5,4) NOT NULL,
  evidence_readiness NUMERIC(5,4) NOT NULL,
  maturity_level INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answered_questions INTEGER NOT NULL,
  critical_gaps INTEGER NOT NULL,
  
  -- Domain metrics stored as JSONB for flexibility
  domain_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Framework metrics stored as JSONB
  framework_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Framework category metrics stored as JSONB
  framework_category_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure only one automatic snapshot per day
  CONSTRAINT unique_automatic_snapshot_per_day UNIQUE (snapshot_date, snapshot_type)
);

-- Enable Row Level Security
ALTER TABLE public.maturity_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (demo app)
CREATE POLICY "Anyone can view maturity snapshots" 
ON public.maturity_snapshots 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert maturity snapshots" 
ON public.maturity_snapshots 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update maturity snapshots" 
ON public.maturity_snapshots 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete maturity snapshots" 
ON public.maturity_snapshots 
FOR DELETE 
USING (true);

-- Create index for efficient date-based queries
CREATE INDEX idx_maturity_snapshots_date ON public.maturity_snapshots (snapshot_date DESC);

-- Add comment for documentation
COMMENT ON TABLE public.maturity_snapshots IS 'Stores historical snapshots of maturity scores for trend analysis';