-- Create social_activities table
CREATE TABLE public.social_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  activity_practice TEXT NOT NULL,
  purpose_goal TEXT NOT NULL,
  frequency TEXT NOT NULL,
  how_to_do TEXT NOT NULL,
  expected_impact TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view social activities"
ON public.social_activities FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert social activities"
ON public.social_activities FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update social activities"
ON public.social_activities FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete social activities"
ON public.social_activities FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_social_activities_updated_at
BEFORE UPDATE ON public.social_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data
INSERT INTO public.social_activities (category, activity_practice, purpose_goal, frequency, how_to_do, expected_impact) VALUES
('Communication', 'Call or video chat with close relatives', 'Strengthen bonds & show care', 'Weekly', 'Pick a day/time; talk genuinely about their life & well-being', 'Builds trust, warmth, emotional closeness'),
('Communication', 'Join family WhatsApp groups actively', 'Stay connected & updated', 'Ongoing', 'Share positive news, avoid arguments', 'Keeps relationships active'),
('Communication', 'Write a gratitude message or note', 'Express appreciation', 'Monthly', 'Send handwritten or digital thank-you note', 'Increases positive emotional connection'),
('Family Engagement', 'Attend family gatherings/functions', 'Maintain visible presence', 'Whenever held', 'Attend willingly, help in organizing', 'Enhances belonging & visibility'),
('Family Engagement', 'Plan small family meet-ups / dinners', 'Create joyful experiences', 'Monthly', 'Invite cousins or elders for dinner or picnic', 'Strengthens mutual bonding'),
('Family Engagement', 'Celebrate birthdays & anniversaries', 'Show remembrance', 'On occasion', 'Send wishes or small gifts', 'Makes relatives feel valued'),
('Emotional Intelligence', 'Practice active listening', 'Understand others'' feelings', 'Daily', 'Avoid interrupting, reflect before replying', 'Builds respect & understanding'),
('Emotional Intelligence', 'Avoid gossip or negative talk', 'Preserve respect & peace', 'Always', 'Redirect to positive topics', 'Reduces conflicts, builds maturity'),
('Emotional Intelligence', 'Apologize and forgive quickly', 'Maintain peace', 'When needed', 'Don''t hold grudges; talk openly', 'Builds long-term trust'),
('Cultural & Traditional Involvement', 'Participate in festivals and rituals', 'Stay connected to roots', 'Yearly / Seasonal', 'Help in arrangements, respect traditions', 'Builds collective identity'),
('Cultural & Traditional Involvement', 'Learn and share family history', 'Strengthen heritage bonds', 'Occasionally', 'Talk to elders; record stories', 'Creates continuity across generations'),
('Cultural & Traditional Involvement', 'Encourage kids/younger ones in traditions', 'Pass on values', 'Often', 'Include them in pujas, games, stories', 'Builds respect and continuity'),
('Support & Service', 'Help relatives during difficult times', 'Develop empathy', 'As needed', 'Offer help (time, emotional, or financial)', 'Builds deep trust & gratitude'),
('Support & Service', 'Volunteer together in community work', 'Build shared purpose', 'Quarterly', 'Family tree plantation, charity, etc.', 'Builds unity and respect'),
('Personal Development', 'Read about interpersonal skills', 'Improve social behavior', 'Weekly', 'Read or listen to relationship podcasts', 'Enhances maturity & empathy'),
('Personal Development', 'Attend social / cultural events', 'Meet diverse people', 'Monthly', 'Attend talks, clubs, or gatherings', 'Expands comfort zone'),
('Personal Development', 'Manage anger & ego', 'Stay calm in relations', 'Always', 'Practice meditation / journaling', 'Improves emotional balance'),
('Digital Presence', 'Share family memories online', 'Maintain bonds virtually', 'Occasionally', 'Share photos with positivity', 'Keeps long-distance relatives engaged'),
('Digital Presence', 'Avoid oversharing or comparing', 'Preserve privacy', 'Always', 'Keep posts respectful & balanced', 'Avoids jealousy or tension'),
('Children & Elder Bonding', 'Spend quality time with elders', 'Learn values & gain blessings', 'Weekly', 'Listen to their stories, seek advice', 'Builds mutual affection'),
('Children & Elder Bonding', 'Play / mentor younger cousins or kids', 'Be a positive role model', 'Weekly', 'Teach skills, play games', 'Builds affection & leadership'),
('Conflict Management', 'Address misunderstandings early', 'Prevent cold distances', 'As needed', 'Communicate calmly and timely', 'Restores respect quickly'),
('Conflict Management', 'Mediate between relatives if neutral', 'Promote peace', 'Occasionally', 'Stay fair, avoid sides', 'Builds reputation as a balanced person'),
('Self Reflection', 'Maintain relationship diary', 'Track social growth', 'Monthly', 'Note positive/negative interactions', 'Helps self-correction & awareness'),
('Self Reflection', 'Reflect on behavior after family meets', 'Improve communication', 'After events', 'Ask: "Did I make others comfortable?"', 'Boosts self-awareness');