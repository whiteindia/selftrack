
-- Add new enum values to the existing task_status enum
ALTER TYPE task_status ADD VALUE 'On Hold';
ALTER TYPE task_status ADD VALUE 'On-Head';
ALTER TYPE task_status ADD VALUE 'Targeted';
ALTER TYPE task_status ADD VALUE 'Imp';
