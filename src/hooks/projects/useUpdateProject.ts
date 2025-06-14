
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
      console.log('=== UPDATE PROJECT START ===');
      console.log('Project ID:', id);
      console.log('Updates:', updates);
      console.log('BRD file:', brdFile ? 'Present' : 'None');
      
      // Get current user for debugging
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user updating project:', user?.email);
      
      // Handle BRD file upload for edit
      if (brdFile) {
        try {
          console.log('Uploading BRD file for update...');
          const brdUrl = await uploadBRDFile(brdFile, id);
          updates.brd_file_url = brdUrl;
          console.log('BRD file uploaded, URL added to updates:', brdUrl);
        } catch (uploadError) {
          console.error('BRD upload failed during update:', uploadError);
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
      
      if (error) {
        console.error('=== UPDATE PROJECT ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error hint:', error.hint);
        throw error;
      }
      
      console.log('Project updated successfully:', data);
      console.log('=== UPDATE PROJECT END ===');
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
      console.error('=== UPDATE PROJECT MUTATION ERROR ===');
      console.error('Full error object:', error);
      toast.error('Failed to update project: ' + error.message);
    }
  });
};
