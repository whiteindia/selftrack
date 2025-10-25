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
import { RecipeDialog } from '@/components/recipes/RecipeDialog';
import Navigation from '@/components/Navigation';

interface Recipe {
  id: string;
  name: string;
  foods: string[];
  calories_value: number;
  calories_unit: string;
  recipe_type: string;
  created_at: string;
  updated_at: string;
}

export default function Recipes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const queryClient = useQueryClient();

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Recipe[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Recipe deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete recipe');
      console.error('Delete error:', error);
    },
  });

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRecipe(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this recipe?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Navigation>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Recipes</h1>
            <p className="text-muted-foreground mt-1">
              Manage your recipes with ingredients and calorie information
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Recipe
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading recipes...</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-orange-700">
                <TableRow>
                  <TableHead className="text-white font-bold text-base">Recipe</TableHead>
                  <TableHead className="text-white font-bold text-base">Type</TableHead>
                  <TableHead className="text-white font-bold text-base">Foods</TableHead>
                  <TableHead className="text-white font-bold text-base">Calories</TableHead>
                  <TableHead className="text-white font-bold text-base text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No recipes found. Add your first recipe.
                    </TableCell>
                  </TableRow>
                ) : (
                  recipes.map((recipe) => (
                    <TableRow key={recipe.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{recipe.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {recipe.recipe_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {recipe.foods.map((food, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                            >
                              {food}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {recipe.calories_value}Kcal {recipe.calories_unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(recipe)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(recipe.id)}
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

        <RecipeDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          recipe={editingRecipe}
        />
      </div>
    </Navigation>
  );
}
