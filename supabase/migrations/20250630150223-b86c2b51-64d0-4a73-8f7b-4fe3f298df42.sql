
-- Add timer_metadata column to time_entries table
ALTER TABLE public.time_entries 
ADD COLUMN timer_metadata text;
