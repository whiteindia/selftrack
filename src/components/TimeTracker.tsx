
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square, Pause } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logTimerStarted, logTimerStopped, logTimeEntry } from '@/utils/activityLogger';

interface TimeTrackerProps {
  taskId: string;
  taskName: string;
  projectName?: string;
  employeeId: string;
  initialTimeEntry: any;
}

interface ActiveTimer {
  id: string;
  taskId: string;
  startTime: Date;
  entryId: string;
  isPaused: boolean;
  pausedDuration: number;
  pauseStartTime?: Date;
}

const TimeTracker = ({ taskId, taskName, projectName, employeeId, initialTimeEntry }: TimeTrackerProps) => {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  // Helper function to parse pause information from comment
  const parsePauseInfo = (comment: string | null) => {
    if (!comment) return { isPaused: false, totalPausedMs: 0, lastPauseTime: undefined };
    
    const pauseMatches = [...comment.matchAll(/Timer paused at ([^,\n]+)/g)];
    const resumeMatches = [...comment.matchAll(/Timer resumed at ([^,\n]+)/g)];
    
    let totalPausedMs = 0;
    let isPaused = false;
    let lastPauseTime: Date | undefined;
    
    // Calculate total paused time from completed pause/resume cycles
    for (let i = 0; i < Math.min(pauseMatches.length, resumeMatches.length); i++) {
      const pauseTime = new Date(pauseMatches[i][1]);
      const resumeTime = new Date(resumeMatches[i][1]);
      totalPausedMs += resumeTime.getTime() - pauseTime.getTime();
    }
    
    // Check if currently paused (more pauses than resumes)
    if (pauseMatches.length > resumeMatches.length) {
      isPaused = true;
      lastPauseTime = new Date(pauseMatches[pauseMatches.length - 1][1]);
      
      // Add current pause duration to total if currently paused
      if (lastPauseTime) {
        const currentPauseDuration = new Date().getTime() - lastPauseTime.getTime();
        totalPausedMs += currentPauseDuration;
      }
    }
    
    return { isPaused, totalPausedMs, lastPauseTime };
  };

  useEffect(() => {
    if (initialTimeEntry && !initialTimeEntry.end_time) {
      const pauseInfo = parsePauseInfo(initialTimeEntry.comment);
      
      setActiveTimer({
        id: initialTimeEntry.id,
        taskId: taskId,
        startTime: new Date(initialTimeEntry.start_time),
        entryId: initialTimeEntry.id,
        isPaused: pauseInfo.isPaused,
        pausedDuration: pauseInfo.totalPausedMs / 1000,
        pauseStartTime: pauseInfo.isPaused ? pauseInfo.lastPauseTime : undefined
      });

      // Calculate initial elapsed time
      if (!pauseInfo.isPaused) {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - new Date(initialTimeEntry.start_time).getTime()) / 1000) - (pauseInfo.totalPausedMs / 1000);
        setElapsedTime(Math.max(0, elapsed));
      } else {
        // If paused, calculate elapsed time up to pause point
        const elapsed = Math.floor((pauseInfo.lastPauseTime!.getTime() - new Date(initialTimeEntry.start_time).getTime()) / 1000) - (pauseInfo.totalPausedMs / 1000);
        setElapsedTime(Math.max(0, elapsed));
      }
    }
  }, [initialTimeEntry, taskId]);

  // Update elapsed time every second when timer is active and not paused
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTimer && !activeTimer.isPaused) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - activeTimer.startTime.getTime()) / 1000) - activeTimer.pausedDuration;
        setElapsedTime(Math.max(0, elapsed));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          task_id: taskId,
          employee_id: employeeId,
          start_time: new Date().toISOString(),
          entry_type: 'task'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      setActiveTimer({
        id: data.id,
        taskId: taskId,
        startTime: new Date(data.start_time),
        entryId: data.id,
        isPaused: false,
        pausedDuration: 0
      });
      setElapsedTime(0);
      
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
      toast.success('Timer started!');
      
      await logTimerStarted(taskName, taskId, projectName);
    },
    onError: (error) => {
      toast.error('Failed to start timer: ' + error.message);
    }
  });

  const pauseTimerMutation = useMutation({
    mutationFn: async () => {
      if (!activeTimer) throw new Error('No active timer');
      
      const pauseTime = new Date().toISOString();
      const currentComment = await getCurrentComment(activeTimer.entryId);
      const newComment = currentComment ? `${currentComment}\nTimer paused at ${pauseTime}` : `Timer paused at ${pauseTime}`;
      
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          comment: newComment
        })
        .eq('id', activeTimer.entryId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      if (activeTimer) {
        setActiveTimer({
          ...activeTimer,
          isPaused: true,
          pauseStartTime: new Date()
        });
        
        queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
        toast.success('Timer paused!');
      }
    },
    onError: (error) => {
      toast.error('Failed to pause timer: ' + error.message);
    }
  });

  const resumeTimerMutation = useMutation({
    mutationFn: async () => {
      if (!activeTimer || !activeTimer.pauseStartTime) throw new Error('No paused timer');
      
      const pauseDuration = Math.floor((new Date().getTime() - activeTimer.pauseStartTime.getTime()) / 1000);
      const resumeTime = new Date().toISOString();
      const currentComment = await getCurrentComment(activeTimer.entryId);
      const newComment = currentComment ? `${currentComment}\nTimer resumed at ${resumeTime}` : `Timer resumed at ${resumeTime}`;
      
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          comment: newComment
        })
        .eq('id', activeTimer.entryId)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        pausedDuration: activeTimer.pausedDuration + pauseDuration
      };
    },
    onSuccess: async (result) => {
      if (activeTimer && result) {
        setActiveTimer({
          ...activeTimer,
          isPaused: false,
          pausedDuration: result.pausedDuration,
          pauseStartTime: undefined
        });
        
        queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
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
      
      const endTime = new Date();
      const totalElapsedMs = endTime.getTime() - activeTimer.startTime.getTime();
      
      // Calculate final paused duration
      let finalPausedMs = activeTimer.pausedDuration * 1000;
      if (activeTimer.isPaused && activeTimer.pauseStartTime) {
        finalPausedMs += endTime.getTime() - activeTimer.pauseStartTime.getTime();
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
      return { data, durationMinutes, comment: commentText };
    },
    onSuccess: async ({ data, durationMinutes, comment }) => {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const durationString = `${hours}h ${minutes}m`;
      
      setActiveTimer(null);
      setElapsedTime(0);
      setComment('');
      setIsCommentDialogOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
      
      toast.success(`Timer stopped! Duration: ${durationString}`);
      
      await logTimerStopped(taskName, taskId, durationString, projectName);
      if (comment) {
        await logTimeEntry(taskName, taskId, durationString, comment, projectName);
      }
    },
    onError: (error) => {
      toast.error('Failed to stop timer: ' + error.message);
      setIsCommentDialogOpen(false);
    }
  });

  // Helper function to get current comment
  const getCurrentComment = async (entryId: string): Promise<string> => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('comment')
      .eq('id', entryId)
      .single();
    
    if (error || !data) return '';
    return data.comment || '';
  };

  const formatElapsedTime = () => {
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    if (activeTimer) {
      setIsCommentDialogOpen(true);
    } else {
      startTimerMutation.mutate();
    }
  };

  const handlePauseResume = () => {
    if (!activeTimer) return;
    
    if (activeTimer.isPaused) {
      resumeTimerMutation.mutate();
    } else {
      pauseTimerMutation.mutate();
    }
  };

  const handleStopWithComment = () => {
    stopTimerMutation.mutate(comment);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Time Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-4xl font-bold">
              <span className={activeTimer?.isPaused ? 'text-yellow-600' : 'text-blue-600'}>
                {formatElapsedTime()}
              </span>
              {activeTimer?.isPaused && (
                <span className="text-sm ml-2 text-yellow-600">(Paused)</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleStartStop}
                disabled={startTimerMutation.isPending || stopTimerMutation.isPending}
              >
                {activeTimer ? (
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
              
              {activeTimer && (
                <Button
                  variant="outline"
                  onClick={handlePauseResume}
                  disabled={pauseTimerMutation.isPending || resumeTimerMutation.isPending}
                >
                  {activeTimer.isPaused ? (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          {projectName && (
            <p className="text-sm text-gray-500 mt-2">Project: {projectName}</p>
          )}
        </CardContent>
      </Card>

      {/* Comment Dialog */}
      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Add Time Entry Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                placeholder="What did you work on?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCommentDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStopWithComment}
                disabled={stopTimerMutation.isPending}
                className="w-full sm:w-auto"
              >
                {stopTimerMutation.isPending ? 'Stopping...' : 'Stop Timer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TimeTracker;
