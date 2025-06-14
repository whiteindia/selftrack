
-- Update the tasks RLS policy to allow users to update wage status for their own tasks
-- Drop the existing policy first
DROP POLICY IF EXISTS "tasks_update_wage_status_policy" ON public.tasks;

-- Create a new policy that allows:
-- 1. Admin users to update all tasks
-- 2. Users with wages update permission to update all tasks
-- 3. Users to update wage_status for tasks they are assigned to (even without general wages update permission)
CREATE POLICY "tasks_update_wage_status_policy" ON public.tasks
FOR UPDATE
USING (
  -- Admin users can update all tasks
  public.get_user_role(auth.uid()) = 'admin'
  OR
  -- Users with wages update permission can update all tasks
  EXISTS (
    SELECT 1 FROM public.role_privileges 
    WHERE role = public.get_user_role(auth.uid())
      AND page_name = 'wages' 
      AND operation = 'update' 
      AND allowed = true
  )
  OR
  -- Users can update wage_status for tasks they are assigned to or assigned by them
  (
    (assignee_id = public.get_user_employee_id(auth.uid()) 
     OR assigner_id = public.get_user_employee_id(auth.uid()))
    AND 
    -- Only allow if they have at least read access to wages page
    EXISTS (
      SELECT 1 FROM public.role_privileges 
      WHERE role = public.get_user_role(auth.uid())
        AND page_name = 'wages' 
        AND operation = 'read' 
        AND allowed = true
    )
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
  OR
  (
    (assignee_id = public.get_user_employee_id(auth.uid()) 
     OR assigner_id = public.get_user_employee_id(auth.uid()))
    AND 
    EXISTS (
      SELECT 1 FROM public.role_privileges 
      WHERE role = public.get_user_role(auth.uid())
        AND page_name = 'wages' 
        AND operation = 'read' 
        AND allowed = true
    )
  )
);
