import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Eye, ChevronDown, ChevronRight as ChevronRightIcon, Play } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WorkloadItem {
  id: string;
  type: 'task' | 'subtask' | 'routine' | 'sprint';
  scheduled_time: string;
  scheduled_date: string;
  task?: {
    id: string;
    name: string;
    status: string;
    project_name: string;
    client_name: string;
  };
  subtask?: {
    id: string;
    name: string;
    status: string;
    project_name: string;
    client_name: string;
    parent_task_name: string;
  };
  routine?: {
    id: string;
    title: string;
    client_name: string;
    project_name: string;
    frequency: string;
  };
  sprint?: {
    id: string;
    title: string;
    start_time: string | null;
    end_time: string | null;
    status: string;
    project_name?: string;
    client_name?: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'in progress': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    case 'not started': return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    case 'on hold': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    case 'on-head': return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
    case 'imp': return 'bg-red-500/20 text-red-700 border-red-500/30';
    case 'targeted': return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

const formatTimeSlot = (time: string) => {
  const hour = parseInt(time.split(':')[0]);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:00 ${ampm}`;
};

export const DashboardWorkloadCal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentHour, setCurrentHour] = useState<number>(new Date().getHours());
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});

  // Start timer mutation
  const startTimerMutation = useMutation({
    mutationFn: async ({ taskId, taskName, isSubtask }: { taskId: string; taskName: string; isSubtask: boolean }) => {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();

      if (!employee) throw new Error('Employee not found');

      const { error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          employee_id: employee.id,
          start_time: new Date().toISOString(),
          entry_type: isSubtask ? 'subtask' : 'task',
          timer_metadata: `Timer started for ${isSubtask ? 'subtask' : 'task'}: ${taskName}`
        });

      if (error) throw error;

      // Update status to In Progress
      const table = isSubtask ? 'subtasks' : 'tasks';
      await supabase.from(table).update({ status: 'In Progress' }).eq('id', taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-workload'] });
      queryClient.invalidateQueries({ queryKey: ['runningTasks'] });
      toast.success('Timer started!');
    },
    onError: () => toast.error('Failed to start timer'),
  });

  // Update current hour every minute
  useEffect(() => {
    const updateCurrentHour = () => {
      setCurrentHour(new Date().getHours());
    };
    updateCurrentHour();
    const interval = setInterval(updateCurrentHour, 60000);
    return () => clearInterval(interval);
  }, []);

  // Generate next 6 hours time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let i = 0; i < 6; i++) {
      const hour = (currentHour + i) % 24;
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, [currentHour]);

  // Get today's date string
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Fetch workload items for today
  const { data: workloadItems = [], isLoading } = useQuery({
    queryKey: ['dashboard-workload', todayStr],
    queryFn: async () => {
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
          project:projects!tasks_project_id_fkey(
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `)
        .or(`date.eq.${todayStr},and(scheduled_time.not.is.null,date.is.null)`)
        .not('scheduled_time', 'is', null);

      if (tasksError) throw tasksError;

      // Fetch tasks with deadline slots (slot_start_datetime)
      const { data: slotTasksData } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          slot_start_datetime,
          slot_end_datetime,
          project:projects!tasks_project_id_fkey(
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `)
        .gte('slot_start_datetime', `${todayStr}T00:00:00`)
        .lt('slot_start_datetime', `${todayStr}T23:59:59`);

      // Fetch subtasks
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          task:tasks!subtasks_task_id_fkey(
            name,
            project:projects!tasks_project_id_fkey(
              name,
              client:clients!projects_client_id_fkey(name)
            )
          )
        `)
        .or(`date.eq.${todayStr},and(scheduled_time.not.is.null,date.is.null)`)
        .not('scheduled_time', 'is', null);

      if (subtasksError) throw subtasksError;

      // Fetch routine completions
      const { data: routineData } = await supabase
        .from('routine_completions')
        .select(`
          id,
          completion_date,
          scheduled_time,
          routine:routines!routine_completions_routine_id_fkey(
            id,
            title,
            frequency,
            client:clients!routines_client_id_fkey(name),
            project:projects!routines_project_id_fkey(name)
          )
        `)
        .eq('completion_date', todayStr);

      // Fetch sprints for today
      const { data: sprintData } = await supabase
        .from('sprints')
        .select(`
          id,
          title,
          start_time,
          end_time,
          slot_date,
          status,
          project:projects!sprints_project_id_fkey(
            name,
            clients:clients!projects_client_id_fkey(name)
          )
        `)
        .eq('slot_date', todayStr);

      // Process tasks
      const filteredTasks = tasksData?.filter(task => {
        if (task.date === todayStr) return true;
        if (task.scheduled_time && !task.date) {
          const scheduledDate = task.scheduled_time.split(' ')[0];
          return scheduledDate === todayStr;
        }
        return false;
      }) || [];

      const taskItems: WorkloadItem[] = filteredTasks.map(task => {
        let scheduledTime = '09:00';
        if (task.scheduled_time) {
          if (task.scheduled_time.includes(' ')) {
            scheduledTime = task.scheduled_time.split(' ')[1].substring(0, 5);
          } else {
            scheduledTime = task.scheduled_time;
          }
        }
        return {
          id: task.id,
          type: 'task' as const,
          scheduled_date: todayStr,
          scheduled_time: scheduledTime,
          task: {
            id: task.id,
            name: task.name,
            status: task.status,
            project_name: task.project?.name || '',
            client_name: task.project?.client?.name || '',
          }
        };
      });

      // Process slot tasks
      const slotTaskItems: WorkloadItem[] = (slotTasksData || [])
        .filter(task => !filteredTasks.find(t => t.id === task.id))
        .map(task => {
          const slotStart = new Date(task.slot_start_datetime!);
          const scheduledTime = format(slotStart, 'HH:00');
          return {
            id: `slot-${task.id}`,
            type: 'task' as const,
            scheduled_date: todayStr,
            scheduled_time: scheduledTime,
            task: {
              id: task.id,
              name: task.name,
              status: task.status,
              project_name: task.project?.name || '',
              client_name: task.project?.client?.name || '',
            }
          };
        });

      // Process subtasks
      const filteredSubtasks = subtasksData?.filter(subtask => {
        if (subtask.date === todayStr) return true;
        if (subtask.scheduled_time && !subtask.date) {
          const scheduledDate = subtask.scheduled_time.split(' ')[0];
          return scheduledDate === todayStr;
        }
        return false;
      }) || [];

      const subtaskItems: WorkloadItem[] = filteredSubtasks.map(subtask => {
        let scheduledTime = '09:00';
        if (subtask.scheduled_time) {
          if (subtask.scheduled_time.includes(' ')) {
            scheduledTime = subtask.scheduled_time.split(' ')[1].substring(0, 5);
          } else {
            scheduledTime = subtask.scheduled_time;
          }
        }
        return {
          id: subtask.id,
          type: 'subtask' as const,
          scheduled_date: todayStr,
          scheduled_time: scheduledTime,
          subtask: {
            id: subtask.id,
            name: subtask.name,
            status: subtask.status,
            project_name: subtask.task?.project?.name || '',
            client_name: subtask.task?.project?.client?.name || '',
            parent_task_name: subtask.task?.name || ''
          }
        };
      });

      // Process routines
      const routineItems: WorkloadItem[] = (routineData || []).map(completion => ({
        id: completion.id,
        type: 'routine' as const,
        scheduled_date: todayStr,
        scheduled_time: completion.scheduled_time || '09:00',
        routine: {
          id: completion.routine.id,
          title: completion.routine.title,
          client_name: completion.routine.client?.name || '',
          project_name: completion.routine.project?.name || '',
          frequency: completion.routine.frequency
        }
      }));

      // Process sprints
      const sprintItems: WorkloadItem[] = (sprintData?.filter(sprint => sprint.start_time) || []).map(sprint => {
        let startTime = '09:00';
        if (sprint.start_time) {
          if (sprint.start_time.includes(' ')) {
            startTime = sprint.start_time.split(' ')[1].substring(0, 5);
          } else {
            startTime = sprint.start_time.substring(0, 5);
          }
        }
        return {
          id: sprint.id,
          type: 'sprint' as const,
          scheduled_date: todayStr,
          scheduled_time: startTime,
          sprint: {
            id: sprint.id,
            title: sprint.title,
            start_time: sprint.start_time,
            end_time: sprint.end_time,
            status: sprint.status,
            project_name: sprint.project?.name,
            client_name: sprint.project?.clients?.name
          }
        };
      });

      return [...taskItems, ...slotTaskItems, ...subtaskItems, ...routineItems, ...sprintItems];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Filter items to only show next 6 hours
  const filteredItems = useMemo(() => {
    return workloadItems.filter(item => {
      const itemHour = parseInt(item.scheduled_time.split(':')[0]);
      // Check if item is in the next 6 hours window
      for (let i = 0; i < 6; i++) {
        const slotHour = (currentHour + i) % 24;
        if (itemHour === slotHour) return true;
      }
      return false;
    });
  }, [workloadItems, currentHour]);

  // Group items by time slot
  const itemsByTime = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      // Round to nearest hour
      const hour = parseInt(item.scheduled_time.split(':')[0]);
      const timeKey = `${hour.toString().padStart(2, '0')}:00`;
      if (!acc[timeKey]) acc[timeKey] = [];
      acc[timeKey].push(item);
      return acc;
    }, {} as Record<string, WorkloadItem[]>);
  }, [filteredItems]);

  const toggleSlot = (slot: string) => {
    setExpandedSlots(prev => ({ ...prev, [slot]: !prev[slot] }));
  };

  const getItemTitle = (item: WorkloadItem) => {
    if (item.type === 'task') return item.task?.name;
    if (item.type === 'subtask') return item.subtask?.name;
    if (item.type === 'routine') return item.routine?.title;
    if (item.type === 'sprint') return item.sprint?.title;
    return 'Unknown';
  };

  const getItemProject = (item: WorkloadItem) => {
    if (item.type === 'task') return item.task?.project_name;
    if (item.type === 'subtask') return item.subtask?.project_name;
    if (item.type === 'routine') return item.routine?.project_name;
    if (item.type === 'sprint') return item.sprint?.project_name;
    return '';
  };

  const getItemStatus = (item: WorkloadItem) => {
    if (item.type === 'task') return item.task?.status;
    if (item.type === 'subtask') return item.subtask?.status;
    if (item.type === 'routine') return 'Routine';
    if (item.type === 'sprint') return item.sprint?.status;
    return '';
  };

  const totalItems = filteredItems.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Next 6 Hours
            <Badge variant="secondary" className="ml-2">{totalItems} items</Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/workload-cal')}
            className="text-xs"
          >
            <Eye className="h-4 w-4 mr-1" />
            Full Calendar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : totalItems === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No scheduled items for the next 6 hours
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {timeSlots.map((slot, index) => {
                const slotItems = itemsByTime[slot] || [];
                const isCurrentSlot = parseInt(slot.split(':')[0]) === currentHour;
                const isExpanded = expandedSlots[slot] ?? true;

                if (slotItems.length === 0) return null;

                return (
                  <div 
                    key={slot}
                    className={cn(
                      "border rounded-lg p-2",
                      isCurrentSlot && "border-primary bg-primary/5"
                    )}
                  >
                    <Collapsible open={isExpanded} onOpenChange={() => toggleSlot(slot)}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-1 hover:bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                          <span className="font-medium text-sm">{formatTimeSlot(slot)}</span>
                          <Badge variant="outline" className="text-xs">{slotItems.length}</Badge>
                          {isCurrentSlot && (
                            <Badge variant="default" className="text-xs">Now</Badge>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-1 mt-2 pl-6">
                          {slotItems.map(item => {
                            const itemId = item.type === 'task' ? item.task?.id : 
                                          item.type === 'subtask' ? item.subtask?.id : item.id;
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs capitalize shrink-0">
                                      {item.type}
                                    </Badge>
                                    <span className="text-sm font-medium truncate">
                                      {getItemTitle(item)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground truncate">
                                      {getItemProject(item)}
                                    </span>
                                    <Badge className={cn("text-xs", getStatusColor(getItemStatus(item) || ''))}>
                                      {getItemStatus(item)}
                                    </Badge>
                                  </div>
                                </div>
                                {(item.type === 'task' || item.type === 'subtask') && itemId && (
                                  <div className="shrink-0 ml-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startTimerMutation.mutate({
                                          taskId: itemId,
                                          taskName: getItemTitle(item) || '',
                                          isSubtask: item.type === 'subtask'
                                        });
                                      }}
                                      disabled={startTimerMutation.isPending || getItemStatus(item) === 'Completed'}
                                      className="h-7 w-7 p-0"
                                      title="Start Timer"
                                    >
                                      <Play className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardWorkloadCal;
