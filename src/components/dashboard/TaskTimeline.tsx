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
    if (task.slot_start_time) {
      taskTime = new Date(task.slot_start_time);
    } else if (task.reminder_datetime) {
      taskTime = new Date(task.reminder_datetime);
    } else if (task.deadline) {
      taskTime = new Date(task.deadline);
      if (
        taskTime.getHours() === 0 &&
        taskTime.getMinutes() === 0 &&
        taskTime.getSeconds() === 0
      ) {
        taskTime.setHours(9, 0, 0, 0);
      }
    }
    return taskTime && !isNaN(taskTime.getTime()) ? taskTime : null;
  };

  const tasksByTimeSlot = useMemo(() => {
    const slots: { [key: string]: Task[] } = {};
    
    console.log('=== TASKTIMELINE DEBUG ===');
    console.log('TaskTimeline - tasks received:', tasks);
    console.log('TaskTimeline - tasks length:', tasks?.length);
    
    if (tasks && tasks.length > 0) {
      console.log('TaskTimeline - first task details:', {
        name: tasks[0].name,
        deadline: tasks[0].deadline,
        reminder_datetime: tasks[0].reminder_datetime,
        slot_start_time: tasks[0].slot_start_time,
        status: tasks[0].status
      });
    } else {
      console.log('TaskTimeline - NO TASKS FOUND');
    }
    
    // Add test data if no tasks have specific times
    const testTasks = tasks.length === 0 ? [
      {
        id: 'test-1',
        name: 'Test Task 1 - 9 AM',
        deadline: null,
        status: 'pending',
        project_id: 'test',
        reminder_datetime: null,
        slot_start_time: new Date().toISOString().split('T')[0] + 'T09:00:00',
        sort_order: 1
      },
      {
        id: 'test-2', 
        name: 'Test Task 2 - 2 PM',
        deadline: null,
        status: 'pending',
        project_id: 'test',
        reminder_datetime: new Date().toISOString().split('T')[0] + 'T14:00:00',
        slot_start_time: null,
        sort_order: 2
      },
      {
        id: 'test-3',
        name: 'Test Task 3 - 5 PM', 
        deadline: new Date().toISOString().split('T')[0] + 'T17:00:00',
        status: 'pending',
        project_id: 'test',
        reminder_datetime: null,
        slot_start_time: null,
        sort_order: 3
      }
    ] : [];
    
    const allTasks = [...tasks, ...testTasks];
    
    allTasks.forEach(task => {
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
    
    console.log('TaskTimeline - tasksByTimeSlot for occupied slots:', tasksByTimeSlot);
    
    Object.keys(tasksByTimeSlot).forEach(slotKey => {
      const [dayKey, hourStr] = slotKey.split('-');
      const hour = parseInt(hourStr);
      
      console.log(`TaskTimeline - processing slotKey: ${slotKey}, dayKey: ${dayKey}, hour: ${hour}`);
      
      if (!occupiedSlots[dayKey]) {
        occupiedSlots[dayKey] = [];
      }
      occupiedSlots[dayKey].push(hour);
    });
    
    // Sort hours for each day
    Object.keys(occupiedSlots).forEach(dayKey => {
      occupiedSlots[dayKey].sort((a, b) => a - b);
    });
    
    console.log('TaskTimeline - occupiedSlots result:', occupiedSlots);
    
    // Create fallback for today if no tasks have times and there are tasks
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    if (!occupiedSlots[todayKey] && tasks.length > 0) {
      console.log('TaskTimeline - no occupied slots for today, creating fallback');
      occupiedSlots[todayKey] = [9]; // Default to 9 AM
    }
    
    return occupiedSlots;
  }, [tasksByTimeSlot, tasks]);

  const getDisplayDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d');
  };

  const getDisplayDates = () => {
    const today = new Date();
    const dates = [today];
    
    console.log('TaskTimeline - timeFilter:', timeFilter);
    console.log('TaskTimeline - today:', today);
    
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
    
    console.log('TaskTimeline - displayDates:', dates);
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
                {(task.reminder_datetime || task.slot_start_time) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.slot_start_time && `🕐 ${format(new Date(task.slot_start_time), 'HH:mm')}`}
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
                  size="xs"
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
                size="xs"
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
                size="xs"
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
                size="xs"
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
      const updateData: any = { slot_start_time: newTime.toISOString() };
      console.log('Updating task time with data:', { taskId, slot_start_time: updateData.slot_start_time });
      
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
        {console.log('TaskTimeline - rendering with displayDates:', displayDates)}
        {console.log('TaskTimeline - getOccupiedSlots:', getOccupiedSlots)}
        
        {/* Fallback for testing - show all tasks in a simple list if timeline fails */}
        {Object.keys(getOccupiedSlots).length === 0 && tasks.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 text-sm mb-2">Timeline fallback - tasks without specific times:</p>
            {tasks.map(task => (
              <div key={task.id} className="mb-2 p-2 bg-white rounded border">
                <div className="font-medium text-sm">{task.name}</div>
                <div className="text-xs text-muted-foreground">
                  Deadline: {task.deadline ? new Date(task.deadline).toLocaleString() : 'None'}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {displayDates.map((date) => {
          const dayKey = format(date, 'yyyy-MM-dd');
          const occupiedHours = getOccupiedSlots[dayKey] || [];
          
          console.log(`TaskTimeline - processing day: ${dayKey}, occupiedHours:`, occupiedHours);
          
          if (occupiedHours.length === 0) {
            console.log(`TaskTimeline - skipping day ${dayKey} - no occupied hours`);
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
                      
                      console.log(`TaskTimeline - rendering hour: ${hour}, slotKey: ${slotKey}, tasks:`, slotTasks);
                      
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