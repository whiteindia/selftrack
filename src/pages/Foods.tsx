import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FoodDialog } from '@/components/foods/FoodDialog';

interface Food {
  id: string;
  name: string;
  category: string;
  nutrients: Array<{ category: string; subtype: string }>;
  created_at: string;
  updated_at: string;
}

export default function Foods() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const queryClient = useQueryClient();

  const { data: foods = [], isLoading } = useQuery({
    queryKey: ['foods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Food[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      toast.success('Food deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete food');
      console.error('Delete error:', error);
    },
  });

  const handleEdit = (food: Food) => {
    setEditingFood(food);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingFood(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this food?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Foods</h1>
          <p className="text-muted-foreground mt-1">
            Manage foods and their nutrient composition
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Food
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading foods...</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-green-700">
              <TableRow>
                <TableHead className="text-white font-bold text-base">Food</TableHead>
                <TableHead className="text-white font-bold text-base">Category</TableHead>
                <TableHead className="text-white font-bold text-base">Nutrients</TableHead>
                <TableHead className="text-white font-bold text-base text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {foods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No foods found. Add your first food item.
                  </TableCell>
                </TableRow>
              ) : (
                foods.map((food) => (
                  <TableRow key={food.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{food.name}</TableCell>
                    <TableCell>{food.category}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {food.nutrients?.map((nutrient, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-green-100 text-green-800 hover:bg-green-200"
                          >
                            {nutrient.category} - {nutrient.subtype}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(food)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(food.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <FoodDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        food={editingFood}
      />
    </div>
  );
}
