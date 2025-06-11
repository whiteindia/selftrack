
-- Update the apply_rls_policies function to use user-based filtering for tasks and sprints
CREATE OR REPLACE FUNCTION public.apply_rls_policies()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy_record RECORD;
  table_name TEXT;
  policy_name TEXT;
BEGIN
  -- Apply RLS policies for clients table
  FOR policy_record IN 
    SELECT role, rls_enabled FROM public.role_rls_policies WHERE page_name = 'clients'
  LOOP
    IF policy_record.rls_enabled THEN
      -- Enable RLS on clients table
      EXECUTE 'ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY';
      
      -- Create role-specific policy for clients
      policy_name := 'rls_policy_clients_' || policy_record.role;
      
      -- Drop existing policy if it exists
      EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.clients';
      
      -- Create new policy based on role
      IF policy_record.role = 'admin' THEN
        -- Admins can see all clients
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.clients FOR ALL USING (true)';
      ELSE
        -- Other roles can only see their own client data
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.clients FOR ALL USING (id = public.get_user_client_id(auth.uid()))';
      END IF;
    END IF;
  END LOOP;
  
  -- Apply RLS policies for projects table
  FOR policy_record IN 
    SELECT role, rls_enabled FROM public.role_rls_policies WHERE page_name = 'projects'
  LOOP
    IF policy_record.rls_enabled THEN
      -- Enable RLS on projects table
      EXECUTE 'ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY';
      
      policy_name := 'rls_policy_projects_' || policy_record.role;
      EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.projects';
      
      IF policy_record.role = 'admin' THEN
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.projects FOR ALL USING (true)';
      ELSE
        -- Other roles can only see projects for their client
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.projects FOR ALL USING (client_id = public.get_user_client_id(auth.uid()))';
      END IF;
    END IF;
  END LOOP;
  
  -- Apply RLS policies for tasks table
  FOR policy_record IN 
    SELECT role, rls_enabled FROM public.role_rls_policies WHERE page_name = 'tasks'
  LOOP
    IF policy_record.rls_enabled THEN
      -- Enable RLS on tasks table
      EXECUTE 'ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY';
      
      policy_name := 'rls_policy_tasks_' || policy_record.role;
      EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.tasks';
      
      IF policy_record.role = 'admin' THEN
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.tasks FOR ALL USING (true)';
      ELSE
        -- Other roles can only see tasks where they are assignee or assigner
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.tasks FOR ALL USING (
          assignee_id = auth.uid() OR assigner_id = auth.uid()
        )';
      END IF;
    END IF;
  END LOOP;
  
  -- Apply RLS policies for sprints table
  FOR policy_record IN 
    SELECT role, rls_enabled FROM public.role_rls_policies WHERE page_name = 'sprints'
  LOOP
    IF policy_record.rls_enabled THEN
      -- Enable RLS on sprints table
      EXECUTE 'ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY';
      
      policy_name := 'rls_policy_sprints_' || policy_record.role;
      EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.sprints';
      
      IF policy_record.role = 'admin' THEN
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.sprints FOR ALL USING (true)';
      ELSE
        -- Other roles can only see sprints where they are the sprint leader
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.sprints FOR ALL USING (
          sprint_leader_id = auth.uid()
        )';
      END IF;
    END IF;
  END LOOP;
  
  -- Apply RLS policies for employees table
  FOR policy_record IN 
    SELECT role, rls_enabled FROM public.role_rls_policies WHERE page_name = 'employees'
  LOOP
    IF policy_record.rls_enabled THEN
      -- Enable RLS on employees table
      EXECUTE 'ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY';
      
      policy_name := 'rls_policy_employees_' || policy_record.role;
      EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.employees';
      
      IF policy_record.role = 'admin' THEN
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.employees FOR ALL USING (true)';
      ELSE
        -- Other roles can see all employees (business requirement)
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.employees FOR ALL USING (true)';
      END IF;
    END IF;
  END LOOP;
  
  -- Apply RLS policies for invoices table
  FOR policy_record IN 
    SELECT role, rls_enabled FROM public.role_rls_policies WHERE page_name = 'invoices'
  LOOP
    IF policy_record.rls_enabled THEN
      -- Enable RLS on invoices table
      EXECUTE 'ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY';
      
      policy_name := 'rls_policy_invoices_' || policy_record.role;
      EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.invoices';
      
      IF policy_record.role = 'admin' THEN
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.invoices FOR ALL USING (true)';
      ELSE
        -- Other roles can only see invoices for their client
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.invoices FOR ALL USING (client_id = public.get_user_client_id(auth.uid()))';
      END IF;
    END IF;
  END LOOP;
  
  -- Apply RLS policies for payments table
  FOR policy_record IN 
    SELECT role, rls_enabled FROM public.role_rls_policies WHERE page_name = 'payments'
  LOOP
    IF policy_record.rls_enabled THEN
      -- Enable RLS on payments table
      EXECUTE 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY';
      
      policy_name := 'rls_policy_payments_' || policy_record.role;
      EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.payments';
      
      IF policy_record.role = 'admin' THEN
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.payments FOR ALL USING (true)';
      ELSE
        -- Other roles can only see payments for their client
        EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.payments FOR ALL USING (client_id = public.get_user_client_id(auth.uid()))';
      END IF;
    END IF;
  END LOOP;
  
  -- Apply RLS policies for services table
  FOR policy_record IN 
    SELECT role, rls_enabled FROM public.role_rls_policies WHERE page_name = 'services'
  LOOP
    IF policy_record.rls_enabled THEN
      -- Enable RLS on services table
      EXECUTE 'ALTER TABLE public.services ENABLE ROW LEVEL SECURITY';
      
      policy_name := 'rls_policy_services_' || policy_record.role;
      EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.services';
      
      -- All roles can see all services (business requirement)
      EXECUTE 'CREATE POLICY "' || policy_name || '" ON public.services FOR ALL USING (true)';
    END IF;
  END LOOP;
  
END;
$$;
