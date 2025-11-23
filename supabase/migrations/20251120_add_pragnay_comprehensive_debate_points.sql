-- Add comprehensive debate points for Pragnay on Indian Federalism vs Unitary System
-- Organized by main headings with sub-headings as detailed points

-- ✅ IN FAVOUR OF INDIA BEING A FEDERAL STATE 
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Dual Polity**: India has two constitutionally created governments—Union & State—each deriving power directly from the Constitution, not from each other. States are not administrative units of the Centre.', 'Pragnay', ARRAY['dual polity', 'constitutional power'], 'pro_federalism_arguments', 1),

('**Distribution of Powers (Union, State, Concurrent Lists)**: The Seventh Schedule divides powers clearly: Union List – national importance, State List – regional/local importance, Concurrent List – shared subjects. Protects autonomy of States in "State List" areas.', 'Pragnay', ARRAY['seventh schedule', 'power distribution', 'state autonomy'], 'pro_federalism_arguments', 2),

('**Independent Judiciary Protects Federal Balance**: Supreme Court acts as the guardian of federalism. Judicial review prevents arbitrary centralisation. Kesavananda Bharati affirmed federalism as part of the Basic Structure.', 'Pragnay', ARRAY['judiciary', 'judicial review', 'basic structure'], 'pro_federalism_arguments', 3),

('**Written and Partly Rigid Constitution**: A Supreme, written Constitution safeguards federal principles. Amendments involving states need ratification (Articles 368).', 'Pragnay', ARRAY['written constitution', 'rigid amendment', 'ratification'], 'pro_federalism_arguments', 4),

('**Bicameralism and State Representation**: Rajya Sabha gives States a voice at the national level. Participates in law-making that affects both levels.', 'Pragnay', ARRAY['rajya sabha', 'state representation', 'bicameralism'], 'pro_federalism_arguments', 5),

('**Three-Tier Federalism (73rd & 74th Amendments)**: Constitutional status to Panchayats and Municipalities. Deepens decentralisation and strengthens local autonomy.', 'Pragnay', ARRAY['three tier', 'panchayats', 'municipalities', 'local autonomy'], 'pro_federalism_arguments', 6);

-- ✅ ARGUMENTS AGAINST INDIA BEING FEDERAL (UNITARY FEATURES) - This goes in Unitary State rebuttal section
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Strong Emergency Powers (Articles 352, 356, 360)**: During emergencies, the Constitution becomes effectively unitary. Centre can dismiss State governments (Article 356). Financial Emergency takes away state financial autonomy.', 'Pragnay', ARRAY['emergency powers', 'article 356', 'financial emergency', 'unitary features'], 'unitary_state_rebuttal', 1),

('**Residuary Powers with the Union (Article 248)**: All remaining subjects belong to the Union, unlike classic federations where states get them.', 'Pragnay', ARRAY['residuary powers', 'article 248', 'union supremacy'], 'unitary_state_rebuttal', 2),

('**Union Supremacy in Concurrent List (Article 254)**: If there is a conflict between a State law and a Central law on a concurrent subject, Union law prevails.', 'Pragnay', ARRAY['concurrent list', 'article 254', 'union supremacy'], 'unitary_state_rebuttal', 3),

('**Governor as Agent of Centre**: Governor appointed by the President; holds office on "pleasure" of the Centre. Can reserve bills for President, influencing state decisions.', 'Pragnay', ARRAY['governor', 'centre agent', 'president pleasure'], 'unitary_state_rebuttal', 4),

('**Central Control Over All-India Services (IAS/IPS/IFS)**: Recruitment, posting, promotion & disciplinary control lie with Centre. Limits states'' administrative independence.', 'Pragnay', ARRAY['all india services', 'central control', 'administrative independence'], 'unitary_state_rebuttal', 5),

('**Financial Dependence on the Centre**: Major taxation powers lie with the Centre. States depend on grants-in-aid (Articles 273, 275, 282) and Finance Commission allocations. Article 360 can place states under total financial control of Centre.', 'Pragnay', ARRAY['financial dependence', 'taxation powers', 'grants in aid', 'finance commission'], 'unitary_state_rebuttal', 6);

-- ✅ IN FAVOUR OF A STRONG UNITARY SYSTEM
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Historical Need and National Integration**: During Partition, princely states, and threats of balkanisation, a strong Centre was essential. Ambedkar emphasised "Union" to ensure no right to secede.', 'Pragnay', ARRAY['historical need', 'national integration', 'partition', 'balkanisation'], 'unitary_state_arguments', 1),

('**Parliament''s Power over State Boundaries (Article 3)**: Centre alone can create, merge or alter state boundaries. State consent not mandatory.', 'Pragnay', ARRAY['article 3', 'state boundaries', 'parliament power'], 'unitary_state_arguments', 2),

('**Unified Command in Defence, Security, and Foreign Policy**: Centralised control ensures national stability, border safety, terrorism response, and diplomacy.', 'Pragnay', ARRAY['defence', 'security', 'foreign policy', 'national stability'], 'unitary_state_arguments', 3),

('**Economic and Developmental Coordination**: National plans, GST, financial emergency and centrally funded schemes require a strong union.', 'Pragnay', ARRAY['economic coordination', 'gst', 'national plans', 'development'], 'unitary_state_arguments', 4),

('**Emergency and Crisis Management**: Riots, pandemics, natural disasters require unified, rapid response.', 'Pragnay', ARRAY['emergency management', 'crisis response', 'disasters', 'unified command'], 'unitary_state_arguments', 5),

('**Uniform National Standards**: Helps maintain minimum levels of welfare, health, education and criminal justice throughout the country.', 'Pragnay', ARRAY['uniform standards', 'welfare', 'health', 'education', 'national standards'], 'unitary_state_arguments', 6);

-- ✅ IN FAVOUR OF STATES / TRUE FEDERAL STRUCTURE
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Unique Federalism (Sui Generis)**: Kuldip Nayar (2006): Indian federalism is unique, not comparable to Western models. Federal in design, adapted for Indian diversity.', 'Pragnay', ARRAY['sui generis', 'unique federalism', 'indian diversity'], 'pro_federalism_arguments', 7),

('**States Handle Most Welfare Functions**: Police, health, education, agriculture, transport & public order are State subjects. States have real ground-level impact.', 'Pragnay', ARRAY['welfare functions', 'state subjects', 'ground level impact'], 'pro_federalism_arguments', 8),

('**Cooperative Federalism through Institutions**: Inter-State Council (Art. 263), Finance Commission, GST Council are dialogue-based mechanisms.', 'Pragnay', ARRAY['cooperative federalism', 'inter state council', 'gst council', 'finance commission'], 'pro_federalism_arguments', 9),

('**Autonomy and Local Needs**: Diversity across states requires decentralised decision-making.', 'Pragnay', ARRAY['state autonomy', 'local needs', 'decentralisation', 'diversity'], 'pro_federalism_arguments', 10),

('**Local Governments + State Governments = Deep Federalism**: 73rd/74th Amendments gave permanent status to local bodies.', 'Pragnay', ARRAY['local government', '73rd amendment', '74th amendment', 'deep federalism'], 'pro_federalism_arguments', 11),

('**Judiciary Protects State Autonomy**: SR Bommai limited misuse of Article 356. Courts insist that federal balance is essential.', 'Pragnay', ARRAY['judiciary protection', 'sr bommai', 'article 356', 'federal balance'], 'pro_federalism_arguments', 12);

-- ✅ INDIA'S MIXED / QUASI-FEDERAL NATURE
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Combination of Federal and Unitary Features**: Indian Constitution blends federal structure with unitary spirit (Prof. K.C. Wheare). Sometimes called "Unitary with federal features".', 'Pragnay', ARRAY['quasi federal', 'mixed system', 'kc wheare', 'federal unitary blend'], 'pro_federalism_common_answers', 1),

('**Flexible Federalism**: Can work federal in normal times and unitary in emergency (Ambedkar).', 'Pragnay', ARRAY['flexible federalism', 'emergency powers', 'ambedkar'], 'pro_federalism_common_answers', 2),

('**Judicial Description: "Quasi-Federal", "Composite State"**: Scholars like Morris-Jones, Alexandrowicz, Granville Austin describe India as cooperative, composite, or quasi-federal.', 'Pragnay', ARRAY['judicial description', 'composite state', 'scholarly opinion'], 'pro_federalism_common_answers', 3),

('**National Interest Has Priority**: Several scholars emphasise that national unity and common economic policy require strong Centre.', 'Pragnay', ARRAY['national interest', 'unity priority', 'economic policy'], 'pro_federalism_common_answers', 4),

('**Administration Often Centralised but Functions Distributed**: Federalism exists but influenced by planned development, socialist goals, security forces.', 'Pragnay', ARRAY['centralised administration', 'planned development', 'socialist goals'], 'pro_federalism_common_answers', 5),

('**Evolves with Time**: From centralised (1950-70s) to cooperative (1990s), to competitive federalism (post-2014).', 'Pragnay', ARRAY['evolution', 'competitive federalism', 'cooperative federalism', 'time phases'], 'pro_federalism_common_answers', 6);

-- ✅ LEADING CASE LAWS ON INDIAN FEDERALISM
INSERT INTO debate_topics (point, person, topic_tags, section, position) VALUES 
('**Ram Jawaya Kapoor v. State of Punjab (1955)**: Issue: Whether India has strict separation of powers; extent of executive power. Held: India does not follow absolute separation of powers. Federal principle exists but not rigidly. Significance: Indian federalism is functional, not formalistic.', 'Pragnay', ARRAY['ram jawaya kapoor', 'separation of powers', 'functional federalism'], 'pro_federalism_common_answers', 7),

('**State of West Bengal v. Union of India (1963)**: West Bengal challenged Centre''s law allowing acquisition of state property. Held (5:1 majority): Indian Constitution is not based on classic federalism. States are not sovereign. Centre can acquire state property in national interest. Significance: Strong unitary bias; Parliament has supremacy in Union matters.', 'Pragnay', ARRAY['west bengal case', 'state sovereignty', 'unitary bias', 'parliament supremacy'], 'pro_federalism_common_answers', 8),

('**Kesavananda Bharati v. State of Kerala (1973)**: Held: Federalism is part of the Basic Structure. Constitution creates both Union & States, both are essential. Judicial review also basic structure. Significance: Strengthens federalism through judiciary.', 'Pragnay', ARRAY['kesavananda bharati', 'basic structure', 'federalism essential', 'judicial review'], 'pro_federalism_common_answers', 9),

('**Keshav Singh Case (In re) (1965)**: Court characterised Indian Constitution as federal.', 'Pragnay', ARRAY['keshav singh', 'federal characterisation'], 'pro_federalism_common_answers', 10),

('**State of Rajasthan v. Union of India (1977)**: Held: India is federal, but the extent of federalism is diluted to meet economic, political and social integration goals. Significance: Confirms quasi-federal identity.', 'Pragnay', ARRAY['rajasthan case', 'diluted federalism', 'integration goals', 'quasi federal'], 'pro_federalism_common_answers', 11);