
-- Update the task RLS policy to also allow access when user is sprint leader
-- This ensures sprint leaders can see all tasks in their sprints, not just assigned ones

-- Drop existing task policies first
DROP POLICY IF EXISTS "rls_policy_tasks_manager" ON public.tasks;
DROP POLICY IF EXISTS "rls_policy_tasks_admin" ON public.tasks;

-- Create new task policy that allows access if:
-- 1. User is the assignee OR assigner of the task
-- 2. OR User is the sprint leader for any sprint containing this task
CREATE POLICY "tasks_access_policy" 
ON public.tasks 
FOR ALL 
USING (
  -- User is assignee or assigner of the task
  assignee_id = public.get_user_employee_id(auth.uid()) OR 
  assigner_id = public.get_user_employee_id(auth.uid())
  OR
  -- User is sprint leader for any sprint containing this task
  EXISTS (
    SELECT 1 
    FROM public.sprint_tasks st
    JOIN public.sprints s ON st.sprint_id = s.id
    WHERE st.task_id = tasks.id 
    AND s.sprint_leader_id = public.get_user_employee_id(auth.uid())
  )
);
