-- Insert treatment data for common diseases
INSERT INTO public.treatments (disease_name, treatments, medications) VALUES
('Common Cold', 
 ARRAY['Rest and adequate sleep', 'Stay hydrated with plenty of fluids', 'Use a humidifier', 'Gargle with salt water', 'Take vitamin C supplements'],
 ARRAY['Acetaminophen (Tylenol)', 'Ibuprofen (Advil)', 'Decongestants (Pseudoephedrine)', 'Antihistamines (Diphenhydramine)', 'Cough suppressants (Dextromethorphan)']),

('Influenza (Flu)',
 ARRAY['Bed rest and isolation', 'Drink plenty of fluids', 'Antiviral therapy within 48 hours', 'Use fever reducers', 'Keep warm and comfortable'],
 ARRAY['Oseltamivir (Tamiflu)', 'Zanamivir (Relenza)', 'Acetaminophen', 'Ibuprofen', 'Baloxavir marboxil (Xofluza)']),

('Type 2 Diabetes',
 ARRAY['Regular exercise (30 minutes daily)', 'Healthy diet with controlled carbs', 'Monitor blood sugar levels', 'Weight management', 'Regular medical checkups'],
 ARRAY['Metformin', 'Glipizide', 'Insulin (if needed)', 'Sitagliptin (Januvia)', 'Empagliflozin (Jardiance)']),

('Hypertension (High Blood Pressure)',
 ARRAY['Low-sodium diet', 'Regular aerobic exercise', 'Maintain healthy weight', 'Limit alcohol consumption', 'Stress management techniques', 'DASH diet'],
 ARRAY['Lisinopril', 'Amlodipine', 'Losartan', 'Hydrochlorothiazide', 'Metoprolol']),

('Asthma',
 ARRAY['Avoid triggers (allergens, smoke)', 'Use air purifiers', 'Regular breathing exercises', 'Monitor peak flow', 'Have action plan ready'],
 ARRAY['Albuterol (rescue inhaler)', 'Fluticasone (Flovent)', 'Montelukast (Singulair)', 'Budesonide', 'Prednisone (for flare-ups)']),

('Migraine',
 ARRAY['Identify and avoid triggers', 'Regular sleep schedule', 'Stay hydrated', 'Cold compress on forehead', 'Rest in dark, quiet room', 'Stress management'],
 ARRAY['Sumatriptan (Imitrex)', 'Ibuprofen', 'Acetaminophen', 'Propranolol (preventive)', 'Topiramate (preventive)']),

('Gastroesophageal Reflux Disease (GERD)',
 ARRAY['Eat smaller, frequent meals', 'Avoid trigger foods', 'Elevate head of bed', 'Don''t lie down after eating', 'Lose weight if overweight', 'Quit smoking'],
 ARRAY['Omeprazole (Prilosec)', 'Esomeprazole (Nexium)', 'Ranitidine', 'Antacids (Tums)', 'Famotidine (Pepcid)']),

('Osteoarthritis',
 ARRAY['Low-impact exercise (swimming, cycling)', 'Physical therapy', 'Weight management', 'Hot/cold therapy', 'Use assistive devices', 'Joint protection techniques'],
 ARRAY['Acetaminophen', 'Ibuprofen', 'Naproxen', 'Diclofenac gel', 'Glucosamine supplements', 'Corticosteroid injections']),

('Depression',
 ARRAY['Psychotherapy (CBT)', 'Regular exercise', 'Maintain sleep schedule', 'Social support', 'Mindfulness meditation', 'Light therapy (for seasonal)'],
 ARRAY['Sertraline (Zoloft)', 'Fluoxetine (Prozac)', 'Escitalopram (Lexapro)', 'Bupropion (Wellbutrin)', 'Venlafaxine (Effexor)']),

('Anxiety Disorder',
 ARRAY['Cognitive behavioral therapy', 'Relaxation techniques', 'Regular exercise', 'Avoid caffeine and alcohol', 'Practice deep breathing', 'Adequate sleep'],
 ARRAY['Alprazolam (Xanax)', 'Lorazepam (Ativan)', 'Buspirone', 'Sertraline', 'Escitalopram']),

('Pneumonia',
 ARRAY['Complete rest', 'Drink plenty of fluids', 'Use humidifier', 'Breathing exercises', 'Oxygen therapy if needed', 'Follow medication schedule'],
 ARRAY['Amoxicillin', 'Azithromycin (Z-pack)', 'Levofloxacin', 'Ceftriaxone', 'Doxycycline']),

('Urinary Tract Infection (UTI)',
 ARRAY['Drink plenty of water', 'Urinate frequently', 'Use heating pad for pain', 'Avoid irritants (coffee, alcohol)', 'Practice good hygiene'],
 ARRAY['Nitrofurantoin (Macrobid)', 'Trimethoprim-sulfamethoxazole (Bactrim)', 'Ciprofloxacin', 'Cephalexin', 'Phenazopyridine (pain relief)']),

('Allergic Rhinitis (Hay Fever)',
 ARRAY['Avoid allergens', 'Keep windows closed during high pollen', 'Use HEPA filters', 'Shower after being outdoors', 'Nasal irrigation with saline'],
 ARRAY['Loratadine (Claritin)', 'Cetirizine (Zyrtec)', 'Fluticasone nasal spray', 'Fexofenadine (Allegra)', 'Montelukast']),

('Hypothyroidism',
 ARRAY['Take medication consistently', 'Regular thyroid monitoring', 'Balanced diet', 'Manage stress', 'Avoid soy with medication'],
 ARRAY['Levothyroxine (Synthroid)', 'Liothyronine', 'Armour Thyroid', 'Nature-Throid', 'Tirosint']),

('Eczema (Atopic Dermatitis)',
 ARRAY['Moisturize regularly', 'Avoid triggers (harsh soaps)', 'Take lukewarm baths', 'Wear soft fabrics', 'Use fragrance-free products', 'Manage stress'],
 ARRAY['Hydrocortisone cream', 'Triamcinolone', 'Tacrolimus (Protopic)', 'Pimecrolimus (Elidel)', 'Dupilumab (Dupixent) for severe cases']),

('Irritable Bowel Syndrome (IBS)',
 ARRAY['Follow low-FODMAP diet', 'Manage stress', 'Regular exercise', 'Eat fiber gradually', 'Avoid trigger foods', 'Keep food diary'],
 ARRAY['Dicyclomine', 'Loperamide (Imodium)', 'Lubiprostone (Amitiza)', 'Rifaximin', 'Probiotics']),

('Chronic Fatigue Syndrome',
 ARRAY['Paced activity management', 'Cognitive behavioral therapy', 'Graded exercise therapy', 'Sleep hygiene', 'Stress management', 'Balanced diet'],
 ARRAY['Pain relievers (Ibuprofen)', 'Sleep aids (Melatonin)', 'Antidepressants', 'Stimulants (for daytime alertness)', 'Vitamin B12 supplements']),

('Acne Vulgaris',
 ARRAY['Gentle cleansing twice daily', 'Don''t pick or squeeze', 'Use non-comedogenic products', 'Change pillowcases regularly', 'Avoid excessive sun exposure'],
 ARRAY['Benzoyl peroxide', 'Salicylic acid', 'Tretinoin (Retin-A)', 'Clindamycin gel', 'Isotretinoin (Accutane) for severe', 'Doxycycline (oral)']),

('Psoriasis',
 ARRAY['Moisturize daily', 'Avoid triggers', 'Limit sun exposure safely', 'Manage stress', 'Avoid alcohol', 'Use humidifier'],
 ARRAY['Topical corticosteroids', 'Vitamin D analogues (Calcipotriene)', 'Methotrexate', 'Biologics (Humira, Enbrel)', 'Apremilast (Otezla)']),

('Insomnia',
 ARRAY['Maintain consistent sleep schedule', 'Create relaxing bedtime routine', 'Avoid screens before bed', 'Keep bedroom cool and dark', 'Limit caffeine', 'Exercise regularly (not before bed)'],
 ARRAY['Melatonin', 'Zolpidem (Ambien)', 'Eszopiclone (Lunesta)', 'Diphenhydramine (Benadryl)', 'Trazodone', 'Doxepin'])
ON CONFLICT DO NOTHING;