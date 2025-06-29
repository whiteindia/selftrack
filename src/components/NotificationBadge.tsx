
import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

const NotificationBadge = ({ count, className = '' }: NotificationBadgeProps) => {
  if (count === 0) return null;

  return (
    <div className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-semibold ${className}`}>
      {count > 99 ? '99+' : count}
    </div>
  );
};

export default NotificationBadge;
