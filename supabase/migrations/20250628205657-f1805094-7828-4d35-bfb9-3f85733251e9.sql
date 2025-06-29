
-- Add missing columns to tasks table for workload calendar functionality
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS scheduled_time TEXT,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Update the sprints table to have a name column if it doesn't exist
ALTER TABLE public.sprints 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing sprints to have the title as name if name is null
UPDATE public.sprints 
SET name = title 
WHERE name IS NULL AND title IS NOT NULL;
