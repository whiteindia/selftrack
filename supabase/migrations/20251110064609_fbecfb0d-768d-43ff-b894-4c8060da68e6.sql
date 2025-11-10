-- Create sports_skills table
CREATE TABLE IF NOT EXISTS sports_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_category TEXT NOT NULL,
  specific_skill TEXT NOT NULL,
  description TEXT NOT NULL,
  practice_frequency TEXT NOT NULL,
  start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE sports_skills ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view sports skills"
  ON sports_skills FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert sports skills"
  ON sports_skills FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sports skills"
  ON sports_skills FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete sports skills"
  ON sports_skills FOR DELETE
  USING (true);

-- Insert sports skills data
INSERT INTO sports_skills (skill_category, specific_skill, description, practice_frequency, start_date) VALUES
('Cricket', 'Batting Technique', 'Improving timing, stance, and shot selection', '4x / week', '2025-11-05'),
('Cricket', 'Bowling Accuracy', 'Enhancing consistency and line-length control', '3x / week', '2025-11-06'),
('Cricket', 'Fielding & Reflexes', 'Developing quick catches and ground fielding', '3x / week', '2025-11-07'),
('Football', 'Passing Accuracy', 'Short and long passes with precision', '4x / week', '2025-11-04'),
('Football', 'Dribbling Control', 'Ball handling and foot coordination', '5x / week', '2025-11-03'),
('Football', 'Stamina & Endurance', 'Improving cardiovascular strength', 'Daily', '2025-11-02'),
('Athletics', 'Sprinting Speed', 'Enhancing explosive start and stride length', '3x / week', '2025-11-01'),
('Athletics', 'Long Distance Running', 'Building endurance and pacing control', '4x / week', '2025-10-30'),
('Swimming', 'Freestyle Technique', 'Streamlining strokes and breathing rhythm', '4x / week', '2025-11-05'),
('Swimming', 'Butterfly Stroke', 'Power and coordination improvement', '3x / week', '2025-11-06'),
('Badminton', 'Smash Power', 'Increasing shoulder strength and accuracy', '3x / week', '2025-11-04'),
('Badminton', 'Footwork', 'Agile movement and positioning on court', '4x / week', '2025-11-03'),
('Fitness', 'Strength Training', 'Core, arms, and leg muscle conditioning', '5x / week', '2025-11-02'),
('Fitness', 'Flexibility', 'Stretching and mobility exercises', 'Daily', '2025-11-06'),
('Teamwork', 'Communication & Coordination', 'Synchronizing with teammates for strategy', 'Weekly', '2025-11-05');