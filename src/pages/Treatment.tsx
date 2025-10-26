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
import { TreatmentDialog } from '@/components/treatments/TreatmentDialog';

interface Treatment {
  id: string;
  disease_name: string;
  treatments: string[];
  medications: string[];
  created_at: string;
  updated_at: string;
}

export default function Treatment() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | undefined>();
  const queryClient = useQueryClient();

  const { data: treatments = [], isLoading } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .order('disease_name');
      
      if (error) throw error;
      return data as Treatment[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('treatments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      toast.success('Treatment deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete treatment');
      console.error('Error deleting treatment:', error);
    },
  });

  const handleEdit = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTreatment(undefined);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this treatment?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Navigation>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Treatment</h1>
            <p className="text-muted-foreground mt-2">
              Manage treatment information with treatments and medications
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Treatment
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
                  <TableHead>Treatments</TableHead>
                  <TableHead>Medications</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treatments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No treatments found. Add your first treatment to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  treatments.map((treatment) => (
                    <TableRow key={treatment.id}>
                      <TableCell className="font-medium">{treatment.disease_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {treatment.treatments && treatment.treatments.length > 0 ? (
                            treatment.treatments.map((item, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-green-100 text-green-800 hover:bg-green-200"
                              >
                                {item}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No treatments</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {treatment.medications && treatment.medications.length > 0 ? (
                            treatment.medications.map((medication, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-purple-100 text-purple-800 hover:bg-purple-200"
                              >
                                {medication}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No medications</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(treatment)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(treatment.id)}
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

        <TreatmentDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          treatment={editingTreatment}
        />
      </div>
    </Navigation>
  );
}
