
-- Create a table to store RLS policy configurations
CREATE TABLE public.role_rls_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  page_name TEXT NOT NULL,
  rls_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, page_name)
);

-- Enable RLS on the role_rls_policies table itself
ALTER TABLE public.role_rls_policies ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage RLS policies (typically only admins would do this)
CREATE POLICY "Allow authenticated users to manage RLS policies" ON public.role_rls_policies
FOR ALL USING (true);

-- Create a function to get the current user's role (avoiding recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_roles WHERE user_id = $1 LIMIT 1;
$$;

-- Create a function to get the current user's client_id (avoiding recursion)
CREATE OR REPLACE FUNCTION public.get_user_client_id(user_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT client_id FROM public.profiles WHERE id = $1 LIMIT 1;
$$;

-- Create a function to check if RLS is enabled for a specific role and page
CREATE OR REPLACE FUNCTION public.is_rls_enabled(role_name TEXT, page_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT rls_enabled FROM public.role_rls_policies 
     WHERE role = role_name AND page_name = page_name),
    false
  );
$$;

-- Function to dynamically enable RLS policies based on role configurations
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
  
  -- Apply similar patterns for other tables...
  -- Add more table-specific RLS logic as needed
END;
$$;
