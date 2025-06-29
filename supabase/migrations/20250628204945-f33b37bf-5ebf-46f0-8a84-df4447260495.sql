
-- Add workload-cal page to role privileges for admin users
INSERT INTO public.role_privileges (role, page_name, operation, allowed)
VALUES 
  ('admin', 'workload-cal', 'create', true),
  ('admin', 'workload-cal', 'read', true),
  ('admin', 'workload-cal', 'update', true),
  ('admin', 'workload-cal', 'delete', true)
ON CONFLICT (role, page_name, operation) DO UPDATE SET allowed = EXCLUDED.allowed;
