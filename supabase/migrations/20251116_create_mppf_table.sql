-- Create MPPF (Media & Public Focus) Activities table
CREATE TABLE mppf_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_category VARCHAR(100) NOT NULL,
    specific_action VARCHAR(255) NOT NULL,
    description TEXT,
    public_impact_visibility VARCHAR(50),
    start_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE mppf_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your auth setup)
CREATE POLICY "Allow public read access" ON mppf_activities
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON mppf_activities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own activities" ON mppf_activities
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to delete their own activities" ON mppf_activities
    FOR DELETE USING (auth.role() = 'authenticated');

-- Insert sample MPPF activities data
INSERT INTO mppf_activities (activity_category, specific_action, description, public_impact_visibility, start_date) VALUES
('Social Help', 'Helping a Blind Person Cross Road', 'Assisted visually impaired person in crossing road safely', 'High (People noticed, shared on local social page)', '2025-11-05'),
('Local Support', 'Buying from Street Vendors', 'Purchased all items from small street vendors to support them', 'Medium (Word-of-mouth appreciation)', '2025-11-06'),
('Charity', 'Donated Clothes to Orphanage', 'Donated gently used clothes for 25 children', 'High (Orphanage thanked on social media)', '2025-11-07'),
('Environmental', 'Tree Plantation Drive', 'Organized 20-tree planting near local park', 'High (Covered by local newspaper)', '2025-11-04'),
('Animal Welfare', 'Feeding Stray Dogs', 'Provided food for stray dogs near residential area', 'Medium', '2025-11-03'),
('Community Welfare', 'Free Health Check Camp', 'Partnered with local doctors for public camp', 'High (Media covered, 200 people attended)', '2025-11-02'),
('Education', 'Donated Stationery Kits', 'Distributed notebooks and pens to govt. school children', 'Medium', '2025-11-05'),
('Cleanliness', 'Swachh Drive at Beach', 'Led a public cleaning initiative on weekend', 'High (Tagged in local Instagram stories)', '2025-11-01'),
('Inclusion', 'Assisting Elderly at Bank', 'Helped senior citizens fill withdrawal forms', 'Medium', '2025-11-06'),
('Fundraising', 'Supported Medical Emergency', 'Raised small funds for patient surgery', 'High (Shared by community WhatsApp group)', '2025-10-31'),
('Youth Awareness', 'Spoke at College Event', 'Motivated youth on "Leadership & Empathy"', 'High (Video got 1.5K views)', '2025-11-04'),
('Public Responsibility', 'Traffic Awareness Act', 'Directed traffic voluntarily during jam', 'Medium', '2025-11-02'),
('Festival Cause', 'Eco-Friendly Diwali', 'Distributed plant saplings instead of crackers', 'Medium', '2025-11-03'),
('Mental Health', 'Hosted Positivity Session', 'Conducted session on mindfulness for working youth', 'High (Featured in local blog)', '2025-11-06'),
('Women Empowerment', 'Promoted Local Women Entrepreneurs', 'Helped them market products online', 'High', '2025-11-05');