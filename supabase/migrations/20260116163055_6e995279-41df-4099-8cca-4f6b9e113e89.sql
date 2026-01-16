-- Drop the incorrect unique constraint on question_id only
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_question_id_key;

-- Create the correct unique constraint on question_id + user_id
-- This allows each user to have their own answer for each question
CREATE UNIQUE INDEX answers_question_user_unique ON public.answers (question_id, user_id);