
-- Update the get_invoice_tasks function to include subtask hours
CREATE OR REPLACE FUNCTION public.get_invoice_tasks(invoice_id_param text)
 RETURNS TABLE(id uuid, name text, hours numeric)
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
    ) as hours
  FROM public.tasks t
  JOIN public.invoice_tasks it ON t.id = it.task_id
  WHERE it.invoice_id = invoice_id_param
  ORDER BY t.name;
$function$
