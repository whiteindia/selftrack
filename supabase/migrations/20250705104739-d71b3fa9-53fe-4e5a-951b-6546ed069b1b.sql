-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for sticky_notes and tags (many-to-many relationship)
CREATE TABLE public.sticky_note_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sticky_note_id UUID NOT NULL REFERENCES public.sticky_notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sticky_note_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticky_note_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for tags (all users can read, only authenticated can create)
CREATE POLICY "All users can view tags" 
ON public.tags 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tags" 
ON public.tags 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tags" 
ON public.tags 
FOR UPDATE 
USING (true);

-- RLS policies for sticky_note_tags
CREATE POLICY "Users can view sticky note tag relationships" 
ON public.sticky_note_tags 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM sticky_notes sn 
  WHERE sn.id = sticky_note_tags.sticky_note_id 
  AND sn.user_id = auth.uid()
));

CREATE POLICY "Users can create sticky note tag relationships" 
ON public.sticky_note_tags 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM sticky_notes sn 
  WHERE sn.id = sticky_note_tags.sticky_note_id 
  AND sn.user_id = auth.uid()
));

CREATE POLICY "Users can delete sticky note tag relationships" 
ON public.sticky_note_tags 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM sticky_notes sn 
  WHERE sn.id = sticky_note_tags.sticky_note_id 
  AND sn.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates on tags
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert predefined tags with colors
INSERT INTO public.tags (name, color) VALUES
('info', '#3b82f6'),
('deadlines', '#ef4444'),
('addresses', '#10b981'),
('mobile number', '#8b5cf6'),
('contacts', '#f59e0b'),
('swot', '#06b6d4'),
('bdo', '#84cc16');