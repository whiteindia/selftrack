
-- Drop the existing function first (needed for return type changes)
DROP FUNCTION IF EXISTS public.get_active_projects_for_invoicing();

-- Re-create with extra columns: service and project_amount
CREATE FUNCTION public.get_active_projects_for_invoicing()
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  client_id uuid,
  client_name text,
  service text,
  project_amount numeric
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
    c.name as client_name,
    p.service,
    p.project_amount
  FROM public.projects p
  LEFT JOIN public.clients c ON p.client_id = c.id
  WHERE p.status = 'Active'
  ORDER BY p.name;
$$;

-- Permissions unchanged (already granted)
