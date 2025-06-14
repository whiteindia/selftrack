
-- Update the get_invoice_tasks function to calculate actual logged hours from time_entries
CREATE OR REPLACE FUNCTION public.get_invoice_tasks(invoice_id_param text)
RETURNS TABLE (
  id uuid,
  name text,
  hours numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
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
    ) as hours
  FROM public.tasks t
  JOIN public.invoice_tasks it ON t.id = it.task_id
  WHERE it.invoice_id = invoice_id_param
  ORDER BY t.name;
$$;
