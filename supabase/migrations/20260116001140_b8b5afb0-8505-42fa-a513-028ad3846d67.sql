-- Add annotations column to question_versions table
ALTER TABLE public.question_versions 
ADD COLUMN annotations jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.question_versions.annotations IS 'Array of annotation objects with id, text, author, and timestamp';