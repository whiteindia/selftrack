
-- Create routines table
CREATE TABLE public.routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  project_id UUID REFERENCES public.projects(id) NOT NULL,
  title TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly_once', 'weekly_twice', 'monthly_once', 'monthly_twice', 'yearly_once')),
  preferred_days JSONB, -- For storing selected days like ["sunday", "wednesday"]
  start_date DATE DEFAULT CURRENT_DATE,
  category TEXT DEFAULT 'general', -- housekeeping, bodycare, cooking, etc.
  color TEXT DEFAULT 'blue', -- for color coding
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create routine completions table to track when routines are marked as done
CREATE TABLE public.routine_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
  completion_date DATE NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(routine_id, completion_date)
);

-- Enable RLS
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

-- Create policies for routines (admin access)
CREATE POLICY "Admins can manage routines" 
  ON public.routines 
  FOR ALL 
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Create policies for routine completions (admin access)
CREATE POLICY "Admins can manage routine completions" 
  ON public.routine_completions 
  FOR ALL 
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Add trigger for updated_at
CREATE TRIGGER update_routines_updated_at 
  BEFORE UPDATE ON public.routines 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
