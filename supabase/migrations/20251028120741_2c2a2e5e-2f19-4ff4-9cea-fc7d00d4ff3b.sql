-- Add foreign key to link custom_menu to recipes table
ALTER TABLE public.custom_menu
ADD CONSTRAINT custom_menu_recipe_id_fkey 
FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;