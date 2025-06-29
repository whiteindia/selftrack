
-- Create a table for time until events
CREATE TABLE public.time_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  project_id UUID REFERENCES public.projects,
  client_id UUID REFERENCES public.clients,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to ensure users can only see their own events
ALTER TABLE public.time_events ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own events
CREATE POLICY "Users can view their own time events" 
  ON public.time_events 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own events
CREATE POLICY "Users can create their own time events" 
  ON public.time_events 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own events
CREATE POLICY "Users can update their own time events" 
  ON public.time_events 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to DELETE their own events
CREATE POLICY "Users can delete their own time events" 
  ON public.time_events 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_time_events_updated_at
  BEFORE UPDATE ON public.time_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
