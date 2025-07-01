
-- Add missing fields to the routines table
ALTER TABLE public.routines 
ADD COLUMN IF NOT EXISTS preferred_slot_start TIME,
ADD COLUMN IF NOT EXISTS preferred_slot_end TIME;

-- For the preferred_days column, we'll keep it as jsonb for now since the conversion is complex
-- The application code can handle both jsonb array and text array formats

-- Remove category and color columns since we're removing them from the form
ALTER TABLE public.routines 
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS color;

-- Add comments to document the fields
COMMENT ON COLUMN public.routines.preferred_slot_start IS 'Optional preferred start time for the routine';
COMMENT ON COLUMN public.routines.preferred_slot_end IS 'Optional preferred end time for the routine';
COMMENT ON COLUMN public.routines.frequency IS 'Schedule frequency like "daily", "every 2 days", "weekly", etc.';
COMMENT ON COLUMN public.routines.preferred_days IS 'Array of preferred days of the week (sunday, monday, etc.) stored as jsonb';
