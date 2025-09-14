-- Create timetable table for storing project assignments to time slots
CREATE TABLE public.timetable_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ... 6=Saturday
  shift_number INTEGER NOT NULL, -- 1-6 for the 6 shifts per day
  project_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one assignment per cell per user per week
  UNIQUE(user_id, week_start_date, day_of_week, shift_number),
  
  -- Constraints
  CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CHECK (shift_number >= 1 AND shift_number <= 6)
);

-- Enable RLS
ALTER TABLE public.timetable_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own timetable assignments"
ON public.timetable_assignments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own timetable assignments"
ON public.timetable_assignments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timetable assignments"
ON public.timetable_assignments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timetable assignments"
ON public.timetable_assignments
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all timetable assignments
CREATE POLICY "Admins can view all timetable assignments"
ON public.timetable_assignments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create trigger for updated_at
CREATE TRIGGER update_timetable_assignments_updated_at
BEFORE UPDATE ON public.timetable_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();