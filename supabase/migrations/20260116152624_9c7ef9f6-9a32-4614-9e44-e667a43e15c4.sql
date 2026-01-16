-- =============================================================================
-- SECURITY HARDENING - Complete Migration
-- =============================================================================

-- 1. Create function to auto-set user_id
CREATE OR REPLACE FUNCTION public.set_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create function for question_versions (changed_by column)
CREATE OR REPLACE FUNCTION public.set_changed_by_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.changed_by IS NULL THEN
    NEW.changed_by := auth.uid()::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create triggers to auto-populate user_id
DROP TRIGGER IF EXISTS ensure_user_id_answers ON public.answers;
CREATE TRIGGER ensure_user_id_answers
BEFORE INSERT ON public.answers
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();

DROP TRIGGER IF EXISTS ensure_user_id_assessment_meta ON public.assessment_meta;
CREATE TRIGGER ensure_user_id_assessment_meta
BEFORE INSERT ON public.assessment_meta
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();

DROP TRIGGER IF EXISTS ensure_user_id_change_logs ON public.change_logs;
CREATE TRIGGER ensure_user_id_change_logs
BEFORE INSERT ON public.change_logs
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();

DROP TRIGGER IF EXISTS ensure_user_id_chart_annotations ON public.chart_annotations;
CREATE TRIGGER ensure_user_id_chart_annotations
BEFORE INSERT ON public.chart_annotations
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();

DROP TRIGGER IF EXISTS ensure_user_id_custom_frameworks ON public.custom_frameworks;
CREATE TRIGGER ensure_user_id_custom_frameworks
BEFORE INSERT ON public.custom_frameworks
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();

DROP TRIGGER IF EXISTS ensure_user_id_custom_questions ON public.custom_questions;
CREATE TRIGGER ensure_user_id_custom_questions
BEFORE INSERT ON public.custom_questions
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();

DROP TRIGGER IF EXISTS ensure_user_id_maturity_snapshots ON public.maturity_snapshots;
CREATE TRIGGER ensure_user_id_maturity_snapshots
BEFORE INSERT ON public.maturity_snapshots
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();

DROP TRIGGER IF EXISTS ensure_user_id_disabled_frameworks ON public.disabled_frameworks;
CREATE TRIGGER ensure_user_id_disabled_frameworks
BEFORE INSERT ON public.disabled_frameworks
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();

DROP TRIGGER IF EXISTS ensure_user_id_disabled_questions ON public.disabled_questions;
CREATE TRIGGER ensure_user_id_disabled_questions
BEFORE INSERT ON public.disabled_questions
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();

DROP TRIGGER IF EXISTS ensure_user_id_profiles ON public.profiles;
CREATE TRIGGER ensure_user_id_profiles
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();

DROP TRIGGER IF EXISTS ensure_changed_by_question_versions ON public.question_versions;
CREATE TRIGGER ensure_changed_by_question_versions
BEFORE INSERT ON public.question_versions
FOR EACH ROW EXECUTE FUNCTION public.set_changed_by_on_insert();

-- 4. Update RLS policies to be stricter

-- Fix change_logs: require non-null user_id for SELECT
DROP POLICY IF EXISTS "Users can view own change logs" ON public.change_logs;
CREATE POLICY "Users can view own change logs"
ON public.change_logs FOR SELECT
USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Add missing delete policies
DROP POLICY IF EXISTS "Users can delete own assessment meta" ON public.assessment_meta;
CREATE POLICY "Users can delete own assessment meta"
ON public.assessment_meta FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own change logs" ON public.change_logs;
CREATE POLICY "Users can delete own change logs"
ON public.change_logs FOR DELETE
USING (auth.uid() = user_id);