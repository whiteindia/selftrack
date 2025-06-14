
-- Create a security definer view that provides basic project info for task display
-- This bypasses RLS for project names while keeping other project data secure
CREATE OR REPLACE VIEW public.task_project_info AS
SELECT 
  p.id,
  p.name,
  p.service,
  c.name as client_name
FROM public.projects p
LEFT JOIN public.clients c ON p.client_id = c.id;

-- Make this view accessible to authenticated users
-- Since it's a view with limited data, we can safely allow broad access
ALTER VIEW public.task_project_info OWNER TO postgres;

-- Grant select access to authenticated users
GRANT SELECT ON public.task_project_info TO authenticated;

-- Create a security definer function to get project info by ID
CREATE OR REPLACE FUNCTION public.get_project_info_for_task(project_uuid UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  service TEXT,
  client_name TEXT
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    tpi.id,
    tpi.name,
    tpi.service,
    tpi.client_name
  FROM public.task_project_info tpi
  WHERE tpi.id = project_uuid;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_project_info_for_task(UUID) TO authenticated;
