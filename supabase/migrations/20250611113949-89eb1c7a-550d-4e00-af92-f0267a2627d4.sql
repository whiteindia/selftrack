
-- Add sprint_leader_id column to sprints table
ALTER TABLE public.sprints 
ADD COLUMN sprint_leader_id uuid REFERENCES public.employees(id);

-- Add index for better query performance on sprint leader
CREATE INDEX idx_sprints_sprint_leader_id ON public.sprints(sprint_leader_id);
