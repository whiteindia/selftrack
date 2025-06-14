
-- Create a security definer function to get completed tasks for invoice creation
-- This bypasses RLS restrictions when users have invoice create permissions
CREATE OR REPLACE FUNCTION public.get_completed_tasks_for_invoicing(project_uuid uuid)
RETURNS TABLE (
  id uuid,
  name text,
  hours numeric,
  hourly_rate numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    t.id,
    t.name,
    t.hours,
    p.hourly_rate
  FROM public.tasks t
  JOIN public.projects p ON t.project_id = p.id
  WHERE t.project_id = project_uuid 
    AND t.status = 'Completed'
    AND t.invoiced = false
  ORDER BY t.name;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_completed_tasks_for_invoicing(uuid) TO authenticated;
