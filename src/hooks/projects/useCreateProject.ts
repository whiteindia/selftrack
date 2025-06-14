
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
      console.log('=== CREATE PROJECT START ===');
      console.log('Project data:', projectData);
      console.log('BRD file:', brdFile ? 'Present' : 'None');
      
      // Get current user for debugging
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user creating project:', user?.email);
      
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select('*, clients(name)')
        .single();
      
      if (error) {
        console.error('=== CREATE PROJECT ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error hint:', error.hint);
        throw error;
      }
      
      console.log('Project created successfully:', data);
      
      // Upload BRD file if provided
      if (brdFile) {
        try {
          console.log('Uploading BRD file...');
          const brdUrl = await uploadBRDFile(brdFile, data.id);
          
          const { error: updateError } = await supabase
            .from('projects')
            .update({ brd_file_url: brdUrl })
            .eq('id', data.id);
          
          if (updateError) {
            console.error('BRD file URL update error:', updateError);
            throw updateError;
          }
          
          console.log('BRD file uploaded and URL updated successfully');
        } catch (uploadError) {
          console.error('BRD upload failed:', uploadError);
          toast.error('Project created but BRD upload failed');
        }
      }
      
      console.log('=== CREATE PROJECT END ===');
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
      console.error('=== CREATE PROJECT MUTATION ERROR ===');
      console.error('Full error object:', error);
      toast.error('Failed to create project: ' + error.message);
    }
  });
};
