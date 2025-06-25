
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ManualTimeLog from './ManualTimeLog';
import { logTimeEntry } from '@/utils/activity/taskActivity';

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  comment: string | null;
  created_at: string;
  employees: { name: string } | null;
}

interface TaskHistoryProps {
  taskId: string;
  onUpdate?: () => void;
  isSubtask?: boolean;
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId, onUpdate, isSubtask = false }) => {
  const queryClient = useQueryClient();
  
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['time-entries', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          employees(name)
        `)
        .eq('task_id', taskId)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data as TimeEntry[];
    }
  });

  // Delete time entry mutation
  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
      onUpdate?.();
      toast.success('Time entry deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete time entry: ' + error.message);
    }
  });

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'In progress...';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDeleteTimeEntry = (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this time entry?')) {
      deleteTimeEntryMutation.mutate(entryId);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading time entries...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <MessageSquare className="h-4 w-4 mr-1" />
          Work History ({timeEntries.length})
        </h4>
        <ManualTimeLog 
          taskId={taskId} 
          onSuccess={() => onUpdate?.()} 
          isSubtask={isSubtask}
        />
      </div>
      
      {timeEntries.length === 0 ? (
        <div className="text-sm text-gray-500 italic">
          No time entries yet. Start the timer or log time manually to track work.
        </div>
      ) : (
        timeEntries.map((entry) => (
          <Card key={entry.id} className="border-l-4 border-l-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(entry.duration_minutes)}</span>
                  <span>•</span>
                  <span>{entry.employees?.name || 'Unknown'}</span>
                  <span>•</span>
                  <span>{formatDateTime(entry.start_time)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTimeEntry(entry.id)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  disabled={deleteTimeEntryMutation.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {entry.comment && (
                <p className="text-sm text-gray-700">{entry.comment}</p>
              )}
              {!entry.end_time && (
                <div className="text-xs text-blue-600 font-medium mt-1">
                  Currently in progress...
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default TaskHistory;
