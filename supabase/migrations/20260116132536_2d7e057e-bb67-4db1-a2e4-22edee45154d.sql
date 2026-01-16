-- Fix overly permissive RLS policies on reference data tables
-- These tables contain shared configuration data that should be readable by all authenticated users
-- but modifications should be restricted

-- ==========================================
-- default_frameworks: Replace ALL with true
-- ==========================================
DROP POLICY IF EXISTS "Allow all on default_frameworks" ON public.default_frameworks;

-- Allow any authenticated user to read default frameworks
CREATE POLICY "Anyone can view default frameworks" 
ON public.default_frameworks 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- ==========================================
-- default_questions: Replace ALL with true
-- ==========================================
DROP POLICY IF EXISTS "Allow all on default_questions" ON public.default_questions;

-- Allow any authenticated user to read default questions
CREATE POLICY "Anyone can view default questions" 
ON public.default_questions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- ==========================================
-- domains: Replace ALL with true
-- ==========================================
DROP POLICY IF EXISTS "Allow all on domains" ON public.domains;

-- Allow any authenticated user to read domains
CREATE POLICY "Anyone can view domains" 
ON public.domains 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- ==========================================
-- subcategories: Replace ALL with true
-- ==========================================
DROP POLICY IF EXISTS "Allow all on subcategories" ON public.subcategories;

-- Allow any authenticated user to read subcategories
CREATE POLICY "Anyone can view subcategories" 
ON public.subcategories 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- ==========================================
-- security_domains: Already SELECT only, just require auth
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view security domains" ON public.security_domains;

-- Allow any authenticated user to read security domains
CREATE POLICY "Authenticated users can view security domains" 
ON public.security_domains 
FOR SELECT 
USING (auth.uid() IS NOT NULL);