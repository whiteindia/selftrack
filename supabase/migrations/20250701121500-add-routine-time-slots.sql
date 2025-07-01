
-- Add preferred time slot fields to the routines table
ALTER TABLE public.routines 
ADD COLUMN IF NOT EXISTS preferred_slot_start TIME,
ADD COLUMN IF NOT EXISTS preferred_slot_end TIME;

-- Add comments to document the new fields
COMMENT ON COLUMN public.routines.preferred_slot_start IS 'Optional preferred start time for the routine';
COMMENT ON COLUMN public.routines.preferred_slot_end IS 'Optional preferred end time for the routine';
