-- Create club_care table for managing relationships and connections
CREATE TABLE IF NOT EXISTS public.club_care (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relation_type text NOT NULL,
  person_contact text NOT NULL,
  description text NOT NULL,
  frequency text NOT NULL,
  start_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.club_care ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view club care"
  ON public.club_care FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert club care"
  ON public.club_care FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update club care"
  ON public.club_care FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete club care"
  ON public.club_care FOR DELETE
  USING (true);

-- Insert initial data
INSERT INTO public.club_care (relation_type, person_contact, description, frequency, start_date) VALUES
('Help', 'Ramesh', 'Provides technical help with AppSheet & automation', 'As needed', '2025-11-05'),
('Support', 'Meena', 'Emotional and motivational support', 'Weekly', '2025-11-06'),
('Job / Career', 'Arjun', 'Works at IT firm, helps with job referrals and insights', 'Monthly', '2025-11-03'),
('Education', 'Priya', 'Mentor from PG course guiding in academic projects', 'Weekly', '2025-11-04'),
('Financial', 'Suresh', 'Advisor for personal finance and investments', 'Quarterly', '2025-11-01'),
('Business', 'Kiran', 'Partner in Trade in India training operations', 'Daily', '2025-11-02'),
('Collaboration', 'Nikhil', 'Works on React Native & Firebase projects with you', '3x / week', '2025-11-05'),
('Mentorship', 'Divya', 'Provides professional growth mentoring', 'Monthly', '2025-10-28'),
('Learning', 'Rahul', 'Peer learning partner for PMP and management topics', 'Weekly', '2025-11-03'),
('Client', 'Whiteindia Client - Alpha Corp', 'Software service client (medium enterprise)', 'Bi-weekly', '2025-11-01'),
('Family', 'Navik', 'Family bonding and support time', 'Daily', '2025-11-06'),
('Friends', 'Akash', 'Long-term friend and social connection', 'Weekly', '2025-11-05'),
('Social Media', 'LinkedIn Network', 'Job and business connections online', 'Weekly', '2025-11-02'),
('Alumni', 'College Group', 'Networking for new opportunities and learning', 'Monthly', '2025-11-04'),
('Community', 'Tech Meetup Group', 'Local events and collaboration opportunities', 'Monthly', '2025-11-03');