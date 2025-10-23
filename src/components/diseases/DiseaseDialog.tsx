import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { DiseaseNutrientsSelect } from './DiseaseNutrientsSelect';

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

interface DiseaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disease?: Disease;
}

export function DiseaseDialog({ open, onOpenChange, disease }: DiseaseDialogProps) {
  const [diseaseName, setDiseaseName] = useState('');
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (disease) {
      setDiseaseName(disease.disease_name);
      setNutrients(disease.nutrients || []);
    } else {
      setDiseaseName('');
      setNutrients([]);
    }
  }, [disease]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const diseaseData = {
        disease_name: diseaseName,
        nutrients: nutrients as any,
      };

      if (disease) {
        const { error } = await supabase
          .from('diseases')
          .update(diseaseData)
          .eq('id', disease.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('diseases')
          .insert([diseaseData]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diseases'] });
      toast.success(disease ? 'Disease updated successfully' : 'Disease created successfully');
      handleClose();
    },
    onError: (error) => {
      toast.error('Failed to save disease');
      console.error('Error saving disease:', error);
    },
  });

  const handleClose = () => {
    setDiseaseName('');
    setNutrients([]);
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!diseaseName.trim()) {
      toast.error('Please enter a disease name');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{disease ? 'Edit Disease' : 'Add Disease'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="disease-name">Disease Name</Label>
            <Input
              id="disease-name"
              value={diseaseName}
              onChange={(e) => setDiseaseName(e.target.value)}
              placeholder="Enter disease name"
            />
          </div>

          <div className="space-y-2">
            <Label>Nutrient Category</Label>
            <DiseaseNutrientsSelect
              nutrients={nutrients}
              onChange={setNutrients}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
