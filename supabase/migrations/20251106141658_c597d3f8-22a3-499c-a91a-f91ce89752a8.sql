-- Add start_date column to kids_activities table
ALTER TABLE public.kids_activities
ADD COLUMN start_date date DEFAULT CURRENT_DATE;

-- Add comment to explain the column
COMMENT ON COLUMN public.kids_activities.start_date IS 'The date when this activity schedule starts';