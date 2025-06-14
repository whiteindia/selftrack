
-- Update the function to calculate actual logged hours from time_entries
CREATE OR REPLACE FUNCTION public.get_completed_tasks_for_invoicing(project_uuid uuid)
 RETURNS TABLE(id uuid, name text, hours numeric, hourly_rate numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    t.id,
    t.name,
    COALESCE(
      ROUND(
        (SELECT SUM(te.duration_minutes) 
         FROM public.time_entries te 
         WHERE te.task_id = t.id 
           AND te.end_time IS NOT NULL) / 60.0, 2
      ), 0
    ) as hours,
    p.hourly_rate
  FROM public.tasks t
  JOIN public.projects p ON t.project_id = p.id
  WHERE t.project_id = project_uuid 
    AND t.status = 'Completed'
    AND t.invoiced = false
  ORDER BY t.name;
$function$
