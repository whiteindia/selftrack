-- Create foods table
CREATE TABLE public.foods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  nutrients JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can view foods"
  ON public.foods
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert foods"
  ON public.foods
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update foods"
  ON public.foods
  FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete foods"
  ON public.foods
  FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_foods_updated_at
  BEFORE UPDATE ON public.foods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data
INSERT INTO public.foods (name, category, nutrients) VALUES
  ('Apple', 'Fruit', '[{"category": "Fiber", "subtype": "Soluble"}]'),
  ('Spinach', 'Vegetable', '[{"category": "Vitamins", "subtype": "Vitamin A"}]'),
  ('Salmon', 'Fish', '[{"category": "Fats", "subtype": "Omega-3"}]');