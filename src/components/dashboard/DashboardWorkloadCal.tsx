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
import CompactTimerControls from './CompactTimerControls';

interface WorkloadItem {
  id: string;
  type: 'task' | 'subtask' | 'routine' | 'sprint';
  scheduled_time: string;
  scheduled_date: string;
  project_id?: string;
  project_name?: string;
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

interface RunningTimer {
  id: string;
  task_id: string;
  entry_type: string;
  timer_metadata: string | null;
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
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [isSectionOpen, setIsSectionOpen] = useState(true);

  // Fetch running timers
  const { data: runningTimers = [] } = useQuery({
    queryKey: ['running-timers', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (!employee) return [];
      
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, task_id, entry_type, timer_metadata')
        .eq('employee_id', employee.id)
        .is('end_time', null);
      
      if (error) return [];
      return data as RunningTimer[];
    },
    refetchInterval: 30000,
  });

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
      queryClient.invalidateQueries({ queryKey: ['running-timers'] });
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

  // Fetch workload items for today ONLY
  const { data: workloadItems = [], isLoading } = useQuery({
    queryKey: ['dashboard-workload', todayStr],
    queryFn: async () => {
      // Fetch tasks with scheduled_time that match today's date
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          project_id,
          slot_start_datetime,
          slot_end_datetime,
          project:projects!tasks_project_id_fkey(
            id,
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `);

      if (tasksError) throw tasksError;

      // Fetch subtasks with scheduled_time
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          task:tasks!subtasks_task_id_fkey(
            id,
            name,
            project_id,
            project:projects!tasks_project_id_fkey(
              id,
              name,
              client:clients!projects_client_id_fkey(name)
            )
          )
        `);

      if (subtasksError) throw subtasksError;

      // Fetch routine completions for today
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
            project_id,
            client:clients!routines_client_id_fkey(name),
            project:projects!routines_project_id_fkey(id, name)
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
          project_id,
          project:projects!sprints_project_id_fkey(
            id,
            name,
            clients:clients!projects_client_id_fkey(name)
          )
        `)
        .eq('slot_date', todayStr);

      // Filter tasks - STRICTLY today's date only
      const filteredTasks = (tasksData || []).filter(task => {
        // Check if date field matches today
        if (task.date === todayStr) return true;
        
        // Check if scheduled_time contains today's date
        if (task.scheduled_time) {
          const scheduledParts = task.scheduled_time.split(' ');
          if (scheduledParts.length >= 1) {
            const scheduledDate = scheduledParts[0];
            // Only include if it's a valid date format and matches today
            if (scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
              return scheduledDate === todayStr;
            }
          }
        }
        
        // Check if slot_start_datetime is today
        if (task.slot_start_datetime) {
          const slotDate = task.slot_start_datetime.split('T')[0];
          return slotDate === todayStr;
        }
        
        return false;
      });

      const taskItems: WorkloadItem[] = filteredTasks.map(task => {
        let scheduledTime = '09:00';
        if (task.scheduled_time) {
          const parts = task.scheduled_time.split(' ');
          if (parts.length > 1) {
            scheduledTime = parts[1].substring(0, 5);
          } else if (parts[0].includes(':')) {
            scheduledTime = parts[0].substring(0, 5);
          }
        } else if (task.slot_start_datetime) {
          const slotTime = new Date(task.slot_start_datetime);
          scheduledTime = format(slotTime, 'HH:00');
        }
        
        return {
          id: task.id,
          type: 'task' as const,
          scheduled_date: todayStr,
          scheduled_time: scheduledTime,
          project_id: task.project?.id || task.project_id,
          task: {
            id: task.id,
            name: task.name,
            status: task.status,
            project_name: task.project?.name || '',
            client_name: task.project?.client?.name || '',
          }
        };
      });

      // Filter subtasks - STRICTLY today's date only
      const filteredSubtasks = (subtasksData || []).filter(subtask => {
        // Check if date field matches today
        if (subtask.date === todayStr) return true;
        
        // Check if scheduled_time contains today's date
        if (subtask.scheduled_time) {
          const scheduledParts = subtask.scheduled_time.split(' ');
          if (scheduledParts.length >= 1) {
            const scheduledDate = scheduledParts[0];
            if (scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
              return scheduledDate === todayStr;
            }
          }
        }
        
        return false;
      });

      const subtaskItems: WorkloadItem[] = filteredSubtasks.map(subtask => {
        let scheduledTime = '09:00';
        if (subtask.scheduled_time) {
          const parts = subtask.scheduled_time.split(' ');
          if (parts.length > 1) {
            scheduledTime = parts[1].substring(0, 5);
          } else if (parts[0].includes(':')) {
            scheduledTime = parts[0].substring(0, 5);
          }
        }
        
        return {
          id: subtask.id,
          type: 'subtask' as const,
          scheduled_date: todayStr,
          scheduled_time: scheduledTime,
          project_id: subtask.task?.project?.id || subtask.task?.project_id,
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
        project_id: completion.routine?.project?.id || completion.routine?.project_id,
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
          project_id: sprint.project?.id || sprint.project_id,
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

      return [...taskItems, ...subtaskItems, ...routineItems, ...sprintItems];
    },
    refetchInterval: 60000,
  });

  // Helper functions - defined before useMemo hooks that use them
  const getItemProject = (item: WorkloadItem) => {
    if (item.type === 'task') return item.task?.project_name;
    if (item.type === 'subtask') return item.subtask?.project_name;
    if (item.type === 'routine') return item.routine?.project_name;
    if (item.type === 'sprint') return item.sprint?.project_name;
    return '';
  };

  const getItemTitle = (item: WorkloadItem) => {
    if (item.type === 'task') return item.task?.name;
    if (item.type === 'subtask') return item.subtask?.name;
    if (item.type === 'routine') return item.routine?.title;
    if (item.type === 'sprint') return item.sprint?.title;
    return 'Unknown';
  };

  // First filter items to only show next 6 hours (before project filter)
  const itemsInNext6Hours = useMemo(() => {
    return workloadItems.filter(item => {
      const itemHour = parseInt(item.scheduled_time.split(':')[0]);
      for (let i = 0; i < 6; i++) {
        const slotHour = (currentHour + i) % 24;
        if (itemHour === slotHour) return true;
      }
      return false;
    });
  }, [workloadItems, currentHour]);

  // Get unique projects from items in next 6 hours
  const availableProjects = useMemo(() => {
    const projectMap = new Map<string, string>();
    itemsInNext6Hours.forEach(item => {
      const projectId = item.project_id;
      const projectName = getItemProject(item);
      if (projectId && projectName && !projectMap.has(projectId)) {
        projectMap.set(projectId, projectName);
      }
    });
    return Array.from(projectMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsInNext6Hours]);

  // Apply project filter
  const filteredItems = useMemo(() => {
    if (selectedProject === 'all') return itemsInNext6Hours;
    return itemsInNext6Hours.filter(item => item.project_id === selectedProject);
  }, [itemsInNext6Hours, selectedProject]);

  // Group items by time slot
  const itemsByTime = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
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

  const getItemStatus = (item: WorkloadItem) => {
    if (item.type === 'task') return item.task?.status;
    if (item.type === 'subtask') return item.subtask?.status;
    if (item.type === 'routine') return 'Routine';
    if (item.type === 'sprint') return item.sprint?.status;
    return '';
  };

  const getRunningTimer = (taskId: string, isSubtask: boolean) => {
    return runningTimers.find(t => 
      t.task_id === taskId && 
      t.entry_type === (isSubtask ? 'subtask' : 'task')
    );
  };

  const totalItems = filteredItems.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <Collapsible open={isSectionOpen} onOpenChange={setIsSectionOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {isSectionOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                <Clock className="h-5 w-5" />
                Next 6 Hours
                <Badge variant="secondary" className="ml-2">{totalItems} items</Badge>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/workload-cal');
                }}
                className="text-xs"
              >
                <Eye className="h-4 w-4 mr-1" />
                Full Calendar
              </Button>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            {/* Tab-style Project Filter */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t">
              <Button
                variant={selectedProject === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSelectedProject('all')}
              >
                All
              </Button>
              {availableProjects.map(project => (
                <Button
                  key={project.id}
                  variant={selectedProject === project.id ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSelectedProject(project.id)}
                  title={project.name}
                >
                  {project.name}
                </Button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
      
      <Collapsible open={isSectionOpen} onOpenChange={setIsSectionOpen}>
        <CollapsibleContent>
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
                  {timeSlots.map((slot) => {
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
                                const isSubtask = item.type === 'subtask';
                                const runningTimer = (item.type === 'task' || item.type === 'subtask') && itemId 
                                  ? getRunningTimer(itemId, isSubtask)
                                  : null;
                                
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
                                        {runningTimer ? (
                                          <CompactTimerControls
                                            taskId={itemId}
                                            taskName={getItemTitle(item) || ''}
                                            entryId={runningTimer.id}
                                            timerMetadata={runningTimer.timer_metadata}
                                            onTimerUpdate={() => {
                                              queryClient.invalidateQueries({ queryKey: ['dashboard-workload'] });
                                              queryClient.invalidateQueries({ queryKey: ['running-timers'] });
                                            }}
                                            isSubtask={isSubtask}
                                          />
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              startTimerMutation.mutate({
                                                taskId: itemId,
                                                taskName: getItemTitle(item) || '',
                                                isSubtask
                                              });
                                            }}
                                            disabled={startTimerMutation.isPending || getItemStatus(item) === 'Completed'}
                                            className="h-7 w-7 p-0"
                                            title="Start Timer"
                                          >
                                            <Play className="h-4 w-4" />
                                          </Button>
                                        )}
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default DashboardWorkloadCal;
