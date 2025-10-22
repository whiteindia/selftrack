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
import { toast } from 'sonner';
import { SubtypesInput } from './SubtypesInput';

interface Nutrient {
  id: string;
  category: string;
  subtypes: string[];
}

interface NutrientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nutrient?: Nutrient | null;
}

export function NutrientDialog({ open, onOpenChange, nutrient }: NutrientDialogProps) {
  const [category, setCategory] = useState('');
  const [subtypes, setSubtypes] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (nutrient) {
      setCategory(nutrient.category);
      setSubtypes(nutrient.subtypes || []);
    } else {
      setCategory('');
      setSubtypes([]);
    }
  }, [nutrient]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        category,
        subtypes,
      };

      if (nutrient) {
        const { error } = await supabase
          .from('nutrients')
          .update(data)
          .eq('id', nutrient.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('nutrients')
          .insert([data]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrients'] });
      toast.success(nutrient ? 'Nutrient updated successfully' : 'Nutrient added successfully');
      handleClose();
    },
    onError: (error) => {
      toast.error('Failed to save nutrient');
      console.error('Save error:', error);
    },
  });

  const handleClose = () => {
    setCategory('');
    setSubtypes([]);
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!category.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{nutrient ? 'Edit Nutrient' : 'Add Nutrient'}</DialogTitle>
          <DialogDescription>
            {nutrient 
              ? 'Update the nutrient category and sub-types'
              : 'Add a new nutrient category with sub-types. Press Tab after each sub-type to add multiple entries.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Carbohydrates, Proteins, Fats"
            />
          </div>

          <div className="space-y-2">
            <Label>Sub-Types</Label>
            <SubtypesInput
              subtypes={subtypes}
              onChange={setSubtypes}
            />
            <p className="text-sm text-muted-foreground">
              Type a sub-type and press Tab to add it. Press Backspace to remove the last item.
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
