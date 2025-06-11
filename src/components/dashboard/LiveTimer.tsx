
import React, { useState, useEffect } from 'react';

interface LiveTimerProps {
  startTime: string;
}

const LiveTimer: React.FC<LiveTimerProps> = ({ startTime }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for live timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatElapsedTime = (startTime: string) => {
    const start = new Date(startTime);
    const elapsed = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <span className="font-mono text-sm text-green-600">
      {formatElapsedTime(startTime)}
    </span>
  );
};

export default LiveTimer;
