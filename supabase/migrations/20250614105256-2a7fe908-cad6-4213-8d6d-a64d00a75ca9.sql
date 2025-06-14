
-- Create a security definer function to handle complete invoice creation
-- This bypasses RLS restrictions for the entire invoice creation process
CREATE OR REPLACE FUNCTION public.create_invoice_with_tasks(
  p_invoice_id text,
  p_client_id uuid,
  p_project_id uuid,
  p_amount numeric,
  p_hours numeric,
  p_rate numeric,
  p_due_date date,
  p_task_ids uuid[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_record record;
  v_task_id uuid;
BEGIN
  -- Insert the invoice
  INSERT INTO public.invoices (
    id, client_id, project_id, amount, hours, rate, status, due_date
  ) VALUES (
    p_invoice_id, p_client_id, p_project_id, p_amount, p_hours, p_rate, 'Draft', p_due_date
  ) RETURNING * INTO v_invoice_record;
  
  -- Link tasks to the invoice
  FOREACH v_task_id IN ARRAY p_task_ids
  LOOP
    INSERT INTO public.invoice_tasks (invoice_id, task_id)
    VALUES (p_invoice_id, v_task_id);
  END LOOP;
  
  -- Mark tasks as invoiced
  UPDATE public.tasks 
  SET invoiced = true 
  WHERE id = ANY(p_task_ids);
  
  -- Return the created invoice as JSON
  RETURN row_to_json(v_invoice_record);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_invoice_with_tasks(text, uuid, uuid, numeric, numeric, numeric, date, uuid[]) TO authenticated;
