
-- Add a new column to time_entries to distinguish between task and subtask entries
ALTER TABLE public.time_entries ADD COLUMN entry_type TEXT DEFAULT 'task';

-- Update the existing constraint to be more flexible
-- First, drop the existing foreign key constraint
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_task_id_fkey;

-- Add a check constraint to ensure entry_type is either 'task' or 'subtask'
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_entry_type_check 
  CHECK (entry_type IN ('task', 'subtask'));

-- Add conditional foreign key constraints using a trigger function
CREATE OR REPLACE FUNCTION validate_time_entry_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_type = 'task' THEN
    -- Validate that task_id exists in tasks table
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE id = NEW.task_id) THEN
      RAISE EXCEPTION 'Invalid task_id reference for task entry';
    END IF;
  ELSIF NEW.entry_type = 'subtask' THEN
    -- Validate that task_id exists in subtasks table
    IF NOT EXISTS (SELECT 1 FROM public.subtasks WHERE id = NEW.task_id) THEN
      RAISE EXCEPTION 'Invalid task_id reference for subtask entry';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate references
CREATE TRIGGER validate_time_entry_reference_trigger
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION validate_time_entry_reference();
