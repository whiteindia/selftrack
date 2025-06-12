
-- Update the projects table to properly reference employees
-- First, let's add a new column for the employee foreign key
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assignee_employee_id UUID;

-- Add foreign key constraint to employees table
ALTER TABLE public.projects 
ADD CONSTRAINT fk_projects_assignee_employee 
FOREIGN KEY (assignee_employee_id) REFERENCES public.employees(id);

-- Update existing projects where assignee_id contains email addresses
-- Match them to employee records by email
UPDATE public.projects 
SET assignee_employee_id = (
  SELECT e.id 
  FROM public.employees e 
  WHERE e.email = projects.assignee_id::text
)
WHERE assignee_id IS NOT NULL 
AND EXISTS (
  SELECT 1 
  FROM public.employees e 
  WHERE e.email = projects.assignee_id::text
);

-- For projects where assignee_id doesn't match any employee email,
-- try to match by name (in case assignee_id contains names)
UPDATE public.projects 
SET assignee_employee_id = (
  SELECT e.id 
  FROM public.employees e 
  WHERE e.name = projects.assignee_id::text
)
WHERE assignee_employee_id IS NULL 
AND assignee_id IS NOT NULL 
AND EXISTS (
  SELECT 1 
  FROM public.employees e 
  WHERE e.name = projects.assignee_id::text
);

-- Try to match by UUID if assignee_id is actually a valid UUID
-- Use a safer approach with exception handling
UPDATE public.projects 
SET assignee_employee_id = (
  CASE 
    WHEN assignee_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN assignee_id::uuid
    ELSE NULL
  END
)
WHERE assignee_employee_id IS NULL 
AND assignee_id IS NOT NULL 
AND assignee_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
AND EXISTS (
  SELECT 1 
  FROM public.employees e 
  WHERE e.id = assignee_id::uuid
);

-- Update RLS policies for projects to use the new employee relationship
DROP POLICY IF EXISTS "rls_policy_projects_manager" ON public.projects;

CREATE POLICY "rls_policy_projects_manager" ON public.projects 
FOR ALL USING (
  CASE 
    WHEN public.get_user_role(auth.uid()) = 'admin' THEN true
    WHEN public.get_user_role(auth.uid()) = 'manager' THEN 
      assignee_employee_id = public.get_user_employee_id(auth.uid())
    ELSE client_id = public.get_user_client_id(auth.uid())
  END
);

-- Enable RLS on projects table if not already enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
