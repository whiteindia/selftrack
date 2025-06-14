
-- Create a dedicated table for storing custom wage amounts for fixed project tasks
CREATE TABLE public.task_wage_amounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT task_wage_amounts_task_user_unique UNIQUE(task_id, user_id)
);

-- Add Row Level Security
ALTER TABLE public.task_wage_amounts ENABLE ROW LEVEL SECURITY;

-- Create policies for task_wage_amounts
CREATE POLICY "Users can view task wage amounts" 
  ON public.task_wage_amounts 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert task wage amounts" 
  ON public.task_wage_amounts 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update task wage amounts" 
  ON public.task_wage_amounts 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete task wage amounts" 
  ON public.task_wage_amounts 
  FOR DELETE 
  USING (user_id = auth.uid());
