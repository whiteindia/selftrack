
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logProjectCreated } from '@/utils/activityLogger';
import { useFileUpload } from './useFileUpload';
import type { CreateProjectParams } from './types';

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { uploadBRDFile } = useFileUpload();

  return useMutation({
    mutationFn: async ({ projectData, brdFile }: CreateProjectParams) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select('*, clients(name)')
        .single();
      
      if (error) throw error;
      
      // Upload BRD file if provided
      if (brdFile) {
        try {
          const brdUrl = await uploadBRDFile(brdFile, data.id);
          
          const { error: updateError } = await supabase
            .from('projects')
            .update({ brd_file_url: brdUrl })
            .eq('id', data.id);
          
          if (updateError) throw updateError;
        } catch (uploadError) {
          console.error('BRD upload failed:', uploadError);
          toast.error('Project created but BRD upload failed');
        }
      }
      
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
      
      // Log activity
      await logProjectCreated(
        data.name,
        data.id,
        data.clients?.name || 'Unknown Client'
      );
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    }
  });
};
