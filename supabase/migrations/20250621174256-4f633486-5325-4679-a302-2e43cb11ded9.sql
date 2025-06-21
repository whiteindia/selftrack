
-- Add new status values to the tasks table
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add a new check constraint with all the status values including the new ones
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'On-Head', 'Targeted', 'Imp'));
