
-- Add completion_date column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN completion_date timestamp with time zone;
