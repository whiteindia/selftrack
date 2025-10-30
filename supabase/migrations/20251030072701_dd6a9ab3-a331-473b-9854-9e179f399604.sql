-- Insert common diseases with their symptoms and reasons
INSERT INTO public.diseases (disease_name, reasons, symptoms) VALUES
('Diabetes Type 2', 
 ARRAY['Obesity', 'Sedentary lifestyle', 'Poor diet high in sugar', 'Genetic predisposition', 'Age over 45', 'High blood pressure'],
 ARRAY['Frequent urination', 'Excessive thirst', 'Increased hunger', 'Fatigue', 'Blurred vision', 'Slow wound healing', 'Tingling in hands or feet']),

('Hypertension (High Blood Pressure)', 
 ARRAY['High salt intake', 'Obesity', 'Lack of physical activity', 'Excessive alcohol', 'Stress', 'Smoking', 'Genetic factors'],
 ARRAY['Headaches', 'Shortness of breath', 'Nosebleeds', 'Chest pain', 'Dizziness', 'Fatigue', 'Vision problems']),

('Heart Disease', 
 ARRAY['High cholesterol', 'High blood pressure', 'Smoking', 'Diabetes', 'Obesity', 'Sedentary lifestyle', 'Poor diet', 'Family history'],
 ARRAY['Chest pain', 'Shortness of breath', 'Pain in neck or jaw', 'Pain in upper abdomen', 'Fatigue', 'Irregular heartbeat', 'Swelling in legs']),

('Asthma', 
 ARRAY['Allergies', 'Environmental pollutants', 'Respiratory infections', 'Physical activity', 'Cold air', 'Genetic factors', 'Smoking'],
 ARRAY['Wheezing', 'Shortness of breath', 'Chest tightness', 'Coughing', 'Difficulty sleeping', 'Rapid breathing', 'Fatigue']),

('Arthritis (Osteoarthritis)', 
 ARRAY['Age', 'Joint injury', 'Obesity', 'Repetitive stress', 'Genetics', 'Bone deformities', 'Gender (more common in women)'],
 ARRAY['Joint pain', 'Stiffness', 'Swelling', 'Reduced range of motion', 'Tenderness', 'Bone spurs', 'Grating sensation']),

('Depression', 
 ARRAY['Brain chemistry imbalance', 'Genetics', 'Traumatic events', 'Chronic stress', 'Hormonal changes', 'Chronic illness', 'Substance abuse'],
 ARRAY['Persistent sadness', 'Loss of interest', 'Sleep problems', 'Fatigue', 'Changes in appetite', 'Difficulty concentrating', 'Feelings of worthlessness', 'Suicidal thoughts']),

('Anxiety Disorder', 
 ARRAY['Stress', 'Trauma', 'Genetics', 'Brain chemistry', 'Substance abuse', 'Medical conditions', 'Personality factors'],
 ARRAY['Excessive worrying', 'Restlessness', 'Fatigue', 'Difficulty concentrating', 'Irritability', 'Muscle tension', 'Sleep problems', 'Panic attacks']),

('Migraine', 
 ARRAY['Hormonal changes', 'Stress', 'Certain foods', 'Sensory stimuli', 'Sleep changes', 'Weather changes', 'Medications', 'Genetics'],
 ARRAY['Severe headache', 'Nausea', 'Vomiting', 'Sensitivity to light', 'Sensitivity to sound', 'Visual disturbances', 'Throbbing pain']),

('Obesity', 
 ARRAY['Poor diet', 'Lack of exercise', 'Genetics', 'Medical conditions', 'Certain medications', 'Stress', 'Lack of sleep'],
 ARRAY['Excess body weight', 'Fatigue', 'Joint pain', 'Shortness of breath', 'Excessive sweating', 'Sleep apnea', 'High cholesterol']),

('Common Cold', 
 ARRAY['Viral infection', 'Weakened immune system', 'Close contact with infected person', 'Touching contaminated surfaces', 'Seasonal changes'],
 ARRAY['Runny nose', 'Sore throat', 'Cough', 'Sneezing', 'Congestion', 'Mild headache', 'Fatigue', 'Mild fever']),

('Influenza (Flu)', 
 ARRAY['Influenza virus infection', 'Weakened immune system', 'Seasonal exposure', 'Close contact with infected individuals', 'Crowded places'],
 ARRAY['High fever', 'Muscle aches', 'Chills', 'Fatigue', 'Cough', 'Sore throat', 'Headache', 'Congestion']),

('Gastroesophageal Reflux Disease (GERD)', 
 ARRAY['Weak lower esophageal sphincter', 'Obesity', 'Pregnancy', 'Smoking', 'Certain foods', 'Large meals', 'Hiatal hernia'],
 ARRAY['Heartburn', 'Chest pain', 'Difficulty swallowing', 'Regurgitation', 'Chronic cough', 'Laryngitis', 'Disrupted sleep']),

('Chronic Kidney Disease', 
 ARRAY['Diabetes', 'High blood pressure', 'Glomerulonephritis', 'Polycystic kidney disease', 'Urinary tract obstruction', 'Recurrent infections'],
 ARRAY['Fatigue', 'Swelling in legs and ankles', 'Shortness of breath', 'Nausea', 'Loss of appetite', 'Confusion', 'Decreased urine output']),

('Anemia', 
 ARRAY['Iron deficiency', 'Vitamin B12 deficiency', 'Chronic disease', 'Blood loss', 'Bone marrow problems', 'Genetic disorders'],
 ARRAY['Fatigue', 'Weakness', 'Pale skin', 'Shortness of breath', 'Dizziness', 'Cold hands and feet', 'Irregular heartbeat', 'Headaches']),

('Hypothyroidism', 
 ARRAY['Autoimmune disease', 'Thyroid surgery', 'Radiation therapy', 'Medications', 'Iodine deficiency', 'Congenital disease'],
 ARRAY['Fatigue', 'Weight gain', 'Cold sensitivity', 'Constipation', 'Dry skin', 'Depression', 'Muscle weakness', 'Slow heart rate']),

('Allergic Rhinitis (Hay Fever)', 
 ARRAY['Pollen', 'Dust mites', 'Pet dander', 'Mold spores', 'Environmental allergens', 'Genetic predisposition'],
 ARRAY['Sneezing', 'Runny nose', 'Itchy eyes', 'Nasal congestion', 'Postnasal drip', 'Fatigue', 'Cough']),

('Osteoporosis', 
 ARRAY['Age', 'Low calcium intake', 'Lack of vitamin D', 'Sedentary lifestyle', 'Smoking', 'Excessive alcohol', 'Hormonal changes', 'Certain medications'],
 ARRAY['Back pain', 'Loss of height', 'Stooped posture', 'Bone fractures', 'Reduced mobility', 'Weakness']),

('Pneumonia', 
 ARRAY['Bacterial infection', 'Viral infection', 'Fungal infection', 'Weakened immune system', 'Chronic diseases', 'Smoking', 'Hospitalization'],
 ARRAY['Fever', 'Cough with phlegm', 'Chest pain', 'Shortness of breath', 'Fatigue', 'Nausea', 'Confusion', 'Sweating']),

('Urinary Tract Infection (UTI)', 
 ARRAY['Bacterial infection', 'Poor hygiene', 'Sexual activity', 'Urinary catheter', 'Kidney stones', 'Weakened immune system', 'Anatomical abnormalities'],
 ARRAY['Burning sensation during urination', 'Frequent urination', 'Cloudy urine', 'Strong-smelling urine', 'Pelvic pain', 'Blood in urine', 'Fever']),

('Celiac Disease', 
 ARRAY['Genetic predisposition', 'Gluten consumption', 'Autoimmune reaction', 'Environmental factors', 'Gut bacteria imbalance'],
 ARRAY['Diarrhea', 'Abdominal pain', 'Bloating', 'Weight loss', 'Fatigue', 'Anemia', 'Bone pain', 'Skin rash']);
