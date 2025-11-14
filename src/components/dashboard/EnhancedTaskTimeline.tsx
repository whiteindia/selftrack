import React from 'react';
import { format, isToday, isTomorrow, isSameDay, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { Clock, Circle, CircleDot, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  onDragEnd?: (event: DragEndEvent) => void;
  timeEntries?: any[];
}

interface TimelineSlot {
  time: Date;
  tasks: TimelineTask[];
  label: string;
  isCurrent?: boolean;
}

const SortableTaskCard: React.FC<{
  task: TimelineTask;
  onTaskClick?: (taskId: string) => void;
  isActive: boolean;
  taskTime: Date | null;
  activeEntry?: any;
}> = ({ task, onTaskClick, isActive, taskTime, activeEntry }) => {
  const [elapsedTime, setElapsedTime] = React.useState<string>('');
  
  // Update timer every second when task is active
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeEntry) {
      const updateTimer = () => {
        const startTime = new Date(activeEntry.start_time);
        const now = new Date();
        const elapsed = now.getTime() - startTime.getTime();
        
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
        
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      };
      
      updateTimer(); // Update immediately
      interval = setInterval(updateTimer, 1000); // Update every second
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeEntry]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Calculate elapsed time for active timer
  const getElapsedTime = () => {
    return elapsedTime;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      key={task.id}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
        isActive ? 'border-blue-200 bg-blue-50 shadow-sm' : 'border-border bg-background',
        "hover:border-primary/50"
      )}
      onClick={() => onTaskClick?.(task.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{task.name}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                task.status.toLowerCase() === 'in progress' && 'border-blue-200 text-blue-700 bg-blue-50'
              )}
            >
              {task.status}
            </Badge>
            {activeEntry && (
              <span className="text-xs text-blue-600 font-mono">
                {getElapsedTime()}
              </span>
            )}
            {taskTime && !activeEntry && (
              <span className="text-xs text-muted-foreground">
                {format(taskTime, 'h:mma')}
              </span>
            )}
          </div>
        </div>
        <div className={cn(
          "w-3 h-3 rounded-full flex-shrink-0 mt-0.5",
          task.status.toLowerCase() === 'completed' ? 'bg-green-500' :
          task.status.toLowerCase() === 'in progress' ? 'bg-blue-500' : 'bg-gray-400'
        )}></div>
      </div>
    </div>
  );
};

export const TaskTimeline: React.FC<TaskTimelineProps> = ({ tasks, timeFilter, onTaskClick, onDragEnd, timeEntries }) => {
  const getTaskTime = (task: TimelineTask): Date | null => {
    if (task.slot_start_time) return new Date(task.slot_start_time);
    if (task.reminder_datetime) return new Date(task.reminder_datetime);
    if (task.deadline) return new Date(task.deadline);
    return null;
  };

  const getTimelineSlots = (): { slots: TimelineSlot[]; dateRange: string } => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let dateRange: string;

    switch (timeFilter) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        dateRange = 'Today';
        break;
      case 'tomorrow':
        startDate = startOfDay(addDays(now, 1));
        endDate = endOfDay(addDays(now, 1));
        dateRange = 'Tomorrow';
        break;
      case 'laterThisWeek':
        startDate = addDays(now, 2); // Day after tomorrow
        endDate = endOfWeek(now);
        dateRange = 'Later This Week';
        break;
      case 'nextWeek':
        startDate = startOfWeek(addDays(now, 7));
        endDate = endOfWeek(addDays(now, 7));
        dateRange = 'Next Week';
        break;
      default:
        // For 'all' filter, show tasks from today onwards for 7 days
        startDate = startOfDay(now);
        endDate = endOfDay(addDays(now, 6));
        dateRange = 'All Tasks';
    }

    const slots: TimelineSlot[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Add hourly slots for each day
      for (let hour = 0; hour < 24; hour++) {
        const slotTime = new Date(currentDate);
        slotTime.setHours(hour, 0, 0, 0);
        
        slots.push({
          time: slotTime,
          tasks: [],
          label: format(slotTime, 'ha'),
          isCurrent: isToday(slotTime) && new Date().getHours() === hour
        });
      }
      currentDate = addDays(currentDate, 1);
    }

    // Group tasks by their time slots
    tasks.forEach(task => {
      const taskTime = getTaskTime(task);
      if (taskTime && taskTime >= startDate && taskTime <= endDate) {
        const slotIndex = slots.findIndex(slot => 
          isSameDay(slot.time, taskTime) && slot.time.getHours() === taskTime.getHours()
        );
        if (slotIndex !== -1) {
          slots[slotIndex].tasks.push(task);
        }
      }
    });

    return { slots, dateRange };
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

  const getDateGroupLabel = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
  };

  const { slots, dateRange } = getTimelineSlots();
  const hasTimedTasks = slots.some(slot => slot.tasks.length > 0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id && onDragEnd) {
      onDragEnd(event);
    }
  };

  if (!hasTimedTasks) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No scheduled tasks for {dateRange.toLowerCase()}</p>
          <p className="text-xs mt-1">Tasks with slot times or reminders will appear here</p>
        </div>
      </Card>
    );
  }

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const dateKey = format(slot.time, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: slot.time,
        slots: []
      };
    }
    if (slot.tasks.length > 0) {
      acc[dateKey].slots.push(slot);
    }
    return acc;
  }, {} as Record<string, { date: Date; slots: TimelineSlot[] }>);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {dateRange}
          </h3>
          <div className="text-sm text-muted-foreground">
            {format(new Date(), 'MMM d, yyyy')}
          </div>
        </div>
        
        {Object.entries(slotsByDate).map(([dateKey, dateGroup]) => (
          <div key={dateKey} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-muted-foreground">
                {getDateGroupLabel(dateGroup.date)}
              </div>
              <div className="flex-1 h-px bg-border"></div>
            </div>
            
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>
              
              <div className="space-y-1">
                {dateGroup.slots.map((slot) => (
                  <div key={`${dateKey}-${slot.time.getHours()}`} className="relative flex items-start gap-4">
                    {/* Time marker */}
                    <div className="flex-shrink-0 w-16 text-xs text-muted-foreground text-right pt-1">
                      {slot.label}
                    </div>
                    
                    {/* Timeline node */}
                    <div className="flex-shrink-0 relative z-10 mt-1">
                      {slot.isCurrent ? (
                        <CircleDot className="h-4 w-4 text-primary fill-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-border fill-background" />
                      )}
                    </div>
                    
                    {/* Tasks for this slot */}
                    <div className="flex-1 space-y-2 pb-4">
                      <SortableContext
                        items={slot.tasks.map(task => task.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {slot.tasks.map((task) => {
                          const isActive = task.status.toLowerCase() === 'in progress';
                          const taskTime = getTaskTime(task);
                          const activeEntry = timeEntries?.find(entry => entry.task_id === task.id && !entry.end_time);
                          
                          return (
                            <SortableTaskCard
                              key={task.id}
                              task={task}
                              onTaskClick={onTaskClick}
                              isActive={isActive}
                              taskTime={taskTime}
                              activeEntry={activeEntry}
                            />
                          );
                        })}
                      </SortableContext>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DndContext>
  );
};

export default TaskTimeline;