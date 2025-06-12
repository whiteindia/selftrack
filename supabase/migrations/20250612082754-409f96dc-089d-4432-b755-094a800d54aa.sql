
-- Update RLS policies for sprints and projects to work with employee email matching
-- This ensures that sprints show when user is sprint leader and projects show when user is assignee

-- First, let's ensure RLS is enabled and policies are applied for the manager role
-- We need to make sure the role_rls_policies table has the correct entries for manager role

-- Insert or update RLS policy settings for manager role
INSERT INTO public.role_rls_policies (role, page_name, rls_enabled) 
VALUES 
  ('manager', 'sprints', true),
  ('manager', 'projects', true),
  ('manager', 'tasks', true)
ON CONFLICT (role, page_name) 
DO UPDATE SET 
  rls_enabled = EXCLUDED.rls_enabled,
  updated_at = now();

-- Now apply the RLS policies with the correct logic
SELECT public.apply_rls_policies();

-- Let's also verify the policies are created correctly by checking if they exist
-- and create them manually if needed

-- Enable RLS on sprints table
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- Drop and recreate sprint policies to ensure they work correctly
DROP POLICY IF EXISTS "rls_policy_sprints_manager" ON public.sprints;
CREATE POLICY "rls_policy_sprints_manager" 
ON public.sprints 
FOR ALL 
USING (sprint_leader_id = public.get_user_employee_id(auth.uid()));

-- Enable RLS on projects table  
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop and recreate project policies to ensure they work correctly
DROP POLICY IF EXISTS "rls_policy_projects_manager" ON public.projects;
CREATE POLICY "rls_policy_projects_manager" 
ON public.projects 
FOR ALL 
USING (assignee_id = public.get_user_employee_id(auth.uid()));

-- Enable RLS on tasks table (should already be done, but ensuring it's correct)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop and recreate task policies to ensure they work correctly
DROP POLICY IF EXISTS "rls_policy_tasks_manager" ON public.tasks;
CREATE POLICY "rls_policy_tasks_manager" 
ON public.tasks 
FOR ALL 
USING (
  assignee_id = public.get_user_employee_id(auth.uid()) OR 
  assigner_id = public.get_user_employee_id(auth.uid())
);
