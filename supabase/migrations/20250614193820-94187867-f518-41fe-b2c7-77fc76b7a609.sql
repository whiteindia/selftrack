
-- Update RLS policies for tasks table to allow wage status updates
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "tasks_update_wage_status_policy" ON public.tasks;

-- Create a policy that allows users with wages update permission to update wage status
CREATE POLICY "tasks_update_wage_status_policy" ON public.tasks
FOR UPDATE
USING (
  -- Admin users can update all tasks
  public.get_user_role(auth.uid()) = 'admin'
  OR
  -- Users with wages update permission can update wage_status
  EXISTS (
    SELECT 1 FROM public.role_privileges 
    WHERE role = public.get_user_role(auth.uid())
      AND page_name = 'wages' 
      AND operation = 'update' 
      AND allowed = true
  )
  OR
  -- Users can update tasks they are assigned to or assigned by them
  assignee_id = public.get_user_employee_id(auth.uid()) 
  OR 
  assigner_id = public.get_user_employee_id(auth.uid())
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
  assignee_id = public.get_user_employee_id(auth.uid()) 
  OR 
  assigner_id = public.get_user_employee_id(auth.uid())
);

-- Grant UPDATE permissions on tasks table to authenticated users
GRANT UPDATE ON public.tasks TO authenticated;
