-- Remove the existing frequency constraint and add a new flexible constraint
ALTER TABLE public.routines DROP CONSTRAINT IF EXISTS routines_frequency_check;

-- Add a new constraint that allows flexible frequency format like "2_weekly", "1_monthly", etc.
ALTER TABLE public.routines ADD CONSTRAINT routines_frequency_format_check 
CHECK (frequency ~ '^[0-9]+_(daily|weekly|monthly|quarterly|halfyearly|annually)$');