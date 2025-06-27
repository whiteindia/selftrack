
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Square, Clock, Pause } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { logTimeEntry, logTimerStarted, logTimerStopped } from '@/utils/activityLogger';

interface Task {
  id: string;
  name: string;
}

interface TimeTrackerWithCommentProps {
  task: Task;
  onSuccess: () => void;
  isSubtask?: boolean;
}

interface ActiveTimer {
  id: string;
  taskId: string;
  startTime: Date;
  entryId: string;
  isPaused: boolean;
  pausedDuration: number; // Total paused time in seconds
}

const TimeTrackerWithComment: React.FC<TimeTrackerWithCommentProps> = ({ 
  task, 
  onSuccess, 
  isSubtask = false 
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);

  // Check if there's an existing active timer for this task
  useEffect(() => {
    const checkActiveTimer = async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', task.id)
        .eq('entry_type', isSubtask ? 'subtask' : 'task')
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        const entry = data[0];
        setActiveTimer({
          id: entry.id,
          taskId: task.id,
          startTime: new Date(entry.start_time),
          entryId: entry.id,
          isPaused: false,
          pausedDuration: 0
        });
      }
    };

    checkActiveTimer();
  }, [task.id, isSubtask]);

  // Update elapsed time every second when timer is active and not paused
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTimer && !activeTimer.isPaused) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - activeTimer.startTime.getTime()) / 1000) - activeTimer.pausedDuration;
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      // First, get current user's employee record
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();
      
      if (empError || !employee) {
        throw new Error('Employee record not found. Please contact admin.');
      }

      // Get task/subtask details for activity logging
      let taskDetails;
      if (isSubtask) {
        const { data: subtaskData, error: subtaskError } = await supabase
          .from('subtasks')
          .select(`
            name,
            tasks!inner(
              name,
              projects!inner(name)
            )
          `)
          .eq('id', task.id)
          .single();

        if (subtaskError) {
          throw new Error('Failed to fetch subtask details');
        }
        taskDetails = subtaskData;
      } else {
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select(`
            name,
            projects(name)
          `)
          .eq('id', task.id)
          .single();

        if (taskError) {
          throw new Error('Failed to fetch task details');
        }
        taskDetails = taskData;
      }

      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          task_id: task.id,
          employee_id: employee.id,
          start_time: new Date().toISOString(),
          entry_type: isSubtask ? 'subtask' : 'task'
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Log timer started activity
      const projectName = isSubtask ? taskDetails.tasks?.projects?.name : taskDetails.projects?.name;
      await logTimerStarted(task.name, task.id, projectName);
      
      return { data, projectName };
    },
    onSuccess: async (result) => {
      setActiveTimer({
        id: result.data.id,
        taskId: task.id,
        startTime: new Date(result.data.start_time),
        entryId: result.data.id,
        isPaused: false,
        pausedDuration: 0
      });
      setElapsedTime(0);
      
      // Aggressively invalidate and refetch dashboard queries
      await queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
      await queryClient.refetchQueries({ queryKey: ['running-tasks'] });
      
      toast.success('Timer started!');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Failed to start timer: ' + error.message);
    }
  });

  const resumeTimerMutation = useMutation({
    mutationFn: async () => {
      // Just resume the timer - no database update needed
      if (!activeTimer || !pauseStartTime) return;
      
      // Calculate how long we were paused and add to total paused duration
      const pauseDuration = Math.floor((new Date().getTime() - pauseStartTime.getTime()) / 1000);
      
      return {
        pausedDuration: activeTimer.pausedDuration + pauseDuration
      };
    },
    onSuccess: (result) => {
      if (activeTimer && result) {
        setActiveTimer({
          ...activeTimer,
          isPaused: false,
          pausedDuration: result.pausedDuration
        });
        setPauseStartTime(null);
        toast.success('Timer resumed!');
      }
    },
    onError: (error) => {
      toast.error('Failed to resume timer: ' + error.message);
    }
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!activeTimer) throw new Error('No active timer');
      
      // Get task/subtask details for activity logging
      let taskDetails;
      if (isSubtask) {
        const { data: subtaskData, error: subtaskError } = await supabase
          .from('subtasks')
          .select(`
            name,
            tasks!inner(
              name,
              projects!inner(name)
            )
          `)
          .eq('id', task.id)
          .single();

        if (subtaskError) {
          throw new Error('Failed to fetch subtask details');
        }
        taskDetails = subtaskData;
      } else {
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select(`
            name,
            projects(name)
          `)
          .eq('id', task.id)
          .single();

        if (taskError) {
          throw new Error('Failed to fetch task details');
        }
        taskDetails = taskData;
      }
      
      const endTime = new Date();
      const totalElapsedMs = endTime.getTime() - activeTimer.startTime.getTime();
      const totalPausedMs = activeTimer.pausedDuration * 1000;
      
      // If currently paused, add current pause duration
      let finalPausedMs = totalPausedMs;
      if (activeTimer.isPaused && pauseStartTime) {
        finalPausedMs += endTime.getTime() - pauseStartTime.getTime();
      }
      
      const actualWorkingMs = totalElapsedMs - finalPausedMs;
      const durationMinutes = Math.floor(actualWorkingMs / 60000);
      
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          comment: commentText || null
        })
        .eq('id', activeTimer.entryId)
        .select()
        .single();
      
      if (error) throw error;
      
      const projectName = isSubtask ? taskDetails.tasks?.projects?.name : taskDetails.projects?.name;
      return { data, projectName };
    },
    onSuccess: async (result) => {
      // Clear local state immediately
      setActiveTimer(null);
      setElapsedTime(0);
      setComment('');
      setShowCommentDialog(false);
      setPauseStartTime(null);
      
      // Log time entry and timer stopped activities
      const hours = Math.floor((result.data.duration_minutes || 0) / 60);
      const minutes = (result.data.duration_minutes || 0) % 60;
      const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      
      await logTimeEntry(task.name, task.id, durationText, result.data.comment || undefined, result.projectName);
      await logTimerStopped(task.name, task.id, durationText, result.projectName);
      
      // Aggressively clear and refetch dashboard queries multiple times to ensure update
      await queryClient.removeQueries({ queryKey: ['running-tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
      
      // Wait a moment and refetch again to ensure consistency
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['running-tasks'] });
      }, 500);
      
      toast.success('Timer stopped!');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Failed to stop timer: ' + error.message);
    }
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    startTimerMutation.mutate();
  };

  const handlePause = () => {
    if (!activeTimer) return;
    
    if (activeTimer.isPaused) {
      // Resume the timer
      resumeTimerMutation.mutate();
    } else {
      // Pause the timer
      setActiveTimer({
        ...activeTimer,
        isPaused: true
      });
      setPauseStartTime(new Date());
      toast.success('Timer paused!');
    }
  };

  const handleStop = () => {
    setShowCommentDialog(true);
  };

  const handleStopWithComment = () => {
    stopTimerMutation.mutate(comment);
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {!activeTimer ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleStart}
            disabled={startTimerMutation.isPending}
          >
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePause}
              disabled={resumeTimerMutation.isPending}
            >
              {activeTimer.isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleStop}
              disabled={stopTimerMutation.isPending}
            >
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
            <div className="flex items-center text-sm font-mono">
              <Clock className="h-4 w-4 mr-1" />
              <span className={activeTimer.isPaused ? "text-yellow-600" : "text-blue-600"}>
                {formatTime(elapsedTime)}
              </span>
              {activeTimer.isPaused && (
                <span className="ml-1 text-xs text-yellow-600">(Paused)</span>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Work Comment</DialogTitle>
            <DialogDescription>
              Add a comment describing the work completed during this time session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workComment">Work Description (Optional)</Label>
              <Input
                id="workComment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe what you worked on..."
                className="min-h-[80px]"
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleStopWithComment}
                disabled={stopTimerMutation.isPending}
                className="flex-1"
              >
                {stopTimerMutation.isPending ? 'Stopping...' : 'Stop Timer'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCommentDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TimeTrackerWithComment;
