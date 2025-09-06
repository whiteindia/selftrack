import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pause, Square, Play } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { logTimeEntry, logTimerStopped } from '@/utils/activityLogger';

interface CompactTimerControlsProps {
  taskId: string;
  taskName: string;
  entryId: string;
  timerMetadata: string | null;
  onTimerUpdate?: () => void;
  isSubtask?: boolean;
}

const CompactTimerControls: React.FC<CompactTimerControlsProps> = ({
  taskId,
  taskName,
  entryId,
  timerMetadata,
  onTimerUpdate,
  isSubtask = false
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [comment, setComment] = useState('');

  // Parse pause information from timer_metadata
  const parsePauseInfo = (metadata: string | null) => {
    if (!metadata) return { isPaused: false, totalPausedMs: 0, lastPauseTime: undefined };
    
    const pauseMatches = [...metadata.matchAll(/Timer paused at ([^,\n]+)/g)];
    const resumeMatches = [...metadata.matchAll(/Timer resumed at ([^,\n]+)/g)];
    
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
    }
    
    return { isPaused, totalPausedMs, lastPauseTime };
  };

  const pauseInfo = parsePauseInfo(timerMetadata);

  // Pause timer mutation
  const pauseTimerMutation = useMutation({
    mutationFn: async () => {
      const currentMetadata = await getCurrentTimerMetadata(entryId);
      const pauseTimestamp = new Date().toISOString();
      const updatedMetadata = currentMetadata 
        ? `${currentMetadata}\nTimer paused at ${pauseTimestamp}` 
        : `Timer paused at ${pauseTimestamp}`;

      const { data, error } = await supabase
        .from('time_entries')
        .update({ timer_metadata: updatedMetadata })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['running-timers'] });
      onTimerUpdate?.();
      toast.success('Timer paused');
    },
    onError: (error) => {
      console.error('Error pausing timer:', error);
      toast.error('Failed to pause timer');
    }
  });

  // Resume timer mutation
  const resumeTimerMutation = useMutation({
    mutationFn: async () => {
      const currentMetadata = await getCurrentTimerMetadata(entryId);
      const resumeTimestamp = new Date().toISOString();
      const updatedMetadata = currentMetadata 
        ? `${currentMetadata}\nTimer resumed at ${resumeTimestamp}` 
        : `Timer resumed at ${resumeTimestamp}`;

      const { data, error } = await supabase
        .from('time_entries')
        .update({ timer_metadata: updatedMetadata })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['running-timers'] });
      onTimerUpdate?.();
      toast.success('Timer resumed');
    },
    onError: (error) => {
      console.error('Error resuming timer:', error);
      toast.error('Failed to resume timer');
    }
  });

  // Stop timer mutation
  const stopTimerMutation = useMutation({
    mutationFn: async (workComment: string) => {
      const currentMetadata = await getCurrentTimerMetadata(entryId);
      const endTime = new Date();
      
      // Get the entry details to calculate duration
      const { data: entryData, error: entryError } = await supabase
        .from('time_entries')
        .select('start_time, timer_metadata')
        .eq('id', entryId)
        .single();

      if (entryError) throw entryError;

      const startTime = new Date(entryData.start_time);
      const totalElapsedMs = endTime.getTime() - startTime.getTime();
      
      // Parse pause info to get total paused time
      const pauseInfo = parsePauseInfo(entryData.timer_metadata);
      const actualWorkingMs = totalElapsedMs - pauseInfo.totalPausedMs;
      const actualWorkingMinutes = Math.max(1, Math.round(actualWorkingMs / (1000 * 60)));

      const stopTimestamp = endTime.toISOString();
      const finalMetadata = currentMetadata 
        ? `${currentMetadata}\nTimer stopped at ${stopTimestamp}` 
        : `Timer stopped at ${stopTimestamp}`;

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          end_time: stopTimestamp,
          duration_minutes: actualWorkingMinutes,
          comment: workComment,
          timer_metadata: finalMetadata
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;

      // Log activities
      const durationString = `${Math.floor(actualWorkingMinutes / 60)}h ${actualWorkingMinutes % 60}m`;
      await logTimeEntry(taskName, taskId, durationString, workComment);
      await logTimerStopped(taskName, taskId, durationString);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['running-timers'] });
      onTimerUpdate?.();
      setComment('');
      setShowCommentDialog(false);
      toast.success('Timer stopped and time logged');
    },
    onError: (error) => {
      console.error('Error stopping timer:', error);
      toast.error('Failed to stop timer');
    }
  });

  const getCurrentTimerMetadata = async (entryId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('timer_metadata')
      .eq('id', entryId)
      .single();
    
    if (error) {
      console.error('Error fetching timer metadata:', error);
      return null;
    }
    
    return data?.timer_metadata || null;
  };

  const handlePauseResume = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pauseInfo.isPaused) {
      resumeTimerMutation.mutate();
    } else {
      pauseTimerMutation.mutate();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCommentDialog(true);
  };

  const handleStopWithComment = () => {
    if (comment.trim()) {
      stopTimerMutation.mutate(comment.trim());
    } else {
      toast.error('Please enter a work comment');
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={pauseInfo.isPaused ? "default" : "secondary"}
          onClick={handlePauseResume}
          disabled={pauseTimerMutation.isPending || resumeTimerMutation.isPending}
          className="h-6 w-6 p-0"
          title={pauseInfo.isPaused ? "Resume Timer" : "Pause Timer"}
        >
          {pauseInfo.isPaused ? (
            <Play className="h-3 w-3" />
          ) : (
            <Pause className="h-3 w-3" />
          )}
        </Button>
        
        <Button
          size="sm"
          variant="destructive"
          onClick={handleStop}
          disabled={stopTimerMutation.isPending}
          className="h-6 w-6 p-0"
          title="Stop Timer"
        >
          <Square className="h-3 w-3" />
        </Button>
      </div>

      {/* Stop Timer Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
            <DialogDescription>
              Add a comment about the work completed for "{taskName}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="work-comment">Work Comment *</Label>
              <Input
                id="work-comment"
                placeholder="Describe what you accomplished..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && comment.trim()) {
                    handleStopWithComment();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCommentDialog(false)}
                disabled={stopTimerMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStopWithComment}
                disabled={!comment.trim() || stopTimerMutation.isPending}
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

export default CompactTimerControls;