
-- Add scheduled_time column to routine_completions table
ALTER TABLE public.routine_completions 
ADD COLUMN scheduled_time TEXT;

-- Update existing records to have a default time
UPDATE public.routine_completions 
SET scheduled_time = '09:00' 
WHERE scheduled_time IS NULL;
