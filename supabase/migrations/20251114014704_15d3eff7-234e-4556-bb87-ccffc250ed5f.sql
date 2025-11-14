-- Add acts_to_engage column to network_people table
ALTER TABLE public.network_people 
ADD COLUMN acts_to_engage text;

-- Add a comment to describe the column
COMMENT ON COLUMN public.network_people.acts_to_engage IS 'Action to engage and build rapport with the contact';