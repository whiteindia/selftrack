-- Add sort_order column to tasks table for custom sorting
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL;

-- Create an index on sort_order for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON public.tasks(sort_order);