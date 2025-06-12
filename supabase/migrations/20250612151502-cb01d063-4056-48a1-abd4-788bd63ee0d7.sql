
-- Create a view to safely map tasks to their project managers
-- This breaks the circular dependency between tasks and sprints policies
CREATE OR REPLACE VIEW public.task_project_managers AS
SELECT
  t.id AS task_id,
  p.assignee_employee_id AS project_manager_id
FROM public.tasks t
JOIN public.sprint_tasks st ON st.task_id = t.id
JOIN public.sprints s ON s.id = st.sprint_id
JOIN public.projects p ON p.id = s.project_id;

-- Update tasks RLS policy to include project manager access via the view
DROP POLICY IF EXISTS "tasks_user_access" ON public.tasks;

CREATE POLICY "tasks_user_access"
ON public.tasks
FOR SELECT
USING (
  -- Direct task access
  assignee_id = public.get_current_user_employee_id()
  OR assigner_id = public.get_current_user_employee_id()

  -- OR user is the project manager via view (safe - no recursion)
  OR EXISTS (
    SELECT 1 FROM public.task_project_managers v
    WHERE v.task_id = tasks.id
      AND v.project_manager_id = public.get_current_user_employee_id()
  )
);
