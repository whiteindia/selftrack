-- Create custom_menu table for date-specific meal planning (separate from default_menu)
CREATE TABLE IF NOT EXISTS public.custom_menu (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  date date NOT NULL,
  meal_type text NOT NULL,
  recipe_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_menu ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view custom menu"
  ON public.custom_menu FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert custom menu"
  ON public.custom_menu FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update custom menu"
  ON public.custom_menu FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete custom menu"
  ON public.custom_menu FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_custom_menu_updated_at
  BEFORE UPDATE ON public.custom_menu
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();