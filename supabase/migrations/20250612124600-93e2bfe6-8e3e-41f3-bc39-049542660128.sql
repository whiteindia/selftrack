
-- Enable RLS only on sprints table
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- Drop any old sprint-specific policies
DROP POLICY IF EXISTS "rls_policy_sprints_manager" ON public.sprints;
DROP POLICY IF EXISTS "rls_policy_sprints_admin" ON public.sprints;

-- Create new policy allowing sprint leader or task assignee to access
CREATE POLICY "sprints_access_policy" 
ON public.sprints 
FOR ALL 
USING (
  sprint_leader_id = public.get_user_employee_id(auth.uid())
  OR
  EXISTS (
    SELECT 1 
    FROM public.sprint_tasks st
    JOIN public.tasks t ON st.task_id = t.id
    WHERE st.sprint_id = sprints.id 
    AND t.assignee_id = public.get_user_employee_id(auth.uid())
  )
);
