-- Create junction tables for CodiNotes and TradaNotes

-- 1. Create codi_note_tags table
CREATE TABLE IF NOT EXISTS public.codi_note_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codi_note_id UUID NOT NULL REFERENCES public.codi_notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.codi_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(codi_note_id, tag_id)
);

-- 2. Create trada_note_tags table
CREATE TABLE IF NOT EXISTS public.trada_note_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trada_note_id UUID NOT NULL REFERENCES public.trada_notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.trada_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trada_note_id, tag_id)
);

-- 3. Enable RLS on junction tables
ALTER TABLE public.codi_note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trada_note_tags ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for codi_note_tags
CREATE POLICY "Users can view codi note tag relationships" 
ON public.codi_note_tags 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM codi_notes cn 
  WHERE cn.id = codi_note_tags.codi_note_id 
  AND cn.user_id = auth.uid()
));

CREATE POLICY "Users can create codi note tag relationships" 
ON public.codi_note_tags 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM codi_notes cn 
  WHERE cn.id = codi_note_tags.codi_note_id 
  AND cn.user_id = auth.uid()
));

CREATE POLICY "Users can delete codi note tag relationships" 
ON public.codi_note_tags 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM codi_notes cn 
  WHERE cn.id = codi_note_tags.codi_note_id 
  AND cn.user_id = auth.uid()
));

-- 5. RLS policies for trada_note_tags
CREATE POLICY "Users can view trada note tag relationships" 
ON public.trada_note_tags 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM trada_notes tn 
  WHERE tn.id = trada_note_tags.trada_note_id 
  AND tn.user_id = auth.uid()
));

CREATE POLICY "Users can create trada note tag relationships" 
ON public.trada_note_tags 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM trada_notes tn 
  WHERE tn.id = trada_note_tags.trada_note_id 
  AND tn.user_id = auth.uid()
));

CREATE POLICY "Users can delete trada note tag relationships" 
ON public.trada_note_tags 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM trada_notes tn 
  WHERE tn.id = trada_note_tags.trada_note_id 
  AND tn.user_id = auth.uid()
)); 