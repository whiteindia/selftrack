-- Drop existing diseases table and create new structure
DROP TABLE IF EXISTS public.diseases CASCADE;

-- Create diseases table with new structure
CREATE TABLE public.diseases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_name text NOT NULL,
  reasons text[] DEFAULT ARRAY[]::text[],
  symptoms text[] DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create treatments table
CREATE TABLE public.treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_name text NOT NULL,
  treatments text[] DEFAULT ARRAY[]::text[],
  medications text[] DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for diseases
CREATE POLICY "Authenticated users can view diseases"
  ON public.diseases FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert diseases"
  ON public.diseases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update diseases"
  ON public.diseases FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete diseases"
  ON public.diseases FOR DELETE
  USING (true);

-- Create RLS policies for treatments
CREATE POLICY "Authenticated users can view treatments"
  ON public.treatments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert treatments"
  ON public.treatments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update treatments"
  ON public.treatments FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete treatments"
  ON public.treatments FOR DELETE
  USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_diseases_updated_at
  BEFORE UPDATE ON public.diseases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at
  BEFORE UPDATE ON public.treatments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();