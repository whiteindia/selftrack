-- Add start_date column to social_activities table for scheduling
ALTER TABLE public.social_activities 
ADD COLUMN start_date date DEFAULT CURRENT_DATE;