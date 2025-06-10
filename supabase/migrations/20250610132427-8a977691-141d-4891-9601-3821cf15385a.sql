
-- Disable RLS on tables that were enabled
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_tasks DISABLE ROW LEVEL SECURITY;

-- Drop all the RLS policies that were created
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

-- Drop the security definer functions that were created
DROP FUNCTION IF EXISTS public.get_current_user_client_id();
DROP FUNCTION IF EXISTS public.is_admin_user();
