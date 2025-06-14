
-- Update time_entries RLS policies to restrict wage data access properly
-- Drop existing policies first
DROP POLICY IF EXISTS "time_entries_select_policy" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_insert_policy" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_update_policy" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_delete_policy" ON public.time_entries;

-- Create updated RLS policies for time_entries with proper wage data access control
-- Users can only see their own time entries (which are used for wage calculations)
CREATE POLICY "time_entries_select_policy" ON public.time_entries
FOR SELECT
USING (
  -- Admin users can see all time entries
  public.get_user_role(auth.uid()) = 'admin'
  OR
  -- Manager users can see all time entries (if they have wages read permission)
  (
    public.get_user_role(auth.uid()) = 'manager' 
    AND EXISTS (
      SELECT 1 FROM public.role_privileges 
      WHERE role = 'manager' 
        AND page_name = 'wages' 
        AND operation = 'read' 
        AND allowed = true
    )
  )
  OR
  -- Users can only see their own time entries
  employee_id = public.get_current_user_employee_id()
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
