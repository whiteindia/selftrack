-- Create recipes table
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  foods text[] DEFAULT ARRAY[]::text[],
  calories_value numeric NOT NULL DEFAULT 0,
  calories_unit text NOT NULL DEFAULT 'Per 100G',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view recipes"
  ON public.recipes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update recipes"
  ON public.recipes FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete recipes"
  ON public.recipes FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();