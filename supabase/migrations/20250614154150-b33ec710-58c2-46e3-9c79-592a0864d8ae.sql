
-- First, let's ensure the tasks table has proper RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tasks_user_access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;

-- Enable RLS on tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for tasks based on user assignment
-- Users can only see tasks where they are assignee or assigner
CREATE POLICY "tasks_select_policy" ON public.tasks
FOR SELECT
USING (
  -- User is the assignee (using employee ID lookup)
  assignee_id = public.get_current_user_employee_id()
  OR 
  -- User is the assigner (using employee ID lookup)
  assigner_id = public.get_current_user_employee_id()
  OR
  -- Admin users can see all tasks
  public.get_user_role(auth.uid()) = 'admin'
);

-- Users can insert tasks (as assigner)
CREATE POLICY "tasks_insert_policy" ON public.tasks
FOR INSERT
WITH CHECK (
  -- User can create tasks and will be set as assigner
  assigner_id = public.get_current_user_employee_id()
  OR
  -- Admin users can create any task
  public.get_user_role(auth.uid()) = 'admin'
);

-- Users can update tasks they are involved in
CREATE POLICY "tasks_update_policy" ON public.tasks
FOR UPDATE
USING (
  assignee_id = public.get_current_user_employee_id()
  OR 
  assigner_id = public.get_current_user_employee_id()
  OR
  public.get_user_role(auth.uid()) = 'admin'
);

-- Users can delete tasks they created or are assigned to
CREATE POLICY "tasks_delete_policy" ON public.tasks
FOR DELETE
USING (
  assigner_id = public.get_current_user_employee_id()
  OR
  public.get_user_role(auth.uid()) = 'admin'
);

-- Also ensure time_entries table has proper RLS for wages calculation
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing time_entries policies if they exist
DROP POLICY IF EXISTS "time_entries_select_policy" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_insert_policy" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_update_policy" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_delete_policy" ON public.time_entries;

-- Time entries policies - users can only see their own entries or entries for tasks they're involved in
CREATE POLICY "time_entries_select_policy" ON public.time_entries
FOR SELECT
USING (
  -- User's own time entries
  employee_id = public.get_current_user_employee_id()
  OR
  -- Time entries for tasks where user is assignee or assigner
  task_id IN (
    SELECT id FROM public.tasks 
    WHERE assignee_id = public.get_current_user_employee_id() 
       OR assigner_id = public.get_current_user_employee_id()
  )
  OR
  -- Admin users can see all time entries
  public.get_user_role(auth.uid()) = 'admin'
);

-- Users can insert their own time entries
CREATE POLICY "time_entries_insert_policy" ON public.time_entries
FOR INSERT
WITH CHECK (
  employee_id = public.get_current_user_employee_id()
  OR
  public.get_user_role(auth.uid()) = 'admin'
);

-- Users can update their own time entries
CREATE POLICY "time_entries_update_policy" ON public.time_entries
FOR UPDATE
USING (
  employee_id = public.get_current_user_employee_id()
  OR
  public.get_user_role(auth.uid()) = 'admin'
);

-- Users can delete their own time entries
CREATE POLICY "time_entries_delete_policy" ON public.time_entries
FOR DELETE
USING (
  employee_id = public.get_current_user_employee_id()
  OR
  public.get_user_role(auth.uid()) = 'admin'
);
