-- Update debate_topics table to use new section names for Federalism vs Unitary State debate
-- Remove old constraint
ALTER TABLE debate_topics DROP CONSTRAINT IF EXISTS debate_topics_section_check;

-- Add new constraint for Federalism vs Unitary State sections
ALTER TABLE debate_topics ADD CONSTRAINT debate_topics_section_check 
CHECK (section = ANY (ARRAY[
  'pro_federalism_arguments'::text, 
  'pro_federalism_rebuttal'::text, 
  'pro_federalism_common_answers'::text, 
  'unitary_state_arguments'::text, 
  'unitary_state_rebuttal'::text, 
  'unitary_state_common_answers'::text
]));

-- Update any existing records with old section names to the new format
-- This is a safety measure in case there are any old records
UPDATE debate_topics 
SET section = 'pro_federalism_arguments' 
WHERE section IN ('zoho_arguments', 'google_arguments');

UPDATE debate_topics 
SET section = 'pro_federalism_rebuttal' 
WHERE section IN ('zoho_rebuttal_against_google', 'google_rebuttal_against_zoho');

UPDATE debate_topics 
SET section = 'pro_federalism_common_answers' 
WHERE section IN ('zoho_common_answers', 'google_common_answers');