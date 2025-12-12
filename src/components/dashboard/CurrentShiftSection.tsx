import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Clock } from 'lucide-react';
import { format, addHours, startOfHour, isWithinInterval } from 'date-fns';
import LiveTimer from './LiveTimer';
import CompactTimerControls from './CompactTimerControls';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface WorkloadItem {
  id: string;
  type: 'task' | 'subtask' | 'routine' | 'sprint';
  scheduled_time: string;
  scheduled_date: string;
  task?: {
    id: string;
    name: string;
    status: string;
    assignee?: { name: string };
    project?: { name: string; client?: { name: string } };
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

  // Get current time and next 6 hours
  const now = new Date();
  const next6Hours = addHours(now, 6);

  // Define the 4 shifts - Shift D spans midnight
  const shifts = [
    { id: 'A', label: 'Shift A (12 AM - 6 AM)', start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0) },
    { id: 'B', label: 'Shift B (6 AM - 12 PM)', start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0) },
    { id: 'C', label: 'Shift C (12 PM - 6 PM)', start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0) },
    { id: 'D', label: 'Shift D (6 PM - 12 AM)', start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0) },
  ];

  // Also create shifts for tomorrow in case items were assigned with tomorrow's date
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowShifts = [
    { id: 'A', label: 'Tomorrow Shift A (12 AM - 6 AM)', start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0), end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 6, 0) },
    { id: 'B', label: 'Tomorrow Shift B (6 AM - 12 PM)', start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 6, 0), end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0) },
    { id: 'C', label: 'Tomorrow Shift C (12 PM - 6 PM)', start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0), end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 18, 0) },
    { id: 'D', label: 'Tomorrow Shift D (6 PM - 12 AM)', start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 18, 0), end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1, 0, 0) },
  ];


  // Helper functions
  const getItemTitle = (item: WorkloadItem) => {
    switch (item.type) {
      case 'task':
        return item.task?.name || 'Unknown Task';
      case 'subtask':
        return `${item.subtask?.parent_task_name} > ${item.subtask?.name}` || 'Unknown Subtask';
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

  // Fetch workload items for today and next few days (to cover all possible assignments)
  const { data: workloadItems = [], isLoading } = useQuery({
    queryKey: ['current-shift-workload', now.toISOString().split('T')[0]],
    queryFn: async () => {
      const today = now.toISOString().split('T')[0];
      const tomorrowDate = addHours(now, 24).toISOString().split('T')[0];
      const dayAfter = addHours(now, 48).toISOString().split('T')[0];

      // Fetch tasks for today and next few days (broader than WorkloadCal to catch all assignments)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          assignee:employees!tasks_assignee_id_fkey(name),
          project:projects!tasks_project_id_fkey(
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `)
        .or(`date.eq.${today},date.eq.${tomorrowDate},date.eq.${dayAfter},and(scheduled_time.not.is.null,date.is.null)`)
        .not('scheduled_time', 'is', null);

      if (tasksError) throw tasksError;

      // Fetch subtasks for today and next few days (broader than WorkloadCal to catch all assignments)
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
        .or(`date.eq.${today},date.eq.${tomorrowDate},date.eq.${dayAfter},and(scheduled_time.not.is.null,date.is.null)`)
        .not('scheduled_time', 'is', null);

      if (subtasksError) throw subtasksError;

      // Combine and format the data
      const workloadItems: WorkloadItem[] = [];

      // Add tasks
      tasksData?.forEach(task => {
        if (task.scheduled_time) {
          // If no date but has scheduled_time, assume it's for today
          const effectiveDate = task.date || today;
          const scheduledDateTime = parseScheduledTime(task.scheduled_time, effectiveDate);

          // For debugging, include all items from today/tomorrow, we'll filter by shift later
          if (scheduledDateTime) {
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
                project: task.project
              }
            });
          }
        }
      });

      // Add subtasks
      subtasksData?.forEach(subtask => {
        if (subtask.scheduled_time) {
          // If no date but has scheduled_time, assume it's for today
          const effectiveDate = subtask.date || today;
          const scheduledDateTime = parseScheduledTime(subtask.scheduled_time, effectiveDate);

          // For debugging, include all items from today/tomorrow, we'll filter by shift later
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

  // Group workload items by shifts (check both today's and tomorrow's shifts)
  const allShifts = [...shifts, ...tomorrowShifts];
  const itemsByShift = shifts.map(todayShift => {
    const shiftItems = workloadItems.filter(item => {
      const itemDateTime = parseScheduledTime(item.scheduled_time, item.scheduled_date);

      // Check if item falls in today's shift
      const isInTodayShift = itemDateTime && isWithinInterval(itemDateTime, {
        start: todayShift.start,
        end: todayShift.end
      });

      // Also check tomorrow's corresponding shift if the item is within next 6 hours
      const tomorrowShift = tomorrowShifts.find(s => s.id === todayShift.id);
      const isInTomorrowShift = tomorrowShift && itemDateTime && isWithinInterval(itemDateTime, {
        start: tomorrowShift.start,
        end: tomorrowShift.end
      }) && isWithinInterval(itemDateTime, { start: now, end: next6Hours });

      const isInInterval = isInTodayShift || isInTomorrowShift;

      return isInInterval;
    });

    return {
      ...todayShift,
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
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Loading current shift...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <h2 className="text-lg font-semibold">Current Shift</h2>
              <Badge variant="outline" className="text-xs">
                Next 6 Hours
              </Badge>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 mt-4">
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
                      const activeEntry = activeEntries.find(entry =>
                        entry.task_id === item.id ||
                        (item.type === 'subtask' && entry.task_id === item.subtask?.id)
                      );
                      const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");

                      return (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {getItemTitle(item)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getItemProject(item)} • {(() => {
                                try {
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

                          <div className="flex items-center gap-1 ml-2">
                            {activeEntry ? (
                              <>
                                <LiveTimer
                                  startTime={activeEntry.start_time}
                                  isPaused={isPaused}
                                  timerMetadata={activeEntry.timer_metadata}
                                />
                                <CompactTimerControls
                                  taskId={item.id}
                                  taskName={getItemTitle(item)}
                                  entryId={activeEntry.id}
                                  timerMetadata={activeEntry.timer_metadata}
                                  onTimerUpdate={() => {}}
                                />
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleStartTask(item.id, item.type === 'subtask')}
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
