-- Clear existing data and change default_menu date column to integer for day numbers (1-31)
DELETE FROM public.default_menu;

ALTER TABLE public.default_menu 
ALTER COLUMN date TYPE integer USING NULL;