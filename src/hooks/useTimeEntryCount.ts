
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTimeEntryCount = (taskId: string) => {
  return useQuery({
    queryKey: ['time-entry-count', taskId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('time_entries')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId);
      
      if (error) throw error;
      return count || 0;
    }
  });
};
