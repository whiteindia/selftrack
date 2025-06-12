
-- First, add the project_id column to sprints table to link sprints to projects
ALTER TABLE public.sprints 
ADD COLUMN project_id uuid REFERENCES public.projects(id);

-- Now update the sprints policy to include project manager access
DROP POLICY IF EXISTS "sprints_user_access" ON public.sprints;

CREATE POLICY "sprints_user_access"
ON public.sprints
FOR ALL
USING (
  -- ✅ User is the sprint leader
  sprint_leader_id = public.get_current_user_employee_id()

  -- ✅ OR user is assignee/assigner of tasks in this sprint
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

  -- ✅ OR user is the assignee of the project this sprint belongs to
  OR EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = sprints.project_id
      AND p.assignee_employee_id = public.get_current_user_employee_id()
  )
);
