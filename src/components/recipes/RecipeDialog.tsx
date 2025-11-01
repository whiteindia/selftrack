import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { FoodItemsSelect } from './FoodItemsSelect';

interface FoodItem {
  food_id: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
}

interface Recipe {
  id: string;
  name: string;
  foods: string[];
  food_items?: FoodItem[];
  calories_value: number;
  calories_unit: string;
  recipe_type: string;
}

interface RecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: Recipe | null;
}

export function RecipeDialog({ open, onOpenChange, recipe }: RecipeDialogProps) {
  const [name, setName] = useState('');
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [recipeType, setRecipeType] = useState<string>('Breakfast');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setFoodItems(recipe.food_items || []);
      setRecipeType(recipe.recipe_type || 'Breakfast');
    } else {
      setName('');
      setFoodItems([]);
      setRecipeType('Breakfast');
    }
  }, [recipe]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const totalCalories = foodItems.reduce((sum, item) => sum + item.calories, 0);
      
      const data = {
        name,
        foods: foodItems.map(item => item.food_name),
        food_items: foodItems as any,
        calories_value: Math.round(totalCalories * 10) / 10,
        calories_unit: 'Per Serving',
        recipe_type: recipeType,
      };

      if (recipe) {
        const { error } = await supabase
          .from('recipes')
          .update(data)
          .eq('id', recipe.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recipes')
          .insert([data]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success(recipe ? 'Recipe updated successfully' : 'Recipe added successfully');
      handleClose();
    },
    onError: (error) => {
      toast.error('Failed to save recipe');
      console.error('Save error:', error);
    },
  });

  const handleClose = () => {
    setName('');
    setFoodItems([]);
    setRecipeType('Breakfast');
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a recipe name');
      return;
    }
    if (foodItems.length === 0) {
      toast.error('Please add at least one food item');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Edit Recipe' : 'Add Recipe'}</DialogTitle>
          <DialogDescription>
            {recipe 
              ? 'Update the recipe details and food items. Calories are calculated automatically.'
              : 'Add a new recipe with food items from the database. Calories are calculated automatically based on quantities.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Recipe Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Greek Salad, Chicken Curry"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipeType">Recipe Type</Label>
            <Select value={recipeType} onValueChange={setRecipeType}>
              <SelectTrigger id="recipeType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Breakfast">Breakfast</SelectItem>
                <SelectItem value="Lunch">Lunch</SelectItem>
                <SelectItem value="Dinner">Dinner</SelectItem>
                <SelectItem value="Snacks">Snacks</SelectItem>
                <SelectItem value="Juices">Juices</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Food Items</Label>
            <FoodItemsSelect
              foodItems={foodItems}
              onChange={setFoodItems}
            />
            <p className="text-sm text-muted-foreground">
              Select foods from the database and specify quantities. Calories will be calculated automatically.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
