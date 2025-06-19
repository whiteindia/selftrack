
-- Create subtasks table
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Not Started',
  hours NUMERIC DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  deadline DATE,
  estimated_duration NUMERIC,
  completion_date TIMESTAMP WITH TIME ZONE,
  assignee_id UUID REFERENCES public.employees(id),
  assigner_id UUID REFERENCES public.employees(id),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subtasks (similar to tasks)
CREATE POLICY "Users can view subtasks they are assigned to or created" 
  ON public.subtasks 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE id = assignee_id AND email = auth.jwt() ->> 'email'
    ) OR
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE id = assigner_id AND email = auth.jwt() ->> 'email'
    ) OR
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

CREATE POLICY "Users can create subtasks" 
  ON public.subtasks 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Users can update subtasks they are assigned to or created" 
  ON public.subtasks 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE id = assignee_id AND email = auth.jwt() ->> 'email'
    ) OR
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE id = assigner_id AND email = auth.jwt() ->> 'email'
    ) OR
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete subtasks they are assigned to or created" 
  ON public.subtasks 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE id = assignee_id AND email = auth.jwt() ->> 'email'
    ) OR
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE id = assigner_id AND email = auth.jwt() ->> 'email'
    ) OR
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subtasks_updated_at 
  BEFORE UPDATE ON public.subtasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
