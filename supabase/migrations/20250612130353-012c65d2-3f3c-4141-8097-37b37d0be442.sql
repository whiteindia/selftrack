
-- First, create a security definer function to get user employee ID safely
CREATE OR REPLACE FUNCTION public.get_current_user_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.employees WHERE email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) LIMIT 1;
$$;

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "sprints_access_policy" ON public.sprints;
DROP POLICY IF EXISTS "tasks_access_policy" ON public.tasks;
DROP POLICY IF EXISTS "rls_policy_sprints_manager" ON public.sprints;
DROP POLICY IF EXISTS "rls_policy_sprints_admin" ON public.sprints;
DROP POLICY IF EXISTS "rls_policy_tasks_manager" ON public.tasks;
DROP POLICY IF EXISTS "rls_policy_tasks_admin" ON public.tasks;

-- Create new sprint policy without recursion
CREATE POLICY "sprints_user_access" 
ON public.sprints 
FOR ALL 
USING (
  -- User is sprint leader
  sprint_leader_id = public.get_current_user_employee_id()
  OR
  -- User has tasks in this sprint (using direct join to avoid recursion)
  id IN (
    SELECT DISTINCT st.sprint_id
    FROM public.sprint_tasks st
    JOIN public.tasks t ON st.task_id = t.id
    WHERE t.assignee_id = public.get_current_user_employee_id()
       OR t.assigner_id = public.get_current_user_employee_id()
  )
);

-- Create new task policy without recursion
CREATE POLICY "tasks_user_access" 
ON public.tasks 
FOR ALL 
USING (
  -- User is assignee or assigner of the task
  assignee_id = public.get_current_user_employee_id() 
  OR assigner_id = public.get_current_user_employee_id()
  OR
  -- User is sprint leader for sprints containing this task
  id IN (
    SELECT DISTINCT st.task_id
    FROM public.sprint_tasks st
    JOIN public.sprints s ON st.sprint_id = s.id
    WHERE s.sprint_leader_id = public.get_current_user_employee_id()
  )
);
