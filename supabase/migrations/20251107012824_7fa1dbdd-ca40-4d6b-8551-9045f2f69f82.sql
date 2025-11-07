-- Create theatrical_arts_skills table
CREATE TABLE public.theatrical_arts_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_category TEXT NOT NULL,
  specific_skill TEXT NOT NULL,
  description TEXT NOT NULL,
  practice_frequency TEXT NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.theatrical_arts_skills ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view theatrical arts skills"
  ON public.theatrical_arts_skills
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert theatrical arts skills"
  ON public.theatrical_arts_skills
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update theatrical arts skills"
  ON public.theatrical_arts_skills
  FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete theatrical arts skills"
  ON public.theatrical_arts_skills
  FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_theatrical_arts_skills_updated_at
  BEFORE UPDATE ON public.theatrical_arts_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();