-- Create work_profiles table for storing calorie requirements
CREATE TABLE public.work_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_name TEXT NOT NULL,
  calories_required NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create default_menu table for storing meal plans
CREATE TABLE public.default_menu (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.work_profiles(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snacks')),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, profile_id, meal_type, recipe_id)
);

-- Enable RLS
ALTER TABLE public.work_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_menu ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_profiles
CREATE POLICY "Authenticated users can view work profiles"
  ON public.work_profiles FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert work profiles"
  ON public.work_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update work profiles"
  ON public.work_profiles FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete work profiles"
  ON public.work_profiles FOR DELETE
  USING (true);

-- RLS Policies for default_menu
CREATE POLICY "Authenticated users can view default menu"
  ON public.default_menu FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert default menu"
  ON public.default_menu FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update default menu"
  ON public.default_menu FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete default menu"
  ON public.default_menu FOR DELETE
  USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_work_profiles_updated_at
  BEFORE UPDATE ON public.work_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_default_menu_updated_at
  BEFORE UPDATE ON public.default_menu
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default work profiles
INSERT INTO public.work_profiles (profile_name, calories_required) VALUES
  ('Software Engineer', 2000),
  ('Kid', 1500),
  ('Medium Workout', 2500),
  ('Runner', 2800),
  ('Athlete', 3000),
  ('Senior', 1800);