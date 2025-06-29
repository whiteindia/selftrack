
-- Add scheduled_time column to subtasks table to support workload calendar scheduling
ALTER TABLE public.subtasks 
ADD COLUMN scheduled_time text;
