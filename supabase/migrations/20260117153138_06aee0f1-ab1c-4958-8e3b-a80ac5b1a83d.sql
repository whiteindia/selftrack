-- Create a unified table for user pins
CREATE TABLE public.user_pins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'task', 'active_task')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own pins" 
ON public.user_pins 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pins" 
ON public.user_pins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pins" 
ON public.user_pins 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_pins_user_entity ON public.user_pins(user_id, entity_type);