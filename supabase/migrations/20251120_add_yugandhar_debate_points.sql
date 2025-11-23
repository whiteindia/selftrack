-- Add Yugandhar's debate points on Pro-Federalism and Pro-Unitary arguments
-- Organized by main headings with specific examples and debate usage

-- 🟩 PRO-FEDERALISM: Arguments for Decentralization - Local development examples
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Centre often ignores local needs**: Andhra Pradesh''s Special Category Status was promised orally during bifurcation but never granted. Centre avoided giving it fearing other states would demand the same (domino effect). Shows that central decisions may not prioritise individual state needs.', 'Yugandhar', ARRAY['andhra pradesh', 'special category status', 'local needs', 'bifurcation'], 'pro_federalism_arguments', 13),

('**States can drive faster local development**: Telangana and Andhra Pradesh developed rapidly because they controlled their own resources and planning. Hyderabad expanded massively from ORR to RRR because local leadership pushed it.', 'Yugandhar', ARRAY['telangana development', 'andhra pradesh', 'local planning', 'hyderabad growth'], 'pro_federalism_arguments', 14),

('**Vizag becoming major tech hub**: Vizag is becoming a major tech hub due to state-level initiatives, not central schemes. Proves that local governments understand regional economic potential better.', 'Yugandhar', ARRAY['vizag tech hub', 'state initiatives', 'regional economy', 'local knowledge'], 'pro_federalism_arguments', 15);

-- 🟥 UNITARY STATE: Arguments for Strong Central Authority - National unity examples
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**National unity concerns – Manipur & Kashmir**: Ethnic tensions and separatist movements require strong central intervention. Only the Union government can deploy forces, maintain order, and prevent further division. A fragmented federal response could worsen such conflicts.', 'Yugandhar', ARRAY['manipur', 'kashmir', 'national unity', 'separatist movements', 'central intervention'], 'unitary_state_arguments', 7),

('**Assam–Bodo Conflict – risk of ethnic fragmentation**: In the 1980s, large-scale violence occurred between Assamese groups and Bodos. Weak coordination and fragmented state responses allowed separatist groups to grow. Led to creation of Bodoland Autonomous Territory — shows decentralization can sometimes fuel identity-based breakup.', 'Yugandhar', ARRAY['assam bodo conflict', 'ethnic fragmentation', 'bodoland', 'identity politics', 'separatism'], 'unitary_state_arguments', 8);

-- ⭐ DEBATE USAGE - How to Use These Arguments (Short Lines for quick rebuttals)
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Federalism side quick line**: "When the Centre ignores AP''s special status, it proves that states understand their own needs better."', 'Yugandhar', ARRAY['debate usage', 'quick rebuttal', 'ap special status', 'state needs'], 'pro_federalism_common_answers', 16),

('**Federalism side quick line**: "Local development in Telangana and AP shows decentralization leads to faster growth."', 'Yugandhar', ARRAY['debate usage', 'quick rebuttal', 'telangana development', 'decentralization'], 'pro_federalism_common_answers', 17),

('**Unitary state side quick line**: "Look at Manipur and Kashmir — without a strong Centre, peace and security would collapse."', 'Yugandhar', ARRAY['debate usage', 'quick rebuttal', 'manipur kashmir', 'security collapse'], 'unitary_state_common_answers', 6),

('**Unitary state side quick line**: "The Bodo conflict shows how too much local identity politics can lead to fragmentation; a strong Centre holds the nation together."', 'Yugandhar', ARRAY['debate usage', 'quick rebuttal', 'bodo conflict', 'identity politics', 'national unity'], 'unitary_state_common_answers', 7);