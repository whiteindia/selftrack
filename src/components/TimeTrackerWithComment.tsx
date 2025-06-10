
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Square, Clock } from 'lucide-react';
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
}

interface ActiveTimer {
  id: string;
  taskId: string;
  startTime: Date;
  entryId: string;
}

const TimeTrackerWithComment: React.FC<TimeTrackerWithCommentProps> = ({ task, onSuccess }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [comment, setComment] = useState('');

  // Check if there's an existing active timer for this task
  useEffect(() => {
    const checkActiveTimer = async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', task.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        const entry = data[0];
        setActiveTimer({
          id: entry.id,
          taskId: task.id,
          startTime: new Date(entry.start_time),
          entryId: entry.id
        });
      }
    };

    checkActiveTimer();
  }, [task.id]);

  // Update elapsed time every second when timer is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTimer) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - activeTimer.startTime.getTime()) / 1000);
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

      // Get task and project details for activity logging
      const { data: taskDetails, error: taskError } = await supabase
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

      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          task_id: task.id,
          employee_id: employee.id,
          start_time: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Log timer started activity
      await logTimerStarted(task.name, task.id, taskDetails.projects?.name);
      
      return { data, projectName: taskDetails.projects?.name };
    },
    onSuccess: async (result) => {
      setActiveTimer({
        id: result.data.id,
        taskId: task.id,
        startTime: new Date(result.data.start_time),
        entryId: result.data.id
      });
      setElapsedTime(0);
      
      toast.success('Timer started!');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Failed to start timer: ' + error.message);
    }
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!activeTimer) throw new Error('No active timer');
      
      // Get task and project details for activity logging
      const { data: taskDetails, error: taskError } = await supabase
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
      
      const endTime = new Date();
      const durationMinutes = Math.floor((endTime.getTime() - activeTimer.startTime.getTime()) / 60000);
      
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
      
      return { data, projectName: taskDetails.projects?.name };
    },
    onSuccess: async (result) => {
      setActiveTimer(null);
      setElapsedTime(0);
      setComment('');
      setShowCommentDialog(false);
      
      // Log time entry and timer stopped activities
      const hours = Math.floor((result.data.duration_minutes || 0) / 60);
      const minutes = (result.data.duration_minutes || 0) % 60;
      const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      
      await logTimeEntry(task.name, task.id, durationText, result.data.comment || undefined, result.projectName);
      await logTimerStopped(task.name, task.id, durationText, result.projectName);
      
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

  const handleStartStop = () => {
    if (activeTimer) {
      setShowCommentDialog(true);
    } else {
      startTimerMutation.mutate();
    }
  };

  const handleStopWithComment = () => {
    stopTimerMutation.mutate(comment);
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant={activeTimer ? "destructive" : "outline"}
          onClick={handleStartStop}
          disabled={startTimerMutation.isPending || stopTimerMutation.isPending}
        >
          {activeTimer ? (
            <>
              <Square className="h-4 w-4 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" />
              Start
            </>
          )}
        </Button>
        
        {activeTimer && (
          <div className="flex items-center text-sm text-blue-600 font-mono">
            <Clock className="h-4 w-4 mr-1" />
            {formatTime(elapsedTime)}
          </div>
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
