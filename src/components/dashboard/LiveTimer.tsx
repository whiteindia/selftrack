
import React, { useState, useEffect } from 'react';

interface LiveTimerProps {
  startTime: string;
  isPaused?: boolean;
}

const LiveTimer: React.FC<LiveTimerProps> = ({ startTime, isPaused = false }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (!isPaused) {
      interval = setInterval(() => {
        const now = new Date();
        const start = new Date(startTime);
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, isPaused]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`text-sm font-mono ${isPaused ? 'text-yellow-600' : 'text-green-600'}`}>
      {formatTime(elapsedTime)}
      {isPaused && <span className="ml-1 text-xs">(Paused)</span>}
    </div>
  );
};

export default LiveTimer;
