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
  calories_required: number;
}

const WorkProfile = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<WorkProfile | null>(null);
  const [formData, setFormData] = useState({
    profile_name: '',
    calories_required: 0,
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
    mutationFn: async (data: { profile_name: string; calories_required: number }) => {
      const { error } = await supabase
        .from('work_profiles')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-profiles'] });
      toast.success('Work profile created successfully');
      setIsDialogOpen(false);
      setFormData({ profile_name: '', calories_required: 0 });
    },
    onError: (error) => {
      toast.error('Failed to create work profile');
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { profile_name: string; calories_required: number } }) => {
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
      setFormData({ profile_name: '', calories_required: 0 });
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
      calories_required: profile.calories_required,
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
    setFormData({ profile_name: '', calories_required: 0 });
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
                <div>
                  <Label htmlFor="profile_name">Profile Name</Label>
                  <Input
                    id="profile_name"
                    value={formData.profile_name}
                    onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
                    placeholder="e.g., Software Engineer"
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
                  <TableHead>Profile</TableHead>
                  <TableHead>Calories Required</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles && profiles.length > 0 ? (
                  profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.profile_name}</TableCell>
                      <TableCell>{profile.calories_required} kcal</TableCell>
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
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
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
