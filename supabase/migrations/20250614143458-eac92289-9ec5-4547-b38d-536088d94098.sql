
-- Debug and fix the invoice deletion process
-- First, let's make sure the get_completed_tasks_for_invoicing function is working correctly
-- and that tasks are properly unmarked when invoices are deleted

-- Update the get_completed_tasks_for_invoicing function to ensure it works correctly
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
    AND (t.invoiced = false OR t.invoiced IS NULL)
  ORDER BY t.name;
$$;

-- Create a more robust function for deleting invoices and unmarking tasks
CREATE OR REPLACE FUNCTION public.delete_invoice_and_unmark_tasks(invoice_id_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_ids_to_unmark uuid[];
BEGIN
  -- Get all task IDs associated with this invoice
  SELECT ARRAY_AGG(task_id) INTO task_ids_to_unmark
  FROM public.invoice_tasks
  WHERE invoice_id = invoice_id_param;
  
  -- Delete invoice tasks first
  DELETE FROM public.invoice_tasks
  WHERE invoice_id = invoice_id_param;
  
  -- Mark tasks as not invoiced
  IF task_ids_to_unmark IS NOT NULL AND array_length(task_ids_to_unmark, 1) > 0 THEN
    UPDATE public.tasks
    SET invoiced = false
    WHERE id = ANY(task_ids_to_unmark);
  END IF;
  
  -- Finally, delete the invoice
  DELETE FROM public.invoices
  WHERE id = invoice_id_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_invoice_and_unmark_tasks(text) TO authenticated;
