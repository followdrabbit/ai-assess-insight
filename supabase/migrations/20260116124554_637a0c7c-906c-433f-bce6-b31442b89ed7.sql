-- Add language preference column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS language text DEFAULT 'pt-BR';