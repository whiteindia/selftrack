-- Remove previous Pragnay debate points migration
-- This migration removes all debate points added for Pragnay in the previous migration

DELETE FROM debate_topics 
WHERE person = 'Pragnay' 
AND section IN (
  'pro_federalism_arguments',
  'pro_federalism_rebuttal', 
  'pro_federalism_common_answers',
  'unitary_state_arguments',
  'unitary_state_rebuttal',
  'unitary_state_common_answers'
);