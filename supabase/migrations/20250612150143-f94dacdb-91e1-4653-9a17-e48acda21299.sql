
-- Update tasks RLS policy to include project manager access
DROP POLICY IF EXISTS "tasks_user_access" ON public.tasks;

CREATE POLICY "tasks_user_access"
ON public.tasks
FOR SELECT
USING (
  -- Direct task-level access
  assignee_id = public.get_current_user_employee_id()
  OR assigner_id = public.get_current_user_employee_id()

  -- OR task is part of a sprint which belongs to a project where user is assignee
  OR EXISTS (
    SELECT 1
    FROM public.sprint_tasks st
    JOIN public.sprints s ON s.id = st.sprint_id
    JOIN public.projects p ON p.id = s.project_id
    WHERE st.task_id = tasks.id
      AND p.assignee_employee_id = public.get_current_user_employee_id()
  )
);
