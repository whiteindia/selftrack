-- Create nutrients table
CREATE TABLE IF NOT EXISTS public.nutrients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subtypes TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.nutrients ENABLE ROW LEVEL SECURITY;

-- Create policies for nutrients table
CREATE POLICY "Authenticated users can view nutrients"
  ON public.nutrients
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert nutrients"
  ON public.nutrients
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update nutrients"
  ON public.nutrients
  FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete nutrients"
  ON public.nutrients
  FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_nutrients_updated_at
  BEFORE UPDATE ON public.nutrients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default nutrient categories
INSERT INTO public.nutrients (category, subtypes) VALUES
  ('Carbohydrates', ARRAY['Simple (sugars)', 'Complex (starch, fiber)']),
  ('Proteins', ARRAY['Complete (animal)', 'Incomplete (plant)']),
  ('Fats', ARRAY['Saturated', 'Unsaturated (mono, poly)', 'Trans']),
  ('Fiber', ARRAY['Soluble', 'Insoluble']),
  ('Water', ARRAY['-']),
  ('Vitamins', ARRAY['Fat-soluble (A, D, E, K)', 'Water-soluble (B, C)']),
  ('Minerals', ARRAY['Macro (Ca, Mg, K, Na, P)', 'Trace (Fe, Zn, Cu)']),
  ('Electrolytes', ARRAY['Sodium', 'Potassium', 'Chloride', 'Bicarbonate']),
  ('Phytonutrients', ARRAY['Flavonoids', 'Carotenoids', 'Polyphenols']),
  ('Others', ARRAY['Probiotics & Prebiotics']);