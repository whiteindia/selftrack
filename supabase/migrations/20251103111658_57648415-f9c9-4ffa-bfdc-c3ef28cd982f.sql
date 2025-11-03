-- Create kids_activities table
CREATE TABLE public.kids_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  activity_name text NOT NULL,
  description text NOT NULL,
  frequency text NOT NULL,
  duration text NOT NULL,
  tools_needed text NOT NULL,
  goal text NOT NULL,
  progress_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.kids_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view kids activities"
  ON public.kids_activities
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert kids activities"
  ON public.kids_activities
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update kids activities"
  ON public.kids_activities
  FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete kids activities"
  ON public.kids_activities
  FOR DELETE
  USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_kids_activities_updated_at
  BEFORE UPDATE ON public.kids_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data
INSERT INTO public.kids_activities (category, activity_name, description, frequency, duration, tools_needed, goal, progress_notes) VALUES
('IQ / Brain Development', 'Flashcards / Picture Cards', 'Show basic objects, animals, shapes & ask names', 'Daily', '10 mins', 'Flashcards / mobile app', 'Improve vocabulary & memory', ''),
('IQ / Brain Development', 'Puzzle Solving', 'Age-appropriate puzzles (3–200 pieces)', '3–4 times/week', '20 mins', 'Puzzle sets', 'Enhances logical reasoning & focus', ''),
('IQ / Brain Development', 'Story Reading & Retelling', 'Read story → ask child to explain', 'Daily', '15 mins', 'Story books', 'Builds comprehension & speaking skills', ''),
('IQ / Brain Development', 'Math Games', 'Count apples, toys, etc. in real life', 'Daily', '10 mins', 'Household items', 'Builds number sense and IQ', ''),
('Emotional & Moral Values', 'Gratitude Talks', 'Ask: "What made you happy today?"', 'Daily', '5 mins', 'None', 'Builds positivity & awareness', ''),
('Emotional & Moral Values', 'Helping at Home', 'Assign tiny tasks (fold napkin, bring water)', 'Daily', '5–10 mins', 'Household', 'Responsibility & discipline', ''),
('Emotional & Moral Values', 'Sharing Games', 'Play with other kids & practice sharing', 'Weekly', '20 mins', 'Toys', 'Improves social bonding & empathy', ''),
('Emotional & Moral Values', 'Prayer / Silence Time', 'Sit silent / positive affirmations', 'Daily', '2–5 mins', 'Calm music optional', 'Emotional regulation', ''),
('Sports & Physical Activities', 'Running / Skipping', 'Open space running/sprint', 'Daily', '15 mins', 'Ground, skipping rope', 'Stamina & coordination', ''),
('Sports & Physical Activities', 'Ball Games', 'Throw, catch, kick, dribble', 'Daily', '10 mins', 'Soft ball', 'Hand-eye coordination', ''),
('Sports & Physical Activities', 'Swimming / Cycling', 'Outdoor skill activity', '2–3 times/week', '30 mins', 'Cycle/pool', 'Confidence + body strength', ''),
('Sports & Physical Activities', 'Yoga for Kids', 'Fun poses (cat, tree, butterfly)', 'Daily', '5–10 mins', 'Mat', 'Flexibility & calm mind', ''),
('Creativity & Skills', 'Drawing & Coloring', 'Free drawing + object drawing', '3–4 times/week', '20 mins', 'Colors & sheets', 'Improves attention & imagination', ''),
('Creativity & Skills', 'Music / Dance Time', 'Play songs & dance together', 'Daily', '10 mins', 'Music system', 'Happiness + rhythm coordination', ''),
('Creativity & Skills', 'Lego / Block Building', 'Build towers, animals, houses', 'Weekly', '30 mins', 'Lego blocks', 'Enhances problem solving & engineering thinking', ''),
('Communication & Social Skills', 'Talk Time (Parent-Child)', 'Ask open questions & listen', 'Daily', '10 mins', 'None', 'Builds trust & emotional secure bonding', ''),
('Communication & Social Skills', 'Play Dates', 'Interaction with kids same age', 'Weekly', '1 hour', 'Park / home', 'Teamwork & sharing skills', ''),
('Communication & Social Skills', 'Public Speaking Fun', 'Recite poem / story in front of family', 'Weekly', '10 mins', 'None', 'Confidence & stage habit', ''),
('Healthy Habits', 'Eating Fruits', 'Introduce one fruit per day', 'Daily', 'Routine time', 'Fruits', 'Nutrition awareness', ''),
('Healthy Habits', 'Water Drinking Tracker', 'Remind to drink water often', 'Daily', 'Whole day', 'Bottle', 'Health & hydration', ''),
('Healthy Habits', 'Sleep Routine', 'Fix bedtime & no screens before sleeping', 'Daily', 'Night', 'Calm environment', 'Improves behavior & memory', '');