import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logTimerStarted, logTimerStopped } from '@/utils/activityLogger';

interface TimeTrackerProps {
  taskId: string;
  taskName: string;
  projectName?: string;
  employeeId: string;
  initialTimeEntry: any;
}

interface TimeEntry {
  id: string;
  task_id: string;
  employee_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
}

const TimeTracker = ({ taskId, taskName, projectName, employeeId, initialTimeEntry }: TimeTrackerProps) => {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(initialTimeEntry);
  const queryClient = useQueryClient();

  useEffect(() => {
    setActiveEntry(initialTimeEntry);
    if (initialTimeEntry) {
      setIsActive(true);
      setStartTime(new Date(initialTimeEntry.start_time));
    }
  }, [initialTimeEntry]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isActive && startTime) {
      intervalId = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      clearInterval(intervalId);
    }

    return () => clearInterval(intervalId);
  }, [isActive, startTime]);

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          task_id: taskId,
          employee_id: employeeId,
          start_time: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      setActiveEntry(data);
      setStartTime(new Date(data.start_time));
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
      toast.success('Timer started!');
      
      // Log activity
      await logTimerStarted(taskName, taskId, projectName);
    },
    onError: (error) => {
      toast.error('Failed to start timer: ' + error.message);
    }
  });

  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      if (!activeEntry) throw new Error('No active timer');
      
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime!.getTime()) / 60000);
      
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes
        })
        .eq('id', activeEntry.id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, durationMinutes };
    },
    onSuccess: async ({ data, durationMinutes }) => {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const durationString = `${hours}h ${minutes}m`;
      
      setActiveEntry(null);
      setStartTime(null);
      setElapsedTime(0);
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
      toast.success(`Timer stopped! Duration: ${durationString}`);
      
      // Log activity
      await logTimerStopped(taskName, taskId, durationString, projectName);
    },
    onError: (error) => {
      toast.error('Failed to stop timer: ' + error.message);
    }
  });

  const handleStartStop = () => {
    if (isActive) {
      stopTimerMutation.mutate();
      setIsActive(false);
    } else {
      startTimerMutation.mutate();
      setIsActive(true);
    }
  };

  const formatElapsedTime = () => {
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-4xl font-bold">
            {formatElapsedTime()}
          </div>
          <Button
            variant="outline"
            onClick={handleStartStop}
            disabled={startTimerMutation.isPending || stopTimerMutation.isPending}
          >
            {isActive ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start
              </>
            )}
          </Button>
        </div>
        {projectName && (
          <p className="text-sm text-gray-500 mt-2">Project: {projectName}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeTracker;
