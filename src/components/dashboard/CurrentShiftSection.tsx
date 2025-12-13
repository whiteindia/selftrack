import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Clock, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { format, addHours, addDays, subDays, startOfHour, isWithinInterval, isSameDay } from 'date-fns';
import LiveTimer from './LiveTimer';
import CompactTimerControls from './CompactTimerControls';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkloadItem {
  id: string;
  type: 'task' | 'subtask' | 'routine' | 'sprint' | 'slot-task';
  scheduled_time: string;
  scheduled_date: string;
  task?: {
    id: string;
    name: string;
    status: string;
    assignee?: { name: string };
    project?: { name: string; client?: { name: string } };
    slot_start_datetime?: string;
    slot_end_datetime?: string;
  };
  subtask?: {
    id: string;
    name: string;
    status: string;
    assignee?: { name: string };
    task?: { name: string };
    project?: { name: string; client?: { name: string } };
    parent_task_name: string;
  };
  routine?: {
    id: string;
    title: string;
    client_name: string;
    project_name: string;
  };
  sprint?: {
    id: string;
    title: string;
    project?: { name: string; clients?: { name: string } };
  };
}

export const CurrentShiftSection = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get current time and next 6 hours based on selected date
  const now = new Date();
  const isToday = isSameDay(selectedDate, now);
  const baseTime = isToday ? now : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0);
  const next6Hours = addHours(baseTime, isToday ? 6 : 24);

  // Navigation functions
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  // Define the 4 shifts for selected date
  const shifts = [
    { id: 'A', label: 'Shift A (12 AM - 6 AM)', start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0), end: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 6, 0) },
    { id: 'B', label: 'Shift B (6 AM - 12 PM)', start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 6, 0), end: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12, 0) },
    { id: 'C', label: 'Shift C (12 PM - 6 PM)', start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12, 0), end: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 18, 0) },
    { id: 'D', label: 'Shift D (6 PM - 12 AM)', start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 18, 0), end: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1, 0, 0) },
  ];

  // Also create shifts for next day in case items were assigned with next day's date
  const nextDay = addDays(selectedDate, 1);
  const nextDayShifts = [
    { id: 'A', label: 'Next Day Shift A (12 AM - 6 AM)', start: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 0, 0), end: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 6, 0) },
    { id: 'B', label: 'Next Day Shift B (6 AM - 12 PM)', start: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 6, 0), end: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 12, 0) },
    { id: 'C', label: 'Next Day Shift C (12 PM - 6 PM)', start: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 12, 0), end: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 18, 0) },
    { id: 'D', label: 'Next Day Shift D (6 PM - 12 AM)', start: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 18, 0), end: new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate() + 1, 0, 0) },
  ];


  // Helper functions
  const getItemTitle = (item: WorkloadItem) => {
    switch (item.type) {
      case 'task':
      case 'slot-task':
        return item.task?.name || 'Unknown Task';
      case 'subtask':
        return item.subtask?.parent_task_name 
          ? `${item.subtask.name} [${item.subtask.parent_task_name}]` 
          : item.subtask?.name || 'Unknown Subtask';
      case 'routine':
        return item.routine?.title || 'Unknown Routine';
      case 'sprint':
        return item.sprint?.title || 'Unknown Sprint';
      default:
        return 'Unknown Item';
    }
  };

  const getItemProject = (item: WorkloadItem) => {
    switch (item.type) {
      case 'task':
      case 'slot-task':
        return item.task?.project?.name || '';
      case 'subtask':
        return item.subtask?.project?.name || '';
      case 'routine':
        return item.routine?.project_name || '';
      case 'sprint':
        return item.sprint?.project?.name || '';
      default:
        return '';
    }
  };

  const getItemStatus = (item: WorkloadItem) => {
    if (item.type === 'subtask') {
      return item.subtask?.status || '';
    }
    return item.task?.status || '';
  };

  const getItemTitleClasses = (item: WorkloadItem) => {
    const status = getItemStatus(item);
    let baseColor = '';

    if (status === 'In Progress') {
      baseColor = 'text-orange-600 dark:text-orange-300';
    } else if (item.type === 'subtask') {
      baseColor = 'text-blue-700 dark:text-blue-300';
    } else if (item.type === 'slot-task') {
      baseColor = 'text-purple-700 dark:text-purple-300';
    }

    return cn(
      baseColor,
      status === 'Completed' && 'line-through decoration-current/70'
    );
  };

  // Fetch workload items for selected date and nearby days
  const { data: workloadItems = [], isLoading } = useQuery({
    queryKey: ['current-shift-workload', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const nextDateStr = addDays(selectedDate, 1).toISOString().split('T')[0];
      const prevDateStr = subDays(selectedDate, 1).toISOString().split('T')[0];

      // Fetch tasks with scheduled_time
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          slot_start_datetime,
          slot_end_datetime,
          assignee:employees!tasks_assignee_id_fkey(name),
          project:projects!tasks_project_id_fkey(
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `)
        .or(`date.eq.${dateStr},date.eq.${nextDateStr},date.eq.${prevDateStr},and(scheduled_time.not.is.null,date.is.null)`)
        .not('scheduled_time', 'is', null);

      if (tasksError) throw tasksError;

      // Fetch tasks with deadline slots (slot_start_datetime)
      const { data: slotTasksData, error: slotTasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          slot_start_datetime,
          slot_end_datetime,
          assignee:employees!tasks_assignee_id_fkey(name),
          project:projects!tasks_project_id_fkey(
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `)
        .gte('slot_start_datetime', `${dateStr}T00:00:00`)
        .lt('slot_start_datetime', `${dateStr}T23:59:59`);

      if (slotTasksError) throw slotTasksError;

      // Fetch subtasks
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          assignee:employees!subtasks_assignee_id_fkey(name),
          task:tasks!subtasks_task_id_fkey(
            name,
            project:projects!tasks_project_id_fkey(
              name,
              client:clients!projects_client_id_fkey(name)
            )
          )
        `)
        .or(`date.eq.${dateStr},date.eq.${nextDateStr},date.eq.${prevDateStr},and(scheduled_time.not.is.null,date.is.null)`)
        .not('scheduled_time', 'is', null);

      if (subtasksError) throw subtasksError;

      // Combine and format the data
      const workloadItems: WorkloadItem[] = [];
      const addedTaskIds = new Set<string>();

      // Add tasks with scheduled_time
      tasksData?.forEach(task => {
        if (task.scheduled_time) {
          const effectiveDate = task.date || dateStr;
          const scheduledDateTime = parseScheduledTime(task.scheduled_time, effectiveDate);

          if (scheduledDateTime) {
            addedTaskIds.add(task.id);
            workloadItems.push({
              id: task.id,
              type: 'task',
              scheduled_time: task.scheduled_time,
              scheduled_date: effectiveDate,
              task: {
                id: task.id,
                name: task.name,
                status: task.status,
                assignee: task.assignee,
                project: task.project,
                slot_start_datetime: task.slot_start_datetime,
                slot_end_datetime: task.slot_end_datetime
              }
            });
          }
        }
      });

      // Add tasks with deadline slots (slot_start_datetime)
      slotTasksData?.forEach(task => {
        if (addedTaskIds.has(task.id)) return; // Skip if already added
        
        if (task.slot_start_datetime) {
          const startDateTime = new Date(task.slot_start_datetime);
          const endDateTime = task.slot_end_datetime ? new Date(task.slot_end_datetime) : null;
          
          const startHour = startDateTime.getHours();
          const endHour = endDateTime ? endDateTime.getHours() : startHour + 1;
          
          // Create workload items for each hour slot the task spans
          for (let hour = startHour; hour < endHour; hour++) {
            const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
            
            workloadItems.push({
              id: `${task.id}-slot-${timeSlot}`,
              type: 'slot-task',
              scheduled_time: timeSlot,
              scheduled_date: dateStr,
              task: {
                id: task.id,
                name: task.name,
                status: task.status,
                assignee: task.assignee,
                project: task.project,
                slot_start_datetime: task.slot_start_datetime,
                slot_end_datetime: task.slot_end_datetime
              }
            });
          }
        }
      });

      // Add subtasks
      subtasksData?.forEach(subtask => {
        if (subtask.scheduled_time) {
          const effectiveDate = subtask.date || dateStr;
          const scheduledDateTime = parseScheduledTime(subtask.scheduled_time, effectiveDate);

          if (scheduledDateTime) {
            workloadItems.push({
              id: subtask.id,
              type: 'subtask',
              scheduled_time: subtask.scheduled_time,
              scheduled_date: effectiveDate,
              subtask: {
                id: subtask.id,
                name: subtask.name,
                status: subtask.status,
                assignee: subtask.assignee,
                task: subtask.task,
                project: subtask.task?.project,
                parent_task_name: subtask.task?.name || ''
              }
            });
          }
        }
      });


      return workloadItems;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch active time entries
  const { data: activeEntries = [] } = useQuery({
    queryKey: ['current-shift-active-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .is('end_time', null);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
  });

  // Helper function to parse scheduled time (handles both HH:mm and full datetime formats)
  const parseScheduledTime = (scheduledTime: string, date: string) => {
    try {
      // Check if scheduled_time is already a full datetime string
      if (scheduledTime.includes('T') || scheduledTime.includes(' ')) {
        return new Date(scheduledTime);
      }
      // Otherwise, combine date and time
      return new Date(`${date}T${scheduledTime}`);
    } catch (error) {
      console.error('Error parsing scheduled time:', scheduledTime, date, error);
      return null;
    }
  };

  // Group workload items by shifts (check both selected date's and next day's shifts)
  const allShifts = [...shifts, ...nextDayShifts];
  // Helper to check if time is in shift (start inclusive, end exclusive)
  const isInShiftRange = (itemTime: Date, shiftStart: Date, shiftEnd: Date) => {
    // Item time should be >= shift start AND < shift end (not inclusive of end)
    return itemTime >= shiftStart && itemTime < shiftEnd;
  };

  const itemsByShift = shifts.map(currentShift => {
    const shiftItems = workloadItems.filter(item => {
      const itemDateTime = parseScheduledTime(item.scheduled_time, item.scheduled_date);
      if (!itemDateTime) return false;

      // Check if item falls in this shift (start inclusive, end exclusive)
      const isInCurrentShift = isInShiftRange(itemDateTime, currentShift.start, currentShift.end);

      // Also check next day's corresponding shift if viewing today and item is within next 6 hours
      const nextShift = nextDayShifts.find(s => s.id === currentShift.id);
      const isInNextShift = isToday && nextShift && 
        isInShiftRange(itemDateTime, nextShift.start, nextShift.end) && 
        isWithinInterval(itemDateTime, { start: now, end: next6Hours });

      return isInCurrentShift || isInNextShift;
    });

    return {
      ...currentShift,
      items: shiftItems
    };
  });

  const handleStartTask = async (taskId: string, isSubtask: boolean = false) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("email", (await supabase.auth.getUser()).data.user?.email)
      .single();

    if (!employee) return;

    await supabase.from("time_entries").insert({
      task_id: taskId,
      employee_id: employee.id,
      entry_type: isSubtask ? "subtask" : "task",
      start_time: new Date().toISOString(),
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="px-2 sm:px-6 py-6">
          <div className="text-sm text-muted-foreground">Loading current shift...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="px-0 sm:px-6 py-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <h2 className="text-lg font-semibold">Current Shift</h2>
                {isToday && (
                  <Badge variant="outline" className="text-xs">
                    Next 6 Hours
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPreviousDay();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm font-medium">
                  {format(selectedDate, 'EEE, MMM d, yyyy')}
                </span>

                {!isToday && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToToday();
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    Today
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextDay();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 py-6">
          <div className="space-y-4">
            {itemsByShift.map(shift => (
              <div key={shift.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">{shift.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {shift.items.length} items
                  </Badge>
                </div>

                {shift.items.length === 0 ? (
                  <div className="text-xs text-muted-foreground pl-6">No scheduled items</div>
                ) : (
                  <div className="space-y-2 pl-6">
                    {shift.items.map(item => {
                      // Get the real task ID for slot-task items
                      const realTaskId = item.type === 'slot-task' ? item.task?.id : item.id;
                      
                      const activeEntry = activeEntries.find(entry =>
                        entry.task_id === realTaskId ||
                        (item.type === 'subtask' && entry.task_id === item.subtask?.id)
                      );
                      const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");

                      return (
                        <div 
                          key={item.id} 
                          className={`flex items-start justify-between p-3 rounded-md transition-all ${item.type === 'subtask' ? 'bg-blue-50 dark:bg-blue-900/30' : item.type === 'slot-task' ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-muted/30'}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm flex flex-col gap-1">
                              {item.type === 'subtask' ? (
                                <>
                                  <span className={getItemTitleClasses(item)}>{item.subtask?.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {item.subtask?.parent_task_name}
                                  </span>
                                </>
                              ) : (
                                <span className={getItemTitleClasses(item)}>
                                  {getItemTitle(item)}
                                </span>
                              )}
                              {item.type === 'slot-task' && (
                                <Badge variant="secondary" className="mt-1 w-fit text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                                  Time Slot
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">{getItemProject(item)}</span> • {(() => {
                                try {
                                  // For slot-task, show the slot time range
                                  if (item.type === 'slot-task' && item.task?.slot_start_datetime) {
                                    const start = new Date(item.task.slot_start_datetime);
                                    const end = item.task.slot_end_datetime ? new Date(item.task.slot_end_datetime) : null;
                                    return end 
                                      ? `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
                                      : format(start, 'HH:mm');
                                  }
                                  // Check if scheduled_time is already a full datetime string
                                  if (item.scheduled_time.includes('T') || item.scheduled_time.includes(' ')) {
                                    return format(new Date(item.scheduled_time), 'HH:mm');
                                  }
                                  // Otherwise, combine date and time
                                  return format(new Date(`${item.scheduled_date}T${item.scheduled_time}`), 'HH:mm');
                                } catch (error) {
                                  return 'Invalid time';
                                }
                              })()}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            {activeEntry ? (
                              <>
                                <LiveTimer
                                  startTime={activeEntry.start_time}
                                  isPaused={isPaused}
                                  timerMetadata={activeEntry.timer_metadata}
                                />
                                <CompactTimerControls
                                  taskId={realTaskId || item.id}
                                  taskName={getItemTitle(item)}
                                  entryId={activeEntry.id}
                                  timerMetadata={activeEntry.timer_metadata}
                                  onTimerUpdate={() => {}}
                                />
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleStartTask(realTaskId || item.id, item.type === 'subtask')}
                                className="h-7 px-2"
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Collapsible>
    </Card>
  );
};
