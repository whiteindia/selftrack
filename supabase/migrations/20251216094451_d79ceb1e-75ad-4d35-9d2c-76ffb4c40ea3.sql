-- Add 'Assigned' to the task_status enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'Assigned';