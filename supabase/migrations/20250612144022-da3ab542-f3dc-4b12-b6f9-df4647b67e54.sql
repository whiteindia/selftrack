
-- Update sprints RLS policy with the simplified approach
DROP POLICY IF EXISTS "sprints_user_access" ON public.sprints;

CREATE POLICY "sprints_user_access"
ON public.sprints
FOR SELECT
USING (
  -- ✅ User is sprint leader
  sprint_leader_id = public.get_current_user_employee_id()

  -- ✅ OR user is assignee of the project this sprint belongs to
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = sprints.project_id
      AND p.assignee_employee_id = public.get_current_user_employee_id()
  )

  -- ✅ OR user has any tasks in the sprint
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

-- Update tasks RLS policy with the simplified approach
DROP POLICY IF EXISTS "tasks_user_access" ON public.tasks;

CREATE POLICY "tasks_user_access"
ON public.tasks
FOR SELECT
USING (
  -- ✅ User is assignee or assigner
  assignee_id = public.get_current_user_employee_id()
  OR assigner_id = public.get_current_user_employee_id()

  -- ✅ OR task belongs to a sprint which is linked to a project
  -- where user is the project assignee
  OR EXISTS (
    SELECT 1
    FROM public.sprint_tasks st
    JOIN public.sprints s ON s.id = st.sprint_id
    JOIN public.projects p ON p.id = s.project_id
    WHERE st.task_id = tasks.id
      AND p.assignee_employee_id = public.get_current_user_employee_id()
  )
);
