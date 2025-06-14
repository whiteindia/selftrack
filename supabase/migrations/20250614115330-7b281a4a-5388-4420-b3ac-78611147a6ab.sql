
-- First, let's check and fix the projects RLS policies
-- Drop the existing problematic policy
DROP POLICY IF EXISTS "rls_policy_projects_manager" ON public.projects;

-- Create a comprehensive policy that allows:
-- 1. Admins to do everything
-- 2. Managers to see projects assigned to them
-- 3. Other roles to see projects for their client
CREATE POLICY "rls_policy_projects_comprehensive" ON public.projects 
FOR ALL USING (
  CASE 
    WHEN public.get_user_role(auth.uid()) = 'admin' THEN true
    WHEN public.get_user_role(auth.uid()) = 'accountant' THEN true
    WHEN public.get_user_role(auth.uid()) = 'manager' THEN 
      assignee_employee_id = public.get_user_employee_id(auth.uid())
    ELSE client_id = public.get_user_client_id(auth.uid())
  END
);

-- Ensure the projects table has RLS enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Also check if there are any conflicting policies and remove them
DROP POLICY IF EXISTS "rls_policy_projects_admin" ON public.projects;
DROP POLICY IF EXISTS "rls_policy_projects_client" ON public.projects;
DROP POLICY IF EXISTS "rls_policy_projects_accountant" ON public.projects;
