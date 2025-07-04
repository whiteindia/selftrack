-- Create sticky notes table
CREATE TABLE public.sticky_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for sticky notes
CREATE POLICY "Users can view their own sticky notes" 
ON public.sticky_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sticky notes" 
ON public.sticky_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sticky notes" 
ON public.sticky_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sticky notes" 
ON public.sticky_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can view all sticky notes
CREATE POLICY "Admins can view all sticky notes" 
ON public.sticky_notes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sticky_notes_updated_at
BEFORE UPDATE ON public.sticky_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();