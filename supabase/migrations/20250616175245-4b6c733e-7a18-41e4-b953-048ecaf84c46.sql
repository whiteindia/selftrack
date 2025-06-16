
-- Add new status values to the projects table
-- First, let's check what constraint exists and update it
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add a new check constraint with all the status values including the new ones
ALTER TABLE public.projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN ('Active', 'On Hold', 'Completed', 'Imp', 'On-Head', 'Targeted', 'OverDue'));
