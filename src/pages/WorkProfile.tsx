import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface WorkProfile {
  id: string;
  profile_name: string;
  person_name: string | null;
  profile_type: string | null;
  calories_required: number;
  age: number | null;
  weight: number | null;
  bmi: number | null;
}

const WorkProfile = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<WorkProfile | null>(null);
  const [formData, setFormData] = useState({
    profile_name: '',
    person_name: '',
    profile_type: 'Standard',
    calories_required: 0,
    age: 0,
    weight: 0,
    bmi: 0,
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['work-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_profiles')
        .select('*')
        .order('profile_name');
      
      if (error) throw error;
      return data as WorkProfile[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('work_profiles')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-profiles'] });
      toast.success('Work profile created successfully');
      setIsDialogOpen(false);
      setFormData({ profile_name: '', person_name: '', profile_type: 'Standard', calories_required: 0, age: 0, weight: 0, bmi: 0 });
    },
    onError: (error) => {
      toast.error('Failed to create work profile');
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('work_profiles')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-profiles'] });
      toast.success('Work profile updated successfully');
      setIsDialogOpen(false);
      setEditingProfile(null);
      setFormData({ profile_name: '', person_name: '', profile_type: 'Standard', calories_required: 0, age: 0, weight: 0, bmi: 0 });
    },
    onError: (error) => {
      toast.error('Failed to update work profile');
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('work_profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-profiles'] });
      toast.success('Work profile deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete work profile');
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.profile_name || formData.calories_required <= 0) {
      toast.error('Please fill all fields correctly');
      return;
    }

    if (editingProfile) {
      updateMutation.mutate({ id: editingProfile.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (profile: WorkProfile) => {
    setEditingProfile(profile);
    setFormData({
      profile_name: profile.profile_name,
      person_name: profile.person_name || '',
      profile_type: profile.profile_type || 'Standard',
      calories_required: profile.calories_required,
      age: profile.age || 0,
      weight: profile.weight || 0,
      bmi: profile.bmi || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this work profile?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingProfile(null);
    setFormData({ profile_name: '', person_name: '', profile_type: 'Standard', calories_required: 0, age: 0, weight: 0, bmi: 0 });
  };

  return (
    <Navigation>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Work Profiles</h1>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Profile
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProfile ? 'Edit' : 'Add'} Work Profile</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="person_name">Person Name</Label>
                    <Input
                      id="person_name"
                      value={formData.person_name}
                      onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                      placeholder="e.g., John Smith"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile_name">Profile Name</Label>
                    <Input
                      id="profile_name"
                      value={formData.profile_name}
                      onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
                      placeholder="e.g., Active Professional"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="profile_type">Type of Profile</Label>
                    <Input
                      id="profile_type"
                      value={formData.profile_type}
                      onChange={(e) => setFormData({ ...formData, profile_type: e.target.value })}
                      placeholder="e.g., Active, Sedentary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="calories_required">Calories Required</Label>
                    <Input
                      id="calories_required"
                      type="number"
                      value={formData.calories_required}
                      onChange={(e) => setFormData({ ...formData, calories_required: Number(e.target.value) })}
                      placeholder="e.g., 2000"
                      required
                      min="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                      placeholder="e.g., 30"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                      placeholder="e.g., 70"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bmi">BMI</Label>
                    <Input
                      id="bmi"
                      type="number"
                      step="0.1"
                      value={formData.bmi}
                      onChange={(e) => setFormData({ ...formData, bmi: Number(e.target.value) })}
                      placeholder="e.g., 22.5"
                      required
                      min="0"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingProfile ? 'Update' : 'Create'} Profile
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person Name</TableHead>
                  <TableHead>Profile Name</TableHead>
                  <TableHead>Type of Profile</TableHead>
                  <TableHead>Calories Required</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>BMI</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles && profiles.length > 0 ? (
                  profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.person_name || '-'}</TableCell>
                      <TableCell>{profile.profile_name}</TableCell>
                      <TableCell>{profile.profile_type || '-'}</TableCell>
                      <TableCell>{profile.calories_required} kcal</TableCell>
                      <TableCell>{profile.age || '-'}</TableCell>
                      <TableCell>{profile.weight || '-'}</TableCell>
                      <TableCell>{profile.bmi || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(profile)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(profile.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No work profiles found. Add your first profile to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Navigation>
  );
};

export default WorkProfile;
