import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface TaskTimerProps {
  taskId: string;
  taskName: string;
  onTimeUpdate?: () => void;
  isSubtask?: boolean;
}

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  pausedDuration: number; // in milliseconds
  elapsedTime: number; // in seconds
}

const TaskTimer: React.FC<TaskTimerProps> = ({ 
  taskId, 
  taskName, 
  onTimeUpdate,
  isSubtask = false
}) => {
  const { user } = useAuth();
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    startTime: null,
    pausedDuration: 0,
    elapsedTime: 0
  });
  const [showStopModal, setShowStopModal] = useState(false);
  const [workComment, setWorkComment] = useState('');
  const [currentTimeEntryId, setCurrentTimeEntryId] = useState<string | null>(null);

  // Check for existing running timer on component mount
  useEffect(() => {
    checkExistingTimer();
  }, [taskId]);

  // Timer update effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - timerState.startTime!.getTime() - timerState.pausedDuration) / 1000);
        setTimerState(prev => ({ ...prev, elapsedTime: Math.max(0, elapsed) }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState.isRunning, timerState.isPaused, timerState.startTime, timerState.pausedDuration]);

  // Helper function to parse pause information from timer_metadata
  const parsePauseInfo = (timerMetadata: string | null) => {
    if (!timerMetadata) return { isPaused: false, totalPausedMs: 0, lastPauseTime: undefined };
    
    const pauseMatches = [...timerMetadata.matchAll(/Timer paused at ([^,\n]+)/g)];
    const resumeMatches = [...timerMetadata.matchAll(/Timer resumed at ([^,\n]+)/g)];
    
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

  // Helper function to get current timer metadata
  const getCurrentTimerMetadata = async (entryId: string): Promise<string> => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('timer_metadata')
      .eq('id', entryId)
      .single();
    
    if (error || !data) return '';
    return data.timer_metadata || '';
  };

  const checkExistingTimer = async () => {
    try {
      const { data: existingEntry, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId)
        .eq('entry_type', isSubtask ? 'subtask' : 'task')
        .is('end_time', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking existing timer:', error);
        return;
      }

      if (existingEntry) {
        // Parse existing timer data
        const startTime = new Date(existingEntry.start_time);
        const pauseInfo = parsePauseInfo(existingEntry.timer_metadata);
        
        let pausedDuration = pauseInfo.totalPausedMs;
        let isPaused = pauseInfo.isPaused;

        // Calculate current elapsed time
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime() - pausedDuration) / 1000);

        setTimerState({
          isRunning: true,
          isPaused,
          startTime,
          pausedDuration,
          elapsedTime: Math.max(0, elapsed)
        });
        setCurrentTimeEntryId(existingEntry.id);
      }
    } catch (error) {
      console.error('Error checking existing timer:', error);
    }
  };

  const updateTaskStatusToInProgress = async () => {
    try {
      // First check current task status
      const { data: taskData, error: fetchError } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', taskId)
        .single();

      if (fetchError) {
        console.error('Error fetching task status:', fetchError);
        return;
      }

      // Only update if status is not already "In Progress"
      if (taskData.status !== 'In Progress') {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ status: 'In Progress' })
          .eq('id', taskId);

        if (updateError) {
          console.error('Error updating task status:', updateError);
          toast.error('Failed to update task status');
        } else {
          console.log('Task status updated to In Progress');
          if (onTimeUpdate) {
            onTimeUpdate();
          }
        }
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const startTimer = async () => {
    try {
      // Get current employee ID
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();

      if (empError || !employee) {
        toast.error('Employee record not found');
        return;
      }

      const startTime = new Date();
      
      // Create new time entry with timer metadata
      const { data: timeEntry, error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          employee_id: employee.id,
          start_time: startTime.toISOString(),
          entry_type: isSubtask ? 'subtask' : 'task',
          timer_metadata: `Timer started for task: ${taskName}`
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to start timer: ' + error.message);
        return;
      }

      setTimerState({
        isRunning: true,
        isPaused: false,
        startTime,
        pausedDuration: 0,
        elapsedTime: 0
      });
      setCurrentTimeEntryId(timeEntry.id);
      
      // Update task status to "In Progress" if not already
      await updateTaskStatusToInProgress();
      
      toast.success('Timer started!');
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('Failed to start timer');
    }
  };

  const pauseTimer = async () => {
    if (!currentTimeEntryId) return;

    try {
      const pauseTime = new Date().toISOString();
      const currentMetadata = await getCurrentTimerMetadata(currentTimeEntryId);
      const newMetadata = currentMetadata ? `${currentMetadata}\nTimer paused at ${pauseTime}` : `Timer paused at ${pauseTime}`;
      
      // Update time entry with pause information in timer_metadata
      const { error } = await supabase
        .from('time_entries')
        .update({
          timer_metadata: newMetadata
        })
        .eq('id', currentTimeEntryId);

      if (error) {
        toast.error('Failed to pause timer: ' + error.message);
        return;
      }

      setTimerState(prev => ({ ...prev, isPaused: true }));
      toast.success('Timer paused');
    } catch (error) {
      console.error('Error pausing timer:', error);
      toast.error('Failed to pause timer');
    }
  };

  const resumeTimer = async () => {
    if (!currentTimeEntryId) return;

    try {
      const resumeTime = new Date().toISOString();
      const currentMetadata = await getCurrentTimerMetadata(currentTimeEntryId);
      const newMetadata = currentMetadata ? `${currentMetadata}\nTimer resumed at ${resumeTime}` : `Timer resumed at ${resumeTime}`;
      
      const { error } = await supabase
        .from('time_entries')
        .update({ timer_metadata: newMetadata })
        .eq('id', currentTimeEntryId);

      if (error) {
        toast.error('Failed to resume timer: ' + error.message);
        return;
      }

      // Update paused duration
      const pauseInfo = parsePauseInfo(newMetadata);
      setTimerState(prev => ({ 
        ...prev, 
        isPaused: false,
        pausedDuration: pauseInfo.totalPausedMs
      }));
      toast.success('Timer resumed');
    } catch (error) {
      console.error('Error resuming timer:', error);
      toast.error('Failed to resume timer');
    }
  };

  const stopTimer = () => {
    setShowStopModal(true);
  };

  const confirmStopTimer = async () => {
    if (!currentTimeEntryId || !timerState.startTime) return;

    try {
      const endTime = new Date();
      const totalDurationMs = endTime.getTime() - timerState.startTime.getTime() - timerState.pausedDuration;
      const durationMinutes = Math.floor(totalDurationMs / (1000 * 60));

      // Get current timer metadata and add stop time
      const currentMetadata = await getCurrentTimerMetadata(currentTimeEntryId);
      const stopMetadata = currentMetadata ? `${currentMetadata}\nTimer stopped at ${endTime.toISOString()}` : `Timer stopped at ${endTime.toISOString()}`;

      // Update time entry with end time, user comment, and timer metadata
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          comment: workComment.trim() || null, // Only save user's comment - no timer metadata here
          timer_metadata: stopMetadata // Save timer info separately
        })
        .eq('id', currentTimeEntryId);

      if (error) {
        toast.error('Failed to stop timer: ' + error.message);
        return;
      }

      // Reset timer state
      setTimerState({
        isRunning: false,
        isPaused: false,
        startTime: null,
        pausedDuration: 0,
        elapsedTime: 0
      });
      setCurrentTimeEntryId(null);
      setShowStopModal(false);
      setWorkComment('');
      
      toast.success(`Timer stopped! Total time: ${formatTime(Math.floor(totalDurationMs / 1000))}`);
      
      if (onTimeUpdate) {
        onTimeUpdate();
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('Failed to stop timer');
    }
  };

  const formatTime = (totalSeconds: number) => {
    // Ensure we're working with an integer number of seconds
    const seconds = Math.floor(Math.abs(totalSeconds || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Timer Display */}
      {timerState.isRunning && (
        <div className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          <span className={`font-mono ${timerState.isPaused ? 'text-yellow-600' : 'text-green-600'}`}>
            {formatTime(timerState.elapsedTime)}
            {timerState.isPaused && ' (Paused)'}
          </span>
        </div>
      )}

      {/* Timer Controls */}
      {!timerState.isRunning ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 hover:bg-green-100"
          onClick={startTimer}
          title="Start Timer"
        >
          <Play className="h-3 w-3 text-green-600" />
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          {!timerState.isPaused ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-yellow-100"
              onClick={pauseTimer}
              title="Pause Timer"
            >
              <Pause className="h-3 w-3 text-yellow-600" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-green-100"
              onClick={resumeTimer}
              title="Resume Timer"
            >
              <Play className="h-3 w-3 text-green-600" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-red-100"
            onClick={stopTimer}
            title="Stop Timer"
          >
            <Square className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      )}

      {/* Stop Timer Modal */}
      <Dialog open={showStopModal} onOpenChange={setShowStopModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
            <DialogDescription>
              You've been working on "{taskName}" for {formatTime(timerState.elapsedTime)}.
              Please add a comment about your work (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="work-comment">Work Comment</Label>
              <Textarea
                id="work-comment"
                placeholder="Describe what you accomplished..."
                value={workComment}
                onChange={(e) => setWorkComment(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowStopModal(false)}>
                Cancel
              </Button>
              <Button onClick={confirmStopTimer}>
                Stop Timer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskTimer;
