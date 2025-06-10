
-- First, drop the existing project_type enum constraint and rename the column
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_type_check;

-- Rename the type column to service
ALTER TABLE public.projects 
RENAME COLUMN type TO service;

-- Change the column type from enum to text
ALTER TABLE public.projects 
ALTER COLUMN service TYPE text;

-- Drop the project_type enum since we're not using it anymore
DROP TYPE IF EXISTS project_type;

-- Remove the default value for status column first
ALTER TABLE public.projects 
ALTER COLUMN status DROP DEFAULT;

-- Change the status column type from enum to text
ALTER TABLE public.projects 
ALTER COLUMN status TYPE text;

-- Add a new default value for status as text
ALTER TABLE public.projects 
ALTER COLUMN status SET DEFAULT 'Active';

-- Drop the project_status enum
DROP TYPE IF EXISTS project_status CASCADE;
