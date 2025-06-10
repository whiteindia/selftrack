
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logProjectDeleted } from '@/utils/activityLogger';

interface DeleteProjectResult {
  deletedProjectId: string;
  projectName: string;
  clientName: string;
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteProjectResult, Error, string>({
    mutationFn: async (projectId: string): Promise<DeleteProjectResult> => {
      // First get the project details for logging
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('name, clients(name)')
        .eq('id', projectId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete all tasks associated with this project
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId);
      
      if (tasksError) throw tasksError;
      
      // Delete all time entries for tasks in this project
      const { error: timeEntriesError } = await supabase
        .from('time_entries')
        .delete()
        .in('task_id', [projectId]); // This might need adjustment based on your data structure
      
      if (timeEntriesError) {
        console.warn('Error deleting time entries:', timeEntriesError);
      }
      
      // Delete the project
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (deleteError) throw deleteError;
      
      return {
        deletedProjectId: projectId,
        projectName: project.name,
        clientName: project.clients?.name || 'Unknown Client'
      };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Project and all related data deleted successfully!');
      
      // Log activity
      await logProjectDeleted(
        data.projectName,
        data.deletedProjectId,
        data.clientName
      );
    },
    onError: (error) => {
      toast.error('Failed to delete project: ' + error.message);
    }
  });
};
