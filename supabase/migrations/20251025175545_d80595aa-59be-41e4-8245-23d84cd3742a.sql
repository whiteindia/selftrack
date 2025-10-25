-- Add recipe_type column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN recipe_type text DEFAULT 'Breakfast' CHECK (recipe_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Juices'));