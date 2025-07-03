-- First, update existing frequency values to the new format
UPDATE public.routines 
SET frequency = CASE 
  WHEN frequency = 'daily' THEN '1_daily'
  WHEN frequency = 'weekly_once' THEN '1_weekly' 
  WHEN frequency = 'weekly_twice' THEN '2_weekly'
  WHEN frequency = 'monthly_once' THEN '1_monthly'
  WHEN frequency = 'monthly_twice' THEN '2_monthly'
  WHEN frequency = 'yearly_once' THEN '1_annually'
  ELSE '1_weekly' -- fallback for any other values
END;

-- Remove all frequency-related constraints
ALTER TABLE public.routines DROP CONSTRAINT IF EXISTS routines_frequency_check;
ALTER TABLE public.routines DROP CONSTRAINT IF EXISTS check_frequency_enum;

-- Add a new constraint that allows flexible frequency format
ALTER TABLE public.routines ADD CONSTRAINT routines_frequency_format_check 
CHECK (frequency ~ '^[0-9]+_(daily|weekly|monthly|quarterly|halfyearly|annually)$');