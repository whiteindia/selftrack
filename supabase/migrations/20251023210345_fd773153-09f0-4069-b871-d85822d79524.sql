-- Create diseases table
CREATE TABLE public.diseases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_name TEXT NOT NULL,
  nutrients JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Trigger for updated_at
CREATE TRIGGER update_diseases_updated_at
  BEFORE UPDATE ON public.diseases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();