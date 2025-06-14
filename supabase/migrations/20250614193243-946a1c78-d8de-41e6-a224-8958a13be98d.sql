
-- Delete all time entries except those related to "yugatl task"
-- First, let's identify the task ID for "yugatl task"
DELETE FROM public.time_entries 
WHERE task_id NOT IN (
  SELECT id FROM public.tasks 
  WHERE name ILIKE '%yugatl task%'
);
