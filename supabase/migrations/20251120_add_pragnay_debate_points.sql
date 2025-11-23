-- Add debate points for Pragnay in Federalism vs Unitary State debate
-- These are sample points - please replace with your specific main headings and sub headings

-- PRO-FEDERALISM: Arguments for Decentralization
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Local Governance**: Federalism allows for better local governance as decisions are made closer to the people who are affected by them. Local governments understand regional needs better than distant central authorities.', 'Pragnay', ARRAY['local governance', 'regional needs'], 'pro_federalism_arguments', 1),
('**Cultural Preservation**: Decentralized systems protect cultural diversity by allowing regions to maintain their unique identities, languages, and traditions without interference from central authorities.', 'Pragnay', ARRAY['cultural diversity', 'identity'], 'pro_federalism_arguments', 2),
('**Innovation Laboratory**: States can serve as laboratories of democracy, testing new policies and programs that can later be adopted nationally if successful.', 'Pragnay', ARRAY['innovation', 'policy testing'], 'pro_federalism_arguments', 3);

-- PRO-FEDERALISM: Rebuttal Against Unitary State
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Distance from Reality**: Unitary systems often lead to one-size-fits-all policies that ignore regional variations in culture, economy, and geography. What works in urban areas may not work in rural regions.', 'Pragnay', ARRAY['policy failure', 'regional differences'], 'pro_federalism_rebuttal', 1),
('**Bureaucratic Inefficiency**: Centralized systems create layers of bureaucracy that slow down decision-making and implementation. Federal systems can respond more quickly to local emergencies and needs.', 'Pragnay', ARRAY['bureaucracy', 'efficiency'], 'pro_federalism_rebuttal', 2);

-- PRO-FEDERALISM: Common Answers for Expected Questions
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Addressing Inequality Concerns**: While critics argue federalism can increase inequality, proper revenue-sharing mechanisms and constitutional safeguards can ensure balanced development across all regions.', 'Pragnay', ARRAY['inequality', 'revenue sharing'], 'pro_federalism_common_answers', 1),
('**National Unity**: Far from dividing the nation, federalism can strengthen unity by giving regions a sense of ownership and participation in the national project.', 'Pragnay', ARRAY['national unity', 'participation'], 'pro_federalism_common_answers', 2);

-- UNITARY STATE: Arguments for Strong Central Government
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**National Cohesion**: A strong central government promotes national unity and prevents regional fragmentation. It ensures all citizens are treated equally under the same laws and policies.', 'Pragnay', ARRAY['national unity', 'equality'], 'unitary_state_arguments', 1),
('**Economic Efficiency**: Centralized decision-making allows for coordinated economic planning and resource allocation, preventing wasteful duplication of efforts across regions.', 'Pragnay', ARRAY['economic efficiency', 'coordination'], 'unitary_state_arguments', 2);

-- UNITARY STATE: Rebuttal Against Federalism
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Regional Inequality**: Federal systems can exacerbate regional inequalities as wealthier states progress faster while poorer regions lag behind, creating a two-tier system.', 'Pragnay', ARRAY['regional inequality', 'development gap'], 'unitary_state_rebuttal', 1),
('**Policy Confusion**: Multiple levels of government can create confusion about jurisdiction and responsibility, leading to buck-passing and inefficient service delivery.', 'Pragnay', ARRAY['jurisdiction confusion', 'accountability'], 'unitary_state_rebuttal', 2);

-- UNITARY STATE: Common Answers for Expected Questions
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Local Representation**: Modern unitary states can include local representation through devolved powers and local governments, combining the benefits of both systems without full federalism.', 'Pragnay', ARRAY['local representation', 'devolution'], 'unitary_state_common_answers', 1),
('**Flexibility**: Unitary systems can be more flexible in responding to national emergencies and can implement rapid policy changes when needed.', 'Pragnay', ARRAY['flexibility', 'emergency response'], 'unitary_state_common_answers', 2);