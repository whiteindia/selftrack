import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { NutrientsSelect } from './NutrientsSelect';

interface Food {
  id: string;
  name: string;
  category: string;
  nutrients: Array<{ category: string; subtype: string }>;
}

interface FoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food?: Food | null;
}

export function FoodDialog({ open, onOpenChange, food }: FoodDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [nutrients, setNutrients] = useState<Array<{ category: string; subtype: string }>>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (food) {
      setName(food.name);
      setCategory(food.category);
      setNutrients(food.nutrients || []);
    } else {
      setName('');
      setCategory('');
      setNutrients([]);
    }
  }, [food, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const foodData = {
        name,
        category,
        nutrients,
      };

      if (food) {
        const { error } = await supabase
          .from('foods')
          .update(foodData)
          .eq('id', food.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('foods')
          .insert(foodData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      toast.success(food ? 'Food updated successfully' : 'Food created successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to save food');
      console.error('Save error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{food ? 'Edit Food' : 'Add Food'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Food Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Apple"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Fruit"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Nutrients</Label>
            <NutrientsSelect
              nutrients={nutrients}
              onChange={setNutrients}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
