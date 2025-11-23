-- Check and fix permissions for debate_topics table
-- First, let's see what RLS policies exist
SELECT polname, polcmd, polroles, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'public.debate_topics'::regclass;

-- Check current permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'debate_topics' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;