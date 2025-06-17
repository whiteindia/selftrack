
-- Add services column to clients table to store array of service IDs
ALTER TABLE public.clients 
ADD COLUMN services text[] DEFAULT ARRAY[]::text[];

-- Add comment to describe the column
COMMENT ON COLUMN public.clients.services IS 'Array of service IDs associated with this client';
