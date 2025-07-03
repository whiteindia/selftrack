-- Add new enum values to the existing task_status enum
ALTER TYPE task_status ADD VALUE 'Won';
ALTER TYPE task_status ADD VALUE 'Lost';
