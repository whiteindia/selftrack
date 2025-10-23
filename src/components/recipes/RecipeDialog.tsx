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
import { SubtypesInput } from '@/components/nutrients/SubtypesInput';

interface Recipe {
  id: string;
  name: string;
  foods: string[];
  calories_value: number;
  calories_unit: string;
}

interface RecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: Recipe | null;
}

export function RecipeDialog({ open, onOpenChange, recipe }: RecipeDialogProps) {
  const [name, setName] = useState('');
  const [foods, setFoods] = useState<string[]>([]);
  const [caloriesValue, setCaloriesValue] = useState<string>('0');
  const [caloriesUnit, setCaloriesUnit] = useState<string>('Per 100G');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setFoods(recipe.foods || []);
      setCaloriesValue(recipe.calories_value.toString());
      setCaloriesUnit(recipe.calories_unit);
    } else {
      setName('');
      setFoods([]);
      setCaloriesValue('0');
      setCaloriesUnit('Per 100G');
    }
  }, [recipe]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name,
        foods,
        calories_value: parseFloat(caloriesValue) || 0,
        calories_unit: caloriesUnit,
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
    setFoods([]);
    setCaloriesValue('0');
    setCaloriesUnit('Per 100G');
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a recipe name');
      return;
    }
    if (foods.length === 0) {
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
              ? 'Update the recipe details, foods, and calorie information'
              : 'Add a new recipe with foods and calorie information. Press Tab after each food to add multiple items.'
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
            <Label>Foods</Label>
            <SubtypesInput
              subtypes={foods}
              onChange={setFoods}
            />
            <p className="text-sm text-muted-foreground">
              Type a food item and press Tab to add it. Press Backspace to remove the last item.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Calories</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  value={caloriesValue}
                  onChange={(e) => setCaloriesValue(e.target.value)}
                  placeholder="e.g., 100"
                  min="0"
                  step="0.1"
                />
              </div>
              <Select value={caloriesUnit} onValueChange={setCaloriesUnit}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Per 100G">Per 100G</SelectItem>
                  <SelectItem value="Per Serving">Per Serving</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the calorie value and select the unit (Per 100G or Per Serving)
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
