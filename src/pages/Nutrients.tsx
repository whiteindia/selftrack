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
import { NutrientDialog } from '@/components/nutrients/NutrientDialog';
import Navigation from '@/components/Navigation';

interface Nutrient {
  id: string;
  category: string;
  subtypes: string[];
  main_functions: string[];
  created_at: string;
  updated_at: string;
}

export default function Nutrients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNutrient, setEditingNutrient] = useState<Nutrient | null>(null);
  const queryClient = useQueryClient();

  const { data: nutrients = [], isLoading } = useQuery({
    queryKey: ['nutrients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrients')
        .select('*')
        .order('category');
      
      if (error) throw error;
      return data as Nutrient[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('nutrients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrients'] });
      toast.success('Nutrient deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete nutrient');
      console.error('Delete error:', error);
    },
  });

  const handleEdit = (nutrient: Nutrient) => {
    setEditingNutrient(nutrient);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingNutrient(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this nutrient category?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Navigation>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Nutrients</h1>
          <p className="text-muted-foreground mt-1">
            Manage nutrient categories and their sub-types
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Nutrient
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading nutrients...</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-green-700">
              <TableRow>
                <TableHead className="text-white font-bold text-base">Category</TableHead>
                <TableHead className="text-white font-bold text-base">Sub-Types</TableHead>
                <TableHead className="text-white font-bold text-base">Main Functions</TableHead>
                <TableHead className="text-white font-bold text-base text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nutrients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No nutrients found. Add your first nutrient category.
                  </TableCell>
                </TableRow>
              ) : (
                nutrients.map((nutrient) => (
                  <TableRow key={nutrient.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{nutrient.category}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {nutrient.subtypes.map((subtype, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-green-100 text-green-800 hover:bg-green-200"
                          >
                            {subtype}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {nutrient.main_functions?.map((func, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                          >
                            {func}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(nutrient)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(nutrient.id)}
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

      <NutrientDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        nutrient={editingNutrient}
      />
      </div>
    </Navigation>
  );
}
