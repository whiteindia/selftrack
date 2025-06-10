
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MessageSquare } from 'lucide-react';
import ManualTimeLog from './ManualTimeLog';

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
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId, onUpdate }) => {
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

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'In progress...';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading time entries...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <MessageSquare className="h-4 w-4 mr-1" />
          Work History
        </h4>
        <ManualTimeLog taskId={taskId} onSuccess={() => onUpdate?.()} />
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
