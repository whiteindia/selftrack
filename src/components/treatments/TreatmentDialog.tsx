import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrayInput } from '@/components/diseases/ArrayInput';

interface Treatment {
  id: string;
  disease_name: string;
  treatments: string[];
  medications: string[];
  created_at: string;
  updated_at: string;
}

interface TreatmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatment?: Treatment;
}

export function TreatmentDialog({ open, onOpenChange, treatment }: TreatmentDialogProps) {
  const [diseaseName, setDiseaseName] = useState('');
  const [treatments, setTreatments] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (treatment) {
      setDiseaseName(treatment.disease_name);
      setTreatments(treatment.treatments || []);
      setMedications(treatment.medications || []);
    } else {
      setDiseaseName('');
      setTreatments([]);
      setMedications([]);
    }
  }, [treatment]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        disease_name: diseaseName,
        treatments,
        medications,
      };

      if (treatment) {
        const { error } = await supabase
          .from('treatments')
          .update(data)
          .eq('id', treatment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('treatments')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      toast.success(treatment ? 'Treatment updated successfully' : 'Treatment created successfully');
      handleClose();
    },
    onError: (error) => {
      toast.error('Failed to save treatment');
      console.error('Error saving treatment:', error);
    },
  });

  const handleClose = () => {
    setDiseaseName('');
    setTreatments([]);
    setMedications([]);
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!diseaseName.trim()) {
      toast.error('Disease name is required');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{treatment ? 'Edit Treatment' : 'Add Treatment'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Disease Name</label>
            <Input
              value={diseaseName}
              onChange={(e) => setDiseaseName(e.target.value)}
              placeholder="Enter disease name"
            />
          </div>

          <ArrayInput
            label="Treatments"
            items={treatments}
            onChange={setTreatments}
            placeholder="Add treatment and press Enter"
          />

          <ArrayInput
            label="Medications"
            items={medications}
            onChange={setMedications}
            placeholder="Add medication and press Enter"
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
