-- Create table for chart annotations/milestones
CREATE TABLE public.chart_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annotation_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  annotation_type TEXT NOT NULL DEFAULT 'milestone', -- 'milestone', 'audit', 'event', 'release', 'incident'
  color TEXT DEFAULT '#3b82f6',
  security_domain_id TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chart_annotations ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Users can view all annotations" 
ON public.chart_annotations 
FOR SELECT 
USING (true);

-- Allow insert for authenticated users
CREATE POLICY "Users can create annotations" 
ON public.chart_annotations 
FOR INSERT 
WITH CHECK (true);

-- Allow update for all users
CREATE POLICY "Users can update annotations" 
ON public.chart_annotations 
FOR UPDATE 
USING (true);

-- Allow delete for all users
CREATE POLICY "Users can delete annotations" 
ON public.chart_annotations 
FOR DELETE 
USING (true);

-- Create index for date queries
CREATE INDEX idx_chart_annotations_date ON public.chart_annotations(annotation_date);
CREATE INDEX idx_chart_annotations_domain ON public.chart_annotations(security_domain_id);