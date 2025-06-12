
-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "sprints_user_access" ON public.sprints;
DROP POLICY IF EXISTS "tasks_user_access" ON public.tasks;

-- 1. Sprint RLS Policy (keeps full logic with task access)
CREATE POLICY "sprints_user_access" 
ON public.sprints 
FOR ALL 
USING (
  -- Show if user is sprint leader
  sprint_leader_id = public.get_current_user_employee_id()
  OR
  -- OR user is assignee/assigner in any task inside this sprint
  EXISTS (
    SELECT 1
    FROM public.sprint_tasks st
    JOIN public.tasks t ON st.task_id = t.id
    WHERE st.sprint_id = sprints.id
      AND (
        t.assignee_id = public.get_current_user_employee_id()
        OR t.assigner_id = public.get_current_user_employee_id()
      )
  )
);

-- 2. Task RLS Policy (lightweight - no reference to sprints to prevent recursion)
CREATE POLICY "tasks_user_access"
ON public.tasks
FOR ALL
USING (
  assignee_id = public.get_current_user_employee_id()
  OR assigner_id = public.get_current_user_employee_id()
  -- ✨ Do NOT reference sprints here to prevent recursion
);
