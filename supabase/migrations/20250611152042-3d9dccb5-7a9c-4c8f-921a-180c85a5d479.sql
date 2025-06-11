
-- Disable RLS on all tables
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_privileges DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies that might be causing issues
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

-- Drop any client-related policies
DROP POLICY IF EXISTS "Users can view their own client data" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to view clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to create clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete clients" ON public.clients;

-- Drop any other possible policies on other tables
DROP POLICY IF EXISTS "Allow authenticated users to view sprints" ON public.sprints;
DROP POLICY IF EXISTS "Allow authenticated users to create sprints" ON public.sprints;
DROP POLICY IF EXISTS "Allow authenticated users to update sprints" ON public.sprints;
DROP POLICY IF EXISTS "Allow authenticated users to delete sprints" ON public.sprints;

DROP POLICY IF EXISTS "Allow authenticated users to view employees" ON public.employees;
DROP POLICY IF EXISTS "Allow authenticated users to create employees" ON public.employees;
DROP POLICY IF EXISTS "Allow authenticated users to update employees" ON public.employees;
DROP POLICY IF EXISTS "Allow authenticated users to delete employees" ON public.employees;

DROP POLICY IF EXISTS "Allow authenticated users to view services" ON public.services;
DROP POLICY IF EXISTS "Allow authenticated users to create services" ON public.services;
DROP POLICY IF EXISTS "Allow authenticated users to update services" ON public.services;
DROP POLICY IF EXISTS "Allow authenticated users to delete services" ON public.services;

-- Drop the security definer functions that were created for RLS
DROP FUNCTION IF EXISTS public.get_current_user_client_id();
DROP FUNCTION IF EXISTS public.is_admin_user();
DROP FUNCTION IF EXISTS public.get_user_role();

-- Clean up any other potential RLS-related functions
DROP FUNCTION IF EXISTS public.check_user_role(text);
DROP FUNCTION IF EXISTS public.user_has_role(text);
