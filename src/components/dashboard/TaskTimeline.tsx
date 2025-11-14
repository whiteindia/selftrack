import React from 'react';
import { format, isToday, isTomorrow, isSameDay, addDays, startOfDay, endOfDay } from 'date-fns';
import { Clock, Circle, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TimelineTask {
  id: string;
  name: string;
  deadline?: string;
  reminder_datetime?: string;
  slot_start_time?: string;
  status: string;
  sort_order?: number;
}

interface TaskTimelineProps {
  tasks: TimelineTask[];
  timeFilter: 'all' | 'today' | 'tomorrow' | 'laterThisWeek' | 'nextWeek';
  onTaskClick?: (taskId: string) => void;
}

interface TimelineHour {
  hour: number;
  tasks: TimelineTask[];
  label: string;
}

export const TaskTimeline: React.FC<TaskTimelineProps> = ({ tasks, timeFilter, onTaskClick }) => {
  const getTaskTime = (task: TimelineTask): Date | null => {
    if (task.slot_start_time) return new Date(task.slot_start_time);
    if (task.reminder_datetime) return new Date(task.reminder_datetime);
    if (task.deadline) return new Date(task.deadline);
    return null;
  };

  const getTimelineHours = (): TimelineHour[] => {
    const now = new Date();
    const hours: TimelineHour[] = [];
    
    // Generate 24 hours timeline
    for (let i = 0; i < 24; i++) {
      hours.push({
        hour: i,
        tasks: [],
        label: format(new Date().setHours(i, 0, 0, 0), 'ha')
      });
    }
    
    // Group tasks by hour
    tasks.forEach(task => {
      const taskTime = getTaskTime(task);
      if (taskTime) {
        const hour = taskTime.getHours();
        if (hour >= 0 && hour < 24) {
          hours[hour].tasks.push(task);
        }
      }
    });
    
    return hours;
  };

  const getDateHeader = (): string => {
    const now = new Date();
    
    switch (timeFilter) {
      case 'today':
        return 'Today';
      case 'tomorrow':
        return 'Tomorrow';
      case 'laterThisWeek':
        return 'Later This Week';
      case 'nextWeek':
        return 'Next Week';
      default:
        return 'Timeline';
    }
  };

  const getTaskStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'in progress':
        return 'bg-blue-500';
      case 'not started':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const timelineHours = getTimelineHours();
  const hasTimedTasks = timelineHours.some(hour => hour.tasks.length > 0);

  if (!hasTimedTasks && timeFilter !== 'all') {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No scheduled tasks for this time period</p>
      </div>
    );
  }

  if (!hasTimedTasks) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">{getDateHeader()}</h3>
        <div className="text-xs text-muted-foreground">
          {format(new Date(), 'MMM d, yyyy')}
        </div>
      </div>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
        
        <div className="space-y-1">
          {timelineHours.map((hour, index) => {
            if (hour.tasks.length === 0) return null;
            
            const isCurrentHour = new Date().getHours() === hour.hour;
            
            return (
              <div key={hour.hour} className="relative flex items-start gap-4">
                {/* Time marker */}
                <div className="flex-shrink-0 w-12 text-xs text-muted-foreground text-right pt-1">
                  {hour.label}
                </div>
                
                {/* Timeline node */}
                <div className="flex-shrink-0 relative z-10">
                  {isCurrentHour ? (
                    <CircleDot className="h-3 w-3 text-primary fill-primary" />
                  ) : (
                    <Circle className="h-3 w-3 text-border fill-background" />
                  )}
                </div>
                
                {/* Tasks for this hour */}
                <div className="flex-1 space-y-2 pb-4">
                  {hour.tasks.map((task) => {
                    const taskTime = getTaskTime(task);
                    const isActive = task.status === 'In Progress';
                    
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                          isActive ? 'border-blue-200 bg-blue-50' : 'border-border bg-background',
                          "hover:border-primary/50"
                        )}
                        onClick={() => onTaskClick?.(task.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">{task.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  task.status === 'In Progress' && 'border-blue-200 text-blue-700'
                                )}
                              >
                                {task.status}
                              </Badge>
                              {taskTime && (
                                <span className="text-xs text-muted-foreground">
                                  {format(taskTime, 'h:mma')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                            getTaskStatusColor(task.status)
                          )}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TaskTimeline;