
-- Update the get_completed_tasks_for_invoicing function to include subtask hours
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
        -- Main task hours from time_entries
        (SELECT SUM(te.duration_minutes) 
         FROM public.time_entries te 
         WHERE te.task_id = t.id 
           AND te.entry_type = 'task'
           AND te.end_time IS NOT NULL) / 60.0, 2
      ), 0
    ) + COALESCE(
      ROUND(
        -- Subtask hours from time_entries
        (SELECT SUM(te.duration_minutes) 
         FROM public.time_entries te 
         JOIN public.subtasks s ON te.task_id = s.id
         WHERE s.task_id = t.id 
           AND te.entry_type = 'subtask'
           AND te.end_time IS NOT NULL) / 60.0, 2
      ), 0
    ) as hours,
    p.hourly_rate
  FROM public.tasks t
  JOIN public.projects p ON t.project_id = p.id
  WHERE t.project_id = project_uuid 
    AND t.status = 'Completed'
    AND (t.invoiced = false OR t.invoiced IS NULL)
  ORDER BY t.name;
$function$
