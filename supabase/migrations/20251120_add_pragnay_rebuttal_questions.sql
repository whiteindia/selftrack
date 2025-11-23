-- Add rebuttal questions for Pragnay in the debate sections
-- These are questions that can be used during the debate for cross-examination and rebuttals

-- ✅ TOP 4 REBUTTAL QUESTIONS (UNITARY SIDE → FEDERAL SIDE) - These go in Unitary State Common Answers section
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Question 1**: If India is truly federal, why can Parliament change state boundaries without their consent (Article 3)?

**Answer**: Article 3 protects national unity, but it doesn''t eliminate federalism. States are still consulted, and judicial review prevents arbitrary actions. Division of legislative, executive, and financial powers still remains fully intact — proving federalism continues despite this special provision.', 'Pragnay', ARRAY['article 3', 'state boundaries', 'national unity', 'judicial review'], 'unitary_state_common_answers', 1),

('**Question 2**: If India is federal, why do residuary powers belong to the Centre, unlike in classical federations?

**Answer**: Residuary powers were assigned to the Union to maintain national uniformity on emerging subjects like digital law, AI, and cybercrime. This does not touch State List subjects; states retain full autonomy in their core areas. It is a "federal design with national coordination," not unitarism.', 'Pragnay', ARRAY['residuary powers', 'national uniformity', 'digital law', 'state autonomy'], 'unitary_state_common_answers', 2),

('**Question 3**: Isn''t Article 356 proof that India is more unitary since the Centre can dismiss state governments?

**Answer**: Not after S.R. Bommai. The Supreme Court has restricted Article 356 to genuine constitutional breakdowns. Misuse can be struck down — meaning federalism is protected judicially even though the power exists constitutionally.', 'Pragnay', ARRAY['article 356', 'sr bommai', 'constitutional breakdown', 'judicial protection'], 'unitary_state_common_answers', 3),

('**Question 4**: How can India be federal when the Governor acts as an agent of the Centre?

**Answer**: Governor''s discretionary powers are limited and reviewable by courts. States run day-to-day administration; Governor mainly ensures constitutional compliance. The institution balances federal structure, not undermines it.', 'Pragnay', ARRAY['governor', 'centre agent', 'constitutional compliance', 'federal balance'], 'unitary_state_common_answers', 4);

-- ✅ TOP 4 REBUTTAL QUESTIONS (FEDERAL SIDE → UNITARY SIDE) - These go in Pro-Federalism Common Answers section
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Question 1**: If India is unitary, why does the Constitution provide a detailed Union–State List system?

**Answer**: Only federal Constitutions have such a division. The very existence of separate lists for Union, State, and Concurrent subjects confirms a federal framework.', 'Pragnay', ARRAY['union state list', 'federal division', 'constitutional structure'], 'pro_federalism_common_answers', 12),

('**Question 2**: If India is unitary, why is federalism part of the Basic Structure of the Constitution?

**Answer**: Because India cannot stop being federal — even Parliament cannot amend it away. A unitary Constitution can be altered fully; a federal one cannot be fundamentally changed.', 'Pragnay', ARRAY['basic structure', 'federalism immutable', 'parliament limitations'], 'pro_federalism_common_answers', 13),

('**Question 3**: Why does India have an independent judiciary that reviews Centre–State disputes?

**Answer**: Unitary systems do not need courts to balance two levels of government. Judicial review proves autonomous spheres exist.', 'Pragnay', ARRAY['independent judiciary', 'centre state disputes', 'judicial review', 'autonomous spheres'], 'pro_federalism_common_answers', 14),

('**Question 4**: If India is unitary, why must certain constitutional amendments be approved by states (Article 368)?

**Answer**: Because the Constitution protects state autonomy. Amendments affecting federal matters cannot pass without state ratification — a core federal feature.', 'Pragnay', ARRAY['article 368', 'state ratification', 'federal amendments', 'state autonomy'], 'pro_federalism_common_answers', 15);