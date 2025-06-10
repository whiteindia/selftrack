
-- Add completion_date column to sprints table
ALTER TABLE public.sprints 
ADD COLUMN completion_date timestamp with time zone;
