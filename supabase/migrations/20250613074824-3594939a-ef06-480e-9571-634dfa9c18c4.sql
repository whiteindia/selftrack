
-- Create the roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL UNIQUE,
  landing_page TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add the landing_page column if the table already exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'roles' AND column_name = 'landing_page') THEN
    ALTER TABLE public.roles ADD COLUMN landing_page TEXT;
  END IF;
END $$;

-- Insert existing roles from role_privileges into the roles table
INSERT INTO public.roles (role)
SELECT DISTINCT role 
FROM public.role_privileges 
WHERE role NOT IN (SELECT role FROM public.roles)
ON CONFLICT (role) DO NOTHING;

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.roles;

CREATE POLICY "Admins can manage all roles" 
  ON public.roles 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create a function to get role landing page
CREATE OR REPLACE FUNCTION public.get_role_landing_page(role_name text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT landing_page FROM public.roles WHERE role = role_name LIMIT 1;
$function$;

-- Create a function to get available pages for a role (pages with read privilege)
CREATE OR REPLACE FUNCTION public.get_role_available_pages(role_name text)
RETURNS TABLE(page_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT rp.page_name 
  FROM public.role_privileges rp
  WHERE rp.role = role_name 
    AND rp.operation = 'read' 
    AND rp.allowed = true
  ORDER BY rp.page_name;
$function$;
