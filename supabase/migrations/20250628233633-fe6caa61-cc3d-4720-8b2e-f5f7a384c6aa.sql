
-- Add reminder and slot fields to the tasks table
ALTER TABLE public.tasks 
ADD COLUMN reminder_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN slot_start_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN slot_end_datetime TIMESTAMP WITH TIME ZONE;

-- Add a comment to document the new fields
COMMENT ON COLUMN public.tasks.reminder_datetime IS 'Optional reminder date and time for the task';
COMMENT ON COLUMN public.tasks.slot_start_datetime IS 'Optional slot start date and time';
COMMENT ON COLUMN public.tasks.slot_end_datetime IS 'Optional slot end date and time';
