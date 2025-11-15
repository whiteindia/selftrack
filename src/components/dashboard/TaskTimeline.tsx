import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Eye, Pencil, Trash2, GripVertical } from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import LiveTimer from './LiveTimer';
import CompactTimerControls from './CompactTimerControls';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
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

interface Task {
  id: string;
  name: string;
  deadline: string | null;
  status: string;
  project_id: string;
  reminder_datetime: string | null;
  slot_start_time: string | null;
  slot_start_datetime?: string | null;
  slot_end_datetime?: string | null;
  sort_order: number | null;
}

interface TimeEntry {
  id: string;
  task_id: string;
  start_time: string;
  timer_metadata?: string;
  employee_id: string;
  entry_type: string;
}

interface TaskTimelineProps {
  tasks: Task[];
  timeEntries: TimeEntry[];
  onStartTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewTask: (taskId: string) => void;
  timeFilter: string;
  onTaskUpdate?: () => void;
}

const TaskTimeline: React.FC<TaskTimelineProps> = ({
  tasks,
  timeEntries,
  onStartTask,
  onEditTask,
  onDeleteTask,
  onViewTask,
  timeFilter,
  onTaskUpdate,
}) => {
  
  console.log('TaskTimeline - component initialized with tasks:', tasks);
  console.log('TaskTimeline - tasks length:', tasks?.length);
  
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
  const timelineHours = useMemo(() => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  }, []);

  const getEffectiveTaskTime = (task: Task): Date | null => {
    let taskTime: Date | null = null;
    if (task.slot_start_datetime) {
      const dt = new Date(task.slot_start_datetime);
      if (!isNaN(dt.getTime())) taskTime = dt;
    } else if (task.slot_start_time) {
      const dt = new Date(task.slot_start_time);
      if (!isNaN(dt.getTime())) taskTime = dt;
    } else if (task.reminder_datetime) {
      const dt = new Date(task.reminder_datetime);
      if (!isNaN(dt.getTime())) taskTime = dt;
    } else if (task.deadline) {
      const dt = new Date(task.deadline);
      if (!isNaN(dt.getTime())) {
        if (dt.getHours() === 0 && dt.getMinutes() === 0 && dt.getSeconds() === 0) {
          dt.setHours(9, 0, 0, 0);
        }
        taskTime = dt;
      }
    }
    return taskTime;
  };

  const tasksByTimeSlot = useMemo(() => {
    const slots: { [key: string]: Task[] } = {};
    
    console.log('TaskTimeline - tasks received:', tasks?.length || 0);
    
    if (!tasks || tasks.length === 0) {
      return slots;
    }
    
    tasks.forEach(task => {
      const taskTime = getEffectiveTaskTime(task);
      console.log(`TaskTimeline - processing task: "${task.name}"`, {
        slot_start_time: task.slot_start_time,
        reminder_datetime: task.reminder_datetime,
        deadline: task.deadline,
        effective: taskTime ? taskTime.toString() : null,
      });
      if (taskTime) {
        const hour = taskTime.getHours();
        const dayKey = format(taskTime, 'yyyy-MM-dd');
        const slotKey = `${dayKey}-${hour}`;
        if (!slots[slotKey]) {
          slots[slotKey] = [];
        }
        slots[slotKey].push(task);
      }
    });
    
    console.log('TaskTimeline - slots created:', slots);
    return slots;
  }, [tasks]);

  const getOccupiedSlots = useMemo(() => {
    const occupiedSlots: { [dayKey: string]: number[] } = {};
    
    Object.keys(tasksByTimeSlot).forEach(slotKey => {
      const [dayKey, hourStr] = slotKey.split('-');
      const hour = parseInt(hourStr);
      
      if (!occupiedSlots[dayKey]) {
        occupiedSlots[dayKey] = [];
      }
      occupiedSlots[dayKey].push(hour);
    });
    
    // Sort hours for each day
    Object.keys(occupiedSlots).forEach(dayKey => {
      occupiedSlots[dayKey].sort((a, b) => a - b);
    });
    
    return occupiedSlots;
  }, [tasksByTimeSlot]);

  const getDisplayDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d');
  };

  const getDisplayDates = () => {
    const today = new Date();
    const dates = [today];
    
    if (timeFilter === 'all') {
      // Show today and next 6 days for "all" filter
      for (let i = 1; i < 7; i++) {
        dates.push(addDays(today, i));
      }
    } else if (timeFilter === 'tomorrow') {
      dates.push(addDays(today, 1));
    } else if (timeFilter === 'laterThisWeek') {
      // Add remaining days of this week
      for (let i = 1; i <= 7 - today.getDay(); i++) {
        dates.push(addDays(today, i));
      }
    } else if (timeFilter === 'nextWeek') {
      // Add all days of next week
      for (let i = 7; i < 14; i++) {
        dates.push(addDays(today, i));
      }
    }
    
    return dates;
  };

  const displayDates = getDisplayDates();

  // Add safety check to prevent rendering issues
  if (!tasks || !Array.isArray(tasks)) {
    console.log('TaskTimeline - no tasks provided or invalid tasks array');
    return <div className="text-sm text-muted-foreground p-4">No tasks available</div>;
  }

  const SortableTaskNode: React.FC<{ task: Task }> = ({ task }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: task.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const activeEntry = timeEntries?.find((entry) => entry.task_id === task.id);
    const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <Card className="p-2 mb-2 bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-primary">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <GripVertical className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm break-words leading-tight">{task.name}</h4>
                {(task.reminder_datetime || task.slot_start_time || task.slot_start_datetime) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.slot_start_datetime && `🕐 ${format(new Date(task.slot_start_datetime), 'HH:mm')}`}
                    {!task.slot_start_datetime && task.slot_start_time && `🕐 ${format(new Date(task.slot_start_time), 'HH:mm')}`}
                    {task.reminder_datetime && `⏰ ${format(new Date(task.reminder_datetime), 'HH:mm')}`}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {activeEntry && (
                <div className="flex items-center gap-1 text-xs">
                  <LiveTimer
                    startTime={activeEntry.start_time}
                    isPaused={isPaused}
                    timerMetadata={activeEntry.timer_metadata}
                  />
                  <span className={`px-1 rounded ${isPaused ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {isPaused ? "⏸" : "▶"}
                  </span>
                </div>
              )}
              
              {!activeEntry && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartTask(task.id);
                  }}
                  className="h-6 px-2"
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask(task);
                }}
                className="h-6 px-2"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewTask(task.id);
                }}
                className="h-6 px-2"
              >
                <Eye className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task.id);
                }}
                className="h-6 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {activeEntry && (
            <div className="mt-1">
              <CompactTimerControls
                taskId={task.id}
                taskName={task.name}
                entryId={activeEntry.id}
                timerMetadata={activeEntry.timer_metadata}
                onTimerUpdate={() => {}}
              />
            </div>
          )}
        </Card>
      </div>
    );
  };

  // Function to update task time in the database
  const updateTaskTime = async (taskId: string, newTime: Date) => {
    try {
      const updateData: any = { slot_start_datetime: newTime.toISOString() };
      console.log('Updating task time with data:', { taskId, slot_start_datetime: updateData.slot_start_datetime });
      
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);
      
      if (error) throw error;
      
      console.log(`Task ${taskId} time updated successfully`);
      
      // Show success toast
      toast.success('Task time updated successfully');
      
      // Trigger task refresh
      if (onTaskUpdate) {
        onTaskUpdate();
      }
      
    } catch (error) {
      console.error('Error updating task time:', error);
      toast.error('Failed to update task time');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    try {
      const { active, over } = event;
      
      if (!over) return;
      if (active.id === over.id) return;

      const activeTask = tasks.find(task => task.id === active.id);
      const overTask = tasks.find(task => task.id === over.id);
      if (!activeTask) return;

      // Dropping onto an empty hour slot
      if (!overTask && typeof over.id === 'string' && (over.id as string).startsWith('slot-')) {
        const slotId = String(over.id).replace('slot-', '');
        const [dayKey, hourStr] = slotId.split('-');
        const hour = parseInt(hourStr);
        const newTime = new Date(`${dayKey}T${String(hour).padStart(2, '0')}:00:00`);
        updateTaskTime(activeTask.id, newTime);
        console.log(`Updating task ${activeTask.name} to empty slot:`, newTime);
        return;
      }

      if (overTask) {
        const overEffectiveTime = getEffectiveTaskTime(overTask);
        if (overEffectiveTime) {
          updateTaskTime(activeTask.id, overEffectiveTime);
          console.log(`Updating task ${activeTask.name} to time slot:`, overEffectiveTime);
        }
      }
    } catch (error) {
      console.error('Error in handleDragEnd:', error);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {Object.keys(getOccupiedSlots).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No scheduled tasks. Add times to your tasks to see them on the timeline.</p>
          </div>
        )}
        
        {displayDates.map((date) => {
          const dayKey = format(date, 'yyyy-MM-dd');
          const occupiedHours = getOccupiedSlots[dayKey] || [];
          
          if (occupiedHours.length === 0) {
            return null;
          }
          
          // Collect all tasks for this day for drag-and-drop
          const dayTasks = occupiedHours.flatMap(hour => {
            const slotKey = `${dayKey}-${hour}`;
            return tasksByTimeSlot[slotKey] || [];
          });
          
          return (
            <div key={dayKey} className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2">
                {getDisplayDate(date)}
              </h3>
              
              <div className="relative">
                {/* Timeline thread line */}
                <div className="absolute left-20 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-blue-300 z-0"></div>
                
                <SortableContext items={dayTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {occupiedHours.map((hour) => {
                      const slotKey = `${dayKey}-${hour}`;
                      const slotTasks = tasksByTimeSlot[slotKey] || [];
                      
                      return (
                        <div key={hour} className="flex gap-4 min-h-[40px]">
                          <div className="w-16 text-sm text-muted-foreground text-right pt-2">
                            {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                          </div>
                          
                          <div className="flex-1 pl-4 relative">
                            {/* Timeline node */}
                            <div className="absolute left-3 top-3 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm z-10"></div>
                            {/* Timeline connection */}
                            <div className="absolute left-4 top-7 w-0.5 h-full bg-blue-300"></div>
                            
                            {/* Droppable area for the hour slot */}
                            {(() => {
                              const DroppableSlot: React.FC<{ id: string }> = ({ id }) => {
                                const { setNodeRef } = useDroppable({ id });
                                return <div ref={setNodeRef} className="min-h-[4px]"></div>;
                              };
                              return <DroppableSlot id={`slot-${slotKey}`} />;
                            })()}

                            {slotTasks.map((task) => (
                              <SortableTaskNode key={task.id} task={task} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SortableContext>
              </div>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
};

export default TaskTimeline;