
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Subtask {
  id: string;
  name: string;
  status: string;
  hours: number;
  date: string;
  deadline: string | null;
  estimated_duration: number | null;
  completion_date: string | null;
  assignee_id: string | null;
  assigner_id: string | null;
  task_id: string;
  assignee: {
    name: string;
  } | null;
  assigner: {
    name: string;
  } | null;
  total_logged_hours?: number;
}

export const useSubtasks = (taskId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch subtasks for a specific task
  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      console.log('Fetching subtasks for task:', taskId);
      
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks' as any)
        .select(`
          *,
          assignee:employees!assignee_id (
            name
          ),
          assigner:employees!assigner_id (
            name
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (subtasksError) {
        console.error('Error fetching subtasks:', subtasksError);
        throw subtasksError;
      }

      // Calculate total logged hours for each subtask
      const subtasksWithHours = await Promise.all(
        (subtasksData || []).map(async (subtask: any) => {
          const { data: timeEntries, error: timeError } = await supabase
            .from('time_entries')
            .select('duration_minutes')
            .eq('task_id', subtask.id)
            .not('end_time', 'is', null);

          if (timeError) {
            console.error('Error fetching time entries for subtask:', timeError);
          }

          const totalMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
          const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

          return {
            ...subtask,
            total_logged_hours: totalHours
          };
        })
      );

      return subtasksWithHours as Subtask[];
    },
    enabled: !!taskId
  });

  // Create subtask mutation
  const createSubtaskMutation = useMutation({
    mutationFn: async (subtaskData: any) => {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();
      
      if (empError || !employee) {
        throw new Error('Employee record not found');
      }

      const { data, error } = await supabase
        .from('subtasks' as any)
        .insert([{
          ...subtaskData,
          assigner_id: employee.id,
          deadline: subtaskData.deadline || null,
          estimated_duration: subtaskData.estimated_duration ? parseFloat(subtaskData.estimated_duration) : null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Subtask created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create subtask: ' + error.message);
    }
  });

  // Update subtask mutation
  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('subtasks' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Subtask updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update subtask: ' + error.message);
    }
  });

  // Delete subtask mutation
  const deleteSubtaskMutation = useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await supabase
        .from('subtasks' as any)
        .delete()
        .eq('id', subtaskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Subtask deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete subtask: ' + error.message);
    }
  });

  return {
    subtasks,
    isLoading,
    createSubtaskMutation,
    updateSubtaskMutation,
    deleteSubtaskMutation
  };
};
