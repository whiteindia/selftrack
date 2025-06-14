
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_active_projects_for_invoicing();

-- Add type column to projects table for billing type
ALTER TABLE public.projects 
ADD COLUMN type TEXT NOT NULL DEFAULT 'Hourly';

-- Add a check constraint to ensure only valid billing types
ALTER TABLE public.projects 
ADD CONSTRAINT projects_type_check 
CHECK (type IN ('Hourly', 'Fixed'));

-- Recreate the function with the new return type including the type column
CREATE OR REPLACE FUNCTION public.get_active_projects_for_invoicing()
RETURNS TABLE(id uuid, name text, status text, client_id uuid, client_name text, service text, type text, project_amount numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT 
    p.id,
    p.name,
    p.status,
    p.client_id,
    c.name as client_name,
    p.service,
    p.type,
    p.project_amount
  FROM public.projects p
  LEFT JOIN public.clients c ON p.client_id = c.id
  WHERE p.status = 'Active'
  ORDER BY p.name;
$function$
