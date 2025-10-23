-- Add main_functions column to nutrients table
ALTER TABLE public.nutrients
ADD COLUMN main_functions text[] DEFAULT ARRAY[]::text[];