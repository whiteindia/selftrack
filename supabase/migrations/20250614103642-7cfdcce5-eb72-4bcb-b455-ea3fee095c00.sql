
-- Check current RLS policies on projects table and create invoice-specific access
-- First, let's see what RLS policies exist
-- Then create a security definer function that bypasses RLS for invoice creation

-- Create a security definer function to get all active projects for invoice creation
-- This bypasses RLS restrictions when users have invoice create permissions
CREATE OR REPLACE FUNCTION public.get_active_projects_for_invoicing()
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  client_id uuid,
  client_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    p.id,
    p.name,
    p.status,
    p.client_id,
    c.name as client_name
  FROM public.projects p
  LEFT JOIN public.clients c ON p.client_id = c.id
  WHERE p.status = 'Active'
  ORDER BY p.name;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_projects_for_invoicing() TO authenticated;
