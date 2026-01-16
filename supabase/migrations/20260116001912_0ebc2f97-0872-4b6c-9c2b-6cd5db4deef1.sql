-- Add tags column to question_versions table
ALTER TABLE public.question_versions 
ADD COLUMN tags text[] DEFAULT '{}'::text[];

-- Add comment for documentation
COMMENT ON COLUMN public.question_versions.tags IS 'Array of tag strings like approved, reviewed, baseline';