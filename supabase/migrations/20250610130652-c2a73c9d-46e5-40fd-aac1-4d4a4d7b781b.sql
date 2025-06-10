
-- First, let's enable RLS on all tables that need client-based filtering
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_tasks ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to get the current user's client_id
CREATE OR REPLACE FUNCTION public.get_current_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create a security definer function to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their client projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view tasks for their client projects" ON public.tasks;
DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can view their client invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;

DROP POLICY IF EXISTS "Users can view their client payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;

DROP POLICY IF EXISTS "Users can view time entries for their client projects" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can insert time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can update time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can delete time entries" ON public.time_entries;

DROP POLICY IF EXISTS "Users can view sprint tasks for their client projects" ON public.sprint_tasks;
DROP POLICY IF EXISTS "Admins can insert sprint tasks" ON public.sprint_tasks;
DROP POLICY IF EXISTS "Admins can update sprint tasks" ON public.sprint_tasks;
DROP POLICY IF EXISTS "Admins can delete sprint tasks" ON public.sprint_tasks;

-- Projects: Users can only see projects where they are the client
CREATE POLICY "Users can view their client projects" ON public.projects
FOR SELECT USING (
  public.is_admin_user() OR 
  client_id = public.get_current_user_client_id()
);

CREATE POLICY "Admins can insert projects" ON public.projects
FOR INSERT WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update projects" ON public.projects
FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admins can delete projects" ON public.projects
FOR DELETE USING (public.is_admin_user());

-- Tasks: Users can only see tasks for their client's projects
CREATE POLICY "Users can view tasks for their client projects" ON public.tasks
FOR SELECT USING (
  public.is_admin_user() OR 
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = tasks.project_id 
    AND projects.client_id = public.get_current_user_client_id()
  )
);

CREATE POLICY "Admins can insert tasks" ON public.tasks
FOR INSERT WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update tasks" ON public.tasks
FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admins can delete tasks" ON public.tasks
FOR DELETE USING (public.is_admin_user());

-- Invoices: Users can only see invoices for their client
CREATE POLICY "Users can view their client invoices" ON public.invoices
FOR SELECT USING (
  public.is_admin_user() OR 
  client_id = public.get_current_user_client_id()
);

CREATE POLICY "Admins can insert invoices" ON public.invoices
FOR INSERT WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update invoices" ON public.invoices
FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admins can delete invoices" ON public.invoices
FOR DELETE USING (public.is_admin_user());

-- Payments: Users can only see payments for their client
CREATE POLICY "Users can view their client payments" ON public.payments
FOR SELECT USING (
  public.is_admin_user() OR 
  client_id = public.get_current_user_client_id()
);

CREATE POLICY "Admins can insert payments" ON public.payments
FOR INSERT WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update payments" ON public.payments
FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admins can delete payments" ON public.payments
FOR DELETE USING (public.is_admin_user());

-- Time entries: Users can only see time entries for tasks in their client's projects
CREATE POLICY "Users can view time entries for their client projects" ON public.time_entries
FOR SELECT USING (
  public.is_admin_user() OR 
  EXISTS (
    SELECT 1 FROM public.tasks 
    JOIN public.projects ON projects.id = tasks.project_id
    WHERE tasks.id = time_entries.task_id 
    AND projects.client_id = public.get_current_user_client_id()
  )
);

CREATE POLICY "Admins can insert time entries" ON public.time_entries
FOR INSERT WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update time entries" ON public.time_entries
FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admins can delete time entries" ON public.time_entries
FOR DELETE USING (public.is_admin_user());

-- Sprint tasks: Users can only see sprint tasks for their client's projects
CREATE POLICY "Users can view sprint tasks for their client projects" ON public.sprint_tasks
FOR SELECT USING (
  public.is_admin_user() OR 
  EXISTS (
    SELECT 1 FROM public.tasks 
    JOIN public.projects ON projects.id = tasks.project_id
    WHERE tasks.id = sprint_tasks.task_id 
    AND projects.client_id = public.get_current_user_client_id()
  )
);

CREATE POLICY "Admins can insert sprint tasks" ON public.sprint_tasks
FOR INSERT WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update sprint tasks" ON public.sprint_tasks
FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admins can delete sprint tasks" ON public.sprint_tasks
FOR DELETE USING (public.is_admin_user());
