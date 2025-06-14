
-- Update the tasks RLS policy to only allow users with explicit wages update permission
-- Drop the existing policy first
DROP POLICY IF EXISTS "tasks_update_wage_status_policy" ON public.tasks;

-- Create a new policy that allows:
-- 1. Admin users to update all tasks
-- 2. Only users with wages update permission to update tasks (no exceptions for assignees)
CREATE POLICY "tasks_update_wage_status_policy" ON public.tasks
FOR UPDATE
USING (
  -- Admin users can update all tasks
  public.get_user_role(auth.uid()) = 'admin'
  OR
  -- Only users with wages update permission can update tasks
  EXISTS (
    SELECT 1 FROM public.role_privileges 
    WHERE role = public.get_user_role(auth.uid())
      AND page_name = 'wages' 
      AND operation = 'update' 
      AND allowed = true
  )
)
WITH CHECK (
  -- Same conditions for the check clause
  public.get_user_role(auth.uid()) = 'admin'
  OR
  EXISTS (
    SELECT 1 FROM public.role_privileges 
    WHERE role = public.get_user_role(auth.uid())
      AND page_name = 'wages' 
      AND operation = 'update' 
      AND allowed = true
  )
);
