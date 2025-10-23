import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { DiseaseDialog } from '@/components/diseases/DiseaseDialog';

interface Nutrient {
  category: string;
  subtype: string;
}

interface Disease {
  id: string;
  disease_name: string;
  nutrients: Nutrient[];
  created_at: string;
  updated_at: string;
}

export default function Diseases() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState<Disease | undefined>();
  const queryClient = useQueryClient();

  const { data: diseases = [], isLoading } = useQuery({
    queryKey: ['diseases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diseases')
        .select('*')
        .order('disease_name');
      
      if (error) throw error;
      return data.map(d => ({
        ...d,
        nutrients: (d.nutrients as any) || []
      })) as Disease[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('diseases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diseases'] });
      toast.success('Disease deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete disease');
      console.error('Error deleting disease:', error);
    },
  });

  const handleEdit = (disease: Disease) => {
    setEditingDisease(disease);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingDisease(undefined);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this disease?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Navigation>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Diseases</h1>
            <p className="text-muted-foreground mt-2">
              Manage disease information with recommended nutrients
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Disease
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disease Name</TableHead>
                  <TableHead>Nutrient Category</TableHead>
                  <TableHead>Food Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diseases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No diseases found. Add your first disease to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  diseases.map((disease) => (
                    <TableRow key={disease.id}>
                      <TableCell className="font-medium">{disease.disease_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {disease.nutrients && disease.nutrients.length > 0 ? (
                            disease.nutrients.map((nutrient, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                              >
                                {nutrient.category} - {nutrient.subtype}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No nutrients</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DiseaseMatchedFoods nutrients={disease.nutrients || []} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(disease)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(disease.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <DiseaseDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          disease={editingDisease}
        />
      </div>
    </Navigation>
  );
}

// Component to fetch and display matched foods
function DiseaseMatchedFoods({ nutrients }: { nutrients: Nutrient[] }) {
  const { data: foods = [] } = useQuery({
    queryKey: ['matched-foods', nutrients],
    queryFn: async () => {
      if (!nutrients || nutrients.length === 0) return [];
      
      const { data, error } = await supabase
        .from('foods')
        .select('id, name, nutrients');
      
      if (error) throw error;
      
      // Filter foods that match any of the selected nutrients
      const matchedFoods = data.filter((food: any) => {
        if (!food.nutrients || !Array.isArray(food.nutrients)) return false;
        
        return nutrients.some(selectedNutrient => 
          food.nutrients.some((foodNutrient: any) => 
            foodNutrient.category === selectedNutrient.category &&
            foodNutrient.subtype === selectedNutrient.subtype
          )
        );
      });
      
      return matchedFoods;
    },
    enabled: nutrients && nutrients.length > 0,
  });

  if (!nutrients || nutrients.length === 0) {
    return <span className="text-muted-foreground text-sm">No nutrients selected</span>;
  }

  if (foods.length === 0) {
    return <span className="text-muted-foreground text-sm">No matching foods</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {foods.map((food: any) => (
        <Badge
          key={food.id}
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          {food.name}
        </Badge>
      ))}
    </div>
  );
}
