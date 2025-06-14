
-- Create a security definer function to get tasks for any invoice
-- This bypasses RLS restrictions for users with invoice permissions
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
    t.hours
  FROM public.tasks t
  JOIN public.invoice_tasks it ON t.id = it.task_id
  WHERE it.invoice_id = invoice_id_param
  ORDER BY t.name;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_invoice_tasks(text) TO authenticated;
