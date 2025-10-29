-- Add new columns to work_profiles table
ALTER TABLE public.work_profiles
ADD COLUMN IF NOT EXISTS person_name TEXT,
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'Standard',
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS bmi NUMERIC;

-- Add unique constraint on profile_name if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_profiles_profile_name_key'
  ) THEN
    ALTER TABLE public.work_profiles ADD CONSTRAINT work_profiles_profile_name_key UNIQUE (profile_name);
  END IF;
END $$;

-- Insert sample profile data
INSERT INTO public.work_profiles (profile_name, person_name, profile_type, calories_required, age, weight, bmi)
VALUES 
  ('Active Professional', 'John Smith', 'Active', 2500, 32, 75, 23.5),
  ('Sedentary Office Worker', 'Sarah Johnson', 'Sedentary', 1800, 28, 62, 21.8),
  ('Athlete', 'Mike Anderson', 'Athletic', 3200, 25, 82, 24.2),
  ('Light Activity', 'Emma Davis', 'Light', 2000, 35, 58, 20.5),
  ('Moderate Activity', 'David Wilson', 'Moderate', 2300, 40, 78, 24.8)
ON CONFLICT (profile_name) DO UPDATE SET
  person_name = EXCLUDED.person_name,
  profile_type = EXCLUDED.profile_type,
  calories_required = EXCLUDED.calories_required,
  age = EXCLUDED.age,
  weight = EXCLUDED.weight,
  bmi = EXCLUDED.bmi;