-- ============ PROFILES TABLE ============
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  organization TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for profile updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ADD USER_ID TO EXISTING TABLES ============

-- Add user_id to answers
ALTER TABLE public.answers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to custom_frameworks
ALTER TABLE public.custom_frameworks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to custom_questions
ALTER TABLE public.custom_questions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to assessment_meta (change to per-user assessments)
ALTER TABLE public.assessment_meta ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to disabled_questions
ALTER TABLE public.disabled_questions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to disabled_frameworks
ALTER TABLE public.disabled_frameworks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to change_logs
ALTER TABLE public.change_logs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to maturity_snapshots
ALTER TABLE public.maturity_snapshots ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============ DROP OLD PERMISSIVE POLICIES ============

DROP POLICY IF EXISTS "Allow all on answers" ON public.answers;
DROP POLICY IF EXISTS "Allow all on custom_frameworks" ON public.custom_frameworks;
DROP POLICY IF EXISTS "Allow all on custom_questions" ON public.custom_questions;
DROP POLICY IF EXISTS "Allow all on assessment_meta" ON public.assessment_meta;
DROP POLICY IF EXISTS "Allow all on disabled_questions" ON public.disabled_questions;
DROP POLICY IF EXISTS "Allow public read on disabled_frameworks" ON public.disabled_frameworks;
DROP POLICY IF EXISTS "Allow public insert on disabled_frameworks" ON public.disabled_frameworks;
DROP POLICY IF EXISTS "Allow public delete on disabled_frameworks" ON public.disabled_frameworks;
DROP POLICY IF EXISTS "Allow all on change_logs" ON public.change_logs;
DROP POLICY IF EXISTS "Anyone can view maturity snapshots" ON public.maturity_snapshots;
DROP POLICY IF EXISTS "Anyone can insert maturity snapshots" ON public.maturity_snapshots;
DROP POLICY IF EXISTS "Anyone can update maturity snapshots" ON public.maturity_snapshots;
DROP POLICY IF EXISTS "Anyone can delete maturity snapshots" ON public.maturity_snapshots;

-- ============ CREATE USER-SCOPED RLS POLICIES ============

-- Answers policies
CREATE POLICY "Users can view own answers"
ON public.answers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers"
ON public.answers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers"
ON public.answers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own answers"
ON public.answers FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Custom frameworks policies
CREATE POLICY "Users can view own custom frameworks"
ON public.custom_frameworks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom frameworks"
ON public.custom_frameworks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom frameworks"
ON public.custom_frameworks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom frameworks"
ON public.custom_frameworks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Custom questions policies
CREATE POLICY "Users can view own custom questions"
ON public.custom_questions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom questions"
ON public.custom_questions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom questions"
ON public.custom_questions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom questions"
ON public.custom_questions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Assessment meta policies
CREATE POLICY "Users can view own assessment meta"
ON public.assessment_meta FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessment meta"
ON public.assessment_meta FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessment meta"
ON public.assessment_meta FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Disabled questions policies
CREATE POLICY "Users can view own disabled questions"
ON public.disabled_questions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disabled questions"
ON public.disabled_questions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own disabled questions"
ON public.disabled_questions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Disabled frameworks policies
CREATE POLICY "Users can view own disabled frameworks"
ON public.disabled_frameworks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disabled frameworks"
ON public.disabled_frameworks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own disabled frameworks"
ON public.disabled_frameworks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Change logs policies
CREATE POLICY "Users can view own change logs"
ON public.change_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own change logs"
ON public.change_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Maturity snapshots policies
CREATE POLICY "Users can view own maturity snapshots"
ON public.maturity_snapshots FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maturity snapshots"
ON public.maturity_snapshots FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maturity snapshots"
ON public.maturity_snapshots FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own maturity snapshots"
ON public.maturity_snapshots FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============ KEEP READ-ONLY ACCESS TO REFERENCE DATA ============
-- domains, subcategories, default_frameworks, default_questions remain publicly readable
-- but only authenticated users can modify (keep existing permissive for now as they are reference data);