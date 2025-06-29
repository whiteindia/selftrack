
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logActivity } from '@/utils/activityLogger';
import { Service, ServiceFormData } from '@/types/service';

export const useServices = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: ''
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Service[];
    }
  });

  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: {
      name: string;
      description: string;
      hourly_rate: number;
    }) => {
      const { data, error } = await supabase
        .from('services')
        .insert([serviceData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      resetForm();
      toast.success('Service created successfully!');
      
      await logActivity({
        action_type: 'created',
        entity_type: 'service',
        entity_id: data.id,
        entity_name: data.name,
        description: `Created new service: ${data.name}`,
        comment: `Service description: ${data.description || 'No description'}`
      });
    },
    onError: (error) => {
      toast.error('Failed to create service: ' + error.message);
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, ...serviceData }: {
      id: string;
      name: string;
      description: string;
      hourly_rate: number;
    }) => {
      const { data, error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      resetForm();
      toast.success('Service updated successfully!');
      
      await logActivity({
        action_type: 'updated',
        entity_type: 'service',
        entity_id: data.id,
        entity_name: data.name,
        description: `Updated service: ${data.name}`,
        comment: `Service description: ${data.description || 'No description'}`
      });
    },
    onError: (error) => {
      toast.error('Failed to update service: ' + error.message);
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: async (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted successfully!');
      
      const deletedService = services.find(s => s.id === deletedId);
      if (deletedService) {
        await logActivity({
          action_type: 'deleted',
          entity_type: 'service',
          entity_id: deletedService.id,
          entity_name: deletedService.name,
          description: `Deleted service: ${deletedService.name}`,
          comment: `Previous description: ${deletedService.description || 'No description'}`
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to delete service: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingService(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Please fill in the service name');
      return;
    }

    const serviceData = {
      name: formData.name,
      description: formData.description,
      hourly_rate: 0 // Default value since it's required in the database
    };

    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, ...serviceData });
    } else {
      createServiceMutation.mutate(serviceData);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      deleteServiceMutation.mutate(id);
    }
  };

  const openCreateDialog = () => {
    setEditingService(null);
    resetForm();
    setIsDialogOpen(true);
  };

  return {
    services,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    editingService,
    formData,
    setFormData,
    handleSubmit,
    handleEdit,
    handleDelete,
    openCreateDialog,
    resetForm,
    isSubmitting: createServiceMutation.isPending || updateServiceMutation.isPending
  };
};
