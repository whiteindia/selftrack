
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logProjectUpdated } from '@/utils/activityLogger';
import { useFileUpload } from './useFileUpload';
import type { UpdateProjectParams } from './types';

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { uploadBRDFile } = useFileUpload();

  return useMutation({
    mutationFn: async ({ id, updates, brdFile }: UpdateProjectParams) => {
      // Handle BRD file upload for edit
      if (brdFile) {
        try {
          const brdUrl = await uploadBRDFile(brdFile, id);
          updates.brd_file_url = brdUrl;
        } catch (uploadError) {
          console.error('BRD upload failed:', uploadError);
          toast.error('BRD upload failed');
          throw uploadError;
        }
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select('*, clients(name)')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated successfully!');
      
      // Log activity
      await logProjectUpdated(
        data.name,
        data.id,
        'project details',
        data.clients?.name || 'Unknown Client'
      );
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    }
  });
};
