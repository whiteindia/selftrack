
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, User, Pause, Square } from 'lucide-react';
import LiveTimer from './LiveTimer';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActiveTimeTrackingProps {
  runningTasks: any[];
  isError: boolean;
  onRunningTaskClick: () => void;
}

const ActiveTimeTracking: React.FC<ActiveTimeTrackingProps> = ({
  runningTasks,
  isError,
  onRunningTaskClick
}) => {
  const queryClient = useQueryClient();

  const stopTimerMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const endTime = new Date();
      const { data: entry } = await supabase
        .from('time_entries')
        .select('start_time')
        .eq('id', entryId)
        .single();
      
      if (!entry) throw new Error('Entry not found');
      
      const startTime = new Date(entry.start_time);
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
      
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          comment: 'Stopped from dashboard'
        })
        .eq('id', entryId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
      toast.success('Timer stopped!');
    },
    onError: (error: any) => {
      toast.error('Failed to stop timer: ' + error.message);
    }
  });

  const pauseTimerMutation = useMutation({
    mutationFn: async (entryId: string) => {
      // For pause, we just update a pause timestamp in the comment or a custom field
      // This is a simple pause implementation - in a full implementation you might want a separate pause table
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          comment: `Paused at ${new Date().toISOString()}`
        })
        .eq('id', entryId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
      toast.success('Timer paused!');
    },
    onError: (error: any) => {
      toast.error('Failed to pause timer: ' + error.message);
    }
  });

  const resumeTimerMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          comment: `Resumed at ${new Date().toISOString()}`
        })
        .eq('id', entryId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
      toast.success('Timer resumed!');
    },
    onError: (error: any) => {
      toast.error('Failed to resume timer: ' + error.message);
    }
  });

  const handleStopTimer = (entryId: string) => {
    stopTimerMutation.mutate(entryId);
  };

  const handlePauseTimer = (entryId: string) => {
    pauseTimerMutation.mutate(entryId);
  };

  const handleResumeTimer = (entryId: string) => {
    resumeTimerMutation.mutate(entryId);
  };

  const isPaused = (entry: any) => {
    return entry.comment?.includes('Paused at') && !entry.comment?.includes('Resumed at');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Play className="h-5 w-5 mr-2 text-green-600" />
          Active Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {runningTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No tasks currently running</p>
            <p className="text-sm">Start a timer on any task to track your work</p>
          </div>
        ) : (
          <div className="space-y-3">
            {runningTasks.map((entry: any) => (
              <div
                key={entry.id}
                className="p-4 border rounded-lg bg-green-50 border-green-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900">{entry.tasks.name}</h4>
                    <p className="text-sm text-green-700">
                      {entry.tasks.projects.name} • {entry.tasks.projects.clients.name}
                    </p>
                    <div className="flex items-center mt-1 text-sm text-green-600">
                      <User className="h-3 w-3 mr-1" />
                      <span>{entry.employee?.name || 'Unknown User'}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <Badge variant="default" className={isPaused(entry) ? "bg-yellow-600" : "bg-green-600"}>
                        {isPaused(entry) ? 'Paused' : 'Running'}
                      </Badge>
                      <div className="mt-1">
                        <LiveTimer startTime={entry.start_time} />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {isPaused(entry) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResumeTimer(entry.id)}
                          disabled={resumeTimerMutation.isPending}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePauseTimer(entry.id)}
                          disabled={pauseTimerMutation.isPending}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStopTimer(entry.id)}
                        disabled={stopTimerMutation.isPending}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={onRunningTaskClick}
            >
              View All In Progress Tasks
            </Button>
          </div>
        )}
        {isError && <p className="text-xs text-red-500 mt-1">Error loading running tasks</p>}
      </CardContent>
    </Card>
  );
};

export default ActiveTimeTracking;
