
-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "sprints_user_access" ON public.sprints;
DROP POLICY IF EXISTS "tasks_user_access" ON public.tasks;

-- 1. Sprint RLS Policy (updated for better visibility control)
CREATE POLICY "sprints_user_access"
ON public.sprints
FOR SELECT
USING (
  -- Show if user is the sprint leader
  sprint_leader_id = public.get_current_user_employee_id()

  -- OR if the user is a task assignee or assigner in that sprint
  OR EXISTS (
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

-- 2. Task RLS Policy (expanded to include sprint leader access)
CREATE POLICY "tasks_user_access"
ON public.tasks
FOR SELECT
USING (
  -- User is assignee or assigner
  assignee_id = public.get_current_user_employee_id()
  OR assigner_id = public.get_current_user_employee_id()

  -- OR user is sprint leader of any sprint the task is linked to
  OR EXISTS (
    SELECT 1
    FROM public.sprint_tasks st
    JOIN public.sprints s ON s.id = st.sprint_id
    WHERE st.task_id = tasks.id
      AND s.sprint_leader_id = public.get_current_user_employee_id()
  )
);
