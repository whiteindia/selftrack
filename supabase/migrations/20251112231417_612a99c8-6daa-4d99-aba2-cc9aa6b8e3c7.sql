-- Create network_people table for tracking professional contacts
CREATE TABLE public.network_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  relationship_type text NOT NULL,
  role_position text NOT NULL,
  industry_domain text NOT NULL,
  work_type text NOT NULL,
  influence_level text NOT NULL DEFAULT 'Medium',
  last_conversation_summary text,
  last_conversation_date date,
  follow_up_plan text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.network_people ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view network people"
  ON public.network_people
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert network people"
  ON public.network_people
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update network people"
  ON public.network_people
  FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete network people"
  ON public.network_people
  FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_network_people_updated_at
  BEFORE UPDATE ON public.network_people
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();