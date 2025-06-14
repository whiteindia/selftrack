
-- Update the projects RLS policy to include assignee matching for any role with read permission
DROP POLICY IF EXISTS "rls_policy_projects_comprehensive" ON public.projects;

-- Create a more flexible policy that checks assignee matching for any role with read permission
CREATE POLICY "rls_policy_projects_comprehensive" ON public.projects 
FOR ALL USING (
  CASE 
    WHEN public.get_user_role(auth.uid()) = 'admin' THEN true
    WHEN public.get_user_role(auth.uid()) = 'accountant' THEN true
    ELSE 
      -- For any other role with read permission, check both client access and assignee access
      client_id = public.get_user_client_id(auth.uid()) 
      OR assignee_employee_id = public.get_user_employee_id(auth.uid())
  END
);

-- Ensure the projects table has RLS enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
