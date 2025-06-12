
-- FIXED VERSION: Remove recursion by making tasks policy direct only
-- and keeping all multi-table logic in sprints policy

-- Update sprints RLS policy (keep all multi-table logic here)
DROP POLICY IF EXISTS "sprints_user_access" ON public.sprints;

CREATE POLICY "sprints_user_access"
ON public.sprints
FOR SELECT
USING (
  -- User is sprint leader
  sprint_leader_id = public.get_current_user_employee_id()

  -- OR user is assignee of the project this sprint belongs to
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = sprints.project_id
      AND p.assignee_employee_id = public.get_current_user_employee_id()
  )

  -- OR user is assigned to any task under this sprint
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

-- Update tasks RLS policy (lightweight — avoid any joins to prevent recursion)
DROP POLICY IF EXISTS "tasks_user_access" ON public.tasks;

CREATE POLICY "tasks_user_access"
ON public.tasks
FOR SELECT
USING (
  -- Direct assignment only - no joins to sprints or projects
  assignee_id = public.get_current_user_employee_id()
  OR assigner_id = public.get_current_user_employee_id()
);
