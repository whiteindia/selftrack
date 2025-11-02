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
import { ArrayInput } from './ArrayInput';

interface Disease {
  id: string;
  disease_name: string;
  reasons: string[];
  symptoms: string[];
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
  const [reasons, setReasons] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (disease) {
      setDiseaseName(disease.disease_name);
      setReasons(disease.reasons || []);
      setSymptoms(disease.symptoms || []);
    } else {
      setDiseaseName('');
      setReasons([]);
      setSymptoms([]);
    }
  }, [disease]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        disease_name: diseaseName,
        reasons,
        symptoms,
      };

      if (disease) {
        const { error } = await supabase
          .from('diseases')
          .update(data)
          .eq('id', disease.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('diseases')
          .insert([data]);
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
    setReasons([]);
    setSymptoms([]);
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
          <DialogTitle>{disease ? 'Edit Disease' : 'Add Disease'}</DialogTitle>
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
            label="Causes"
            items={reasons}
            onChange={setReasons}
            placeholder="Add cause and press Enter"
          />

          <ArrayInput
            label="Effects"
            items={symptoms}
            onChange={setSymptoms}
            placeholder="Add effect and press Enter"
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
