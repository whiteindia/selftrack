
import React, { useState, useEffect } from 'react';

interface LiveTimerProps {
  startTime: string;
  isPaused?: boolean;
  timerMetadata?: string | null;
}

const LiveTimer: React.FC<LiveTimerProps> = ({ startTime, isPaused = false, timerMetadata = null }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Helper function to parse pause information from timer_metadata - SAME AS OTHER TIMERS
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
    }
    
    return { isPaused, totalPausedMs, lastPauseTime };
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const pauseInfo = parsePauseInfo(timerMetadata);
    
    if (!pauseInfo.isPaused) {
      interval = setInterval(() => {
        const now = new Date();
        const start = new Date(startTime);
        
        // Calculate elapsed time minus paused duration - SAME LOGIC AS OTHER TIMERS
        const totalElapsedMs = now.getTime() - start.getTime();
        let adjustedPausedMs = pauseInfo.totalPausedMs;
        
        // Convert to seconds and ensure we truncate any fractional seconds
        const elapsed = Math.floor((totalElapsedMs - adjustedPausedMs) / 1000);
        setElapsedTime(Math.max(0, elapsed));
      }, 1000);
    } else {
      // If paused, calculate elapsed time up to pause point
      const start = new Date(startTime);
      const pauseTime = pauseInfo.lastPauseTime || new Date();
      
      // Convert to seconds and ensure we truncate any fractional seconds
      const elapsedToPause = Math.floor((pauseTime.getTime() - start.getTime() - pauseInfo.totalPausedMs) / 1000);
      setElapsedTime(Math.max(0, elapsedToPause));
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, timerMetadata]);

  const formatTime = (totalSeconds: number) => {
    // Ensure we're working with whole seconds only
    const seconds = Math.floor(totalSeconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentlyPaused = parsePauseInfo(timerMetadata).isPaused;

  return (
    <span className={`text-xs font-mono ${currentlyPaused ? 'text-yellow-600' : 'text-green-600'}`}>
      {formatTime(elapsedTime)}
    </span>
  );
};

export default LiveTimer;
