-- Add calories columns to foods table
ALTER TABLE public.foods
ADD COLUMN IF NOT EXISTS calories_value numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS calories_unit text NOT NULL DEFAULT 'Per 100G';

-- Update recipes table to store food items with quantities
-- First, add a new column for structured food data
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS food_items jsonb DEFAULT '[]'::jsonb;