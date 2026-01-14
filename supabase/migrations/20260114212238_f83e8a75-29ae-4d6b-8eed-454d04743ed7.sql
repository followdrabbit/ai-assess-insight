-- Create table to track disabled default frameworks
CREATE TABLE public.disabled_frameworks (
  framework_id TEXT PRIMARY KEY,
  disabled_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.disabled_frameworks ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for this app)
CREATE POLICY "Allow public read on disabled_frameworks" 
  ON public.disabled_frameworks FOR SELECT USING (true);

CREATE POLICY "Allow public insert on disabled_frameworks" 
  ON public.disabled_frameworks FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete on disabled_frameworks" 
  ON public.disabled_frameworks FOR DELETE USING (true);