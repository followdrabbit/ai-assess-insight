-- Fix RLS policies for maturity_snapshots table
-- Remove the overly permissive public INSERT policy
DROP POLICY IF EXISTS "Allow public insert to maturity snapshots" ON public.maturity_snapshots;

-- Remove the overly permissive public SELECT policy (keep user-specific one)
DROP POLICY IF EXISTS "Allow public read access to maturity snapshots" ON public.maturity_snapshots;

-- Fix RLS policies for chart_annotations table
-- Drop all overly permissive policies
DROP POLICY IF EXISTS "Users can create annotations" ON public.chart_annotations;
DROP POLICY IF EXISTS "Users can delete annotations" ON public.chart_annotations;
DROP POLICY IF EXISTS "Users can update annotations" ON public.chart_annotations;
DROP POLICY IF EXISTS "Users can view all annotations" ON public.chart_annotations;

-- Create proper user-scoped policies for chart_annotations
CREATE POLICY "Users can view own annotations" 
ON public.chart_annotations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own annotations" 
ON public.chart_annotations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations" 
ON public.chart_annotations 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations" 
ON public.chart_annotations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix RLS policies for question_versions table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on question_versions" ON public.question_versions;

-- Create proper user-scoped policies for question_versions
CREATE POLICY "Users can view own question versions" 
ON public.question_versions 
FOR SELECT 
USING (auth.uid()::text = changed_by OR changed_by IS NULL);

CREATE POLICY "Users can insert own question versions" 
ON public.question_versions 
FOR INSERT 
WITH CHECK (auth.uid()::text = changed_by);

CREATE POLICY "Users can update own question versions" 
ON public.question_versions 
FOR UPDATE 
USING (auth.uid()::text = changed_by)
WITH CHECK (auth.uid()::text = changed_by);

CREATE POLICY "Users can delete own question versions" 
ON public.question_versions 
FOR DELETE 
USING (auth.uid()::text = changed_by);