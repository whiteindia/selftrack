import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, Plus, X, Repeat, Search, ChevronDown, Filter } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import Navigation from '@/components/Navigation';
import TaskTimer from '@/components/TaskTimer';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

interface Task {
  id: string;
  name: string;
  assignee_name?: string;
  assigner?: {
    name: string;
  };
  sprint_name?: string;
  project_name: string;
  client_name: string;
  status: string;
  scheduled_time?: string;
}

interface Subtask {
  id: string;
  name: string;
  assignee_name?: string;
  assigner?: {
    name: string;
  };
  project_name: string;
  client_name: string;
  status: string;
  scheduled_time?: string;
  parent_task_name: string;
}

interface Sprint {
  id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  slot_date: string | null;
  estimated_hours: number | null;
  status: string;
  sprint_leader?: {
    name: string;
  };
  project?: {
    name: string;
    clients: {
      name: string;
    };
  };
}

interface WorkloadItem {
  id: string;
  type: 'task' | 'subtask' | 'routine' | 'sprint';
  scheduled_time: string;
  scheduled_date: string;
  task?: Task;
  subtask?: Subtask;
  routine?: {
    id: string;
    title: string;
    client_name: string;
    project_name: string;
    frequency: string;
  };
  sprint?: Sprint;
}

interface Routine {
  id: string;
  title: string;
  frequency: string;
  preferred_days: string[] | null;
  start_date: string;
  client: { name: string; id: string };
  project: { name: string; id: string };
}

const WorkloadCal = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAssignRoutineDialogOpen, setIsAssignRoutineDialogOpen] = useState(false);
  const [isAssignSubtaskDialogOpen, setIsAssignSubtaskDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isClearSubtaskDialogOpen, setIsClearSubtaskDialogOpen] = useState(false);
  const [isClearRoutinesDialogOpen, setIsClearRoutinesDialogOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [assignDialogClient, setAssignDialogClient] = useState<string>('');
  const [assignDialogProject, setAssignDialogProject] = useState<string>('');
  const [routineDialogClient, setRoutineDialogClient] = useState<string>('');
  const [routineDialogProject, setRoutineDialogProject] = useState<string>('');
  const [subtaskDialogClient, setSubtaskDialogClient] = useState<string>('');
  const [subtaskDialogProject, setSubtaskDialogProject] = useState<string>('');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [routineSearchQuery, setRoutineSearchQuery] = useState('');
  const [subtaskSearchQuery, setSubtaskSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [currentHour, setCurrentHour] = useState<number>(new Date().getHours());
  
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const currentSlotRef = useRef<HTMLDivElement>(null);

  // Update current hour every minute
  useEffect(() => {
    const updateCurrentHour = () => {
      setCurrentHour(new Date().getHours());
    };

    updateCurrentHour();
    const interval = setInterval(updateCurrentHour, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current slot
  useEffect(() => {
    const scrollToCurrentSlot = () => {
      if (currentSlotRef.current) {
        const element = currentSlotRef.current;
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;
        const middle = absoluteElementTop - 80;
        
        window.scrollTo({
          top: middle,
          behavior: 'smooth'
        });
      }
    };

    const timer = setTimeout(scrollToCurrentSlot, 800);
    return () => clearTimeout(timer);
  }, [selectedDate, currentHour]);

  // Generate time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  // Fetch workload items for the selected date - UPDATED to correctly identify tasks vs subtasks
  const { data: workloadItems = [], isLoading } = useQuery({
    queryKey: ['workload-assignments', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('Fetching workload items for date:', dateStr);
      
      // Fetch tasks (both direct assignments and followup assignments)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          assignee:employees!tasks_assignee_id_fkey(name),
          assigner:employees!tasks_assigner_id_fkey(name),
          project:projects!tasks_project_id_fkey(
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `)
        .or(`date.eq.${dateStr},and(scheduled_time.not.is.null,date.is.null)`)
        .not('scheduled_time', 'is', null);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }

      // Fetch subtasks (both direct assignments and followup assignments)
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          assignee:employees!subtasks_assignee_id_fkey(name),
          assigner:employees!subtasks_assigner_id_fkey(name),
          task:tasks!subtasks_task_id_fkey(
            name,
            project:projects!tasks_project_id_fkey(
              name,
              client:clients!projects_client_id_fkey(name)
            )
          )
        `)
        .or(`date.eq.${dateStr},and(scheduled_time.not.is.null,date.is.null)`)
        .not('scheduled_time', 'is', null);

      if (subtasksError) {
        console.error('Error fetching subtasks:', subtasksError);
        throw subtasksError;
      }

      // Filter tasks that have scheduled_time matching today's date
      const filteredTasks = tasksData?.filter(task => {
        if (task.date === dateStr) return true;
        if (task.scheduled_time && !task.date) {
          // For items assigned via followup without date, check if scheduled_time matches today
          const scheduledDate = task.scheduled_time.split(' ')[0];
          return scheduledDate === dateStr;
        }
        return false;
      }) || [];

      // Filter subtasks that have scheduled_time matching today's date
      const filteredSubtasks = subtasksData?.filter(subtask => {
        if (subtask.date === dateStr) return true;
        if (subtask.scheduled_time && !subtask.date) {
          // For items assigned via followup without date, check if scheduled_time matches today
          const scheduledDate = subtask.scheduled_time.split(' ')[0];
          return scheduledDate === dateStr;
        }
        return false;
      }) || [];

      // Fetch routine completions
      const { data: routineData, error: routineError } = await supabase
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
        .eq('completion_date', dateStr);

      if (routineError) {
        console.error('Error fetching routine completions:', routineError);
        throw routineError;
      }

      // Get sprint information for tasks
      const taskIds = filteredTasks?.map(task => task.id) || [];
      let sprintData: any[] = [];
      
      if (taskIds.length > 0) {
        const { data: sprints, error: sprintError } = await supabase
          .from('sprint_tasks')
          .select(`
            task_id,
            sprint:sprints!sprint_tasks_sprint_id_fkey(name)
          `)
          .in('task_id', taskIds);

        if (sprintError) {
          console.error('Error fetching sprints:', sprintError);
        } else {
          sprintData = sprints || [];
        }
      }

      // Process tasks - FIXED to properly identify as tasks
      const taskItems: WorkloadItem[] = filteredTasks?.map(task => {
        const sprintInfo = sprintData.find(s => s.task_id === task.id);
        let scheduledTime = '09:00';
        
        if (task.scheduled_time) {
          if (task.scheduled_time.includes(' ')) {
            // Format: "2024-07-01 14:00:00" - extract time part
            scheduledTime = task.scheduled_time.split(' ')[1].substring(0, 5);
          } else {
            // Format: "14:00"
            scheduledTime = task.scheduled_time;
          }
        }
        
        return {
          id: task.id,
          type: 'task' as const, // FIXED: Always set as 'task' for tasks table items
          scheduled_date: dateStr,
          scheduled_time: scheduledTime,
          task: {
            id: task.id,
            name: task.name,
            assignee_name: task.assignee?.name || 'Unassigned',
            assigner: task.assigner, // Keep the full assigner object
            sprint_name: sprintInfo?.sprint?.name || null,
            project_name: task.project?.name || '',
            client_name: task.project?.client?.name || '',
            status: task.status,
            scheduled_time: task.scheduled_time
          }
        };
      }) || [];

      // Process subtasks - FIXED to properly identify as subtasks
      const subtaskItems: WorkloadItem[] = filteredSubtasks?.map(subtask => {
        let scheduledTime = '09:00';
        
        if (subtask.scheduled_time) {
          if (subtask.scheduled_time.includes(' ')) {
            // Format: "2024-07-01 14:00:00" - extract time part
            scheduledTime = subtask.scheduled_time.split(' ')[1].substring(0, 5);
          } else {
            // Format: "14:00"
            scheduledTime = subtask.scheduled_time;
          }
        }
        
        return {
          id: subtask.id,
          type: 'subtask' as const, // FIXED: Always set as 'subtask' for subtasks table items
          scheduled_date: dateStr,
          scheduled_time: scheduledTime,
          subtask: {
            id: subtask.id,
            name: subtask.name,
            assignee_name: subtask.assignee?.name || 'Unassigned',
            assigner: subtask.assigner, // Keep the full assigner object
            project_name: subtask.task?.project?.name || '',
            client_name: subtask.task?.project?.client?.name || '',
            status: subtask.status,
            scheduled_time: subtask.scheduled_time,
            parent_task_name: subtask.task?.name || ''
          }
        };
      }) || [];

      // Process routine completions
      const routineItems: WorkloadItem[] = routineData?.map(completion => ({
        id: completion.id,
        type: 'routine' as const,
        scheduled_date: dateStr,
        scheduled_time: completion.scheduled_time || '09:00',
        routine: {
          id: completion.routine.id,
          title: completion.routine.title,
          client_name: completion.routine.client?.name || '',
          project_name: completion.routine.project?.name || '',
          frequency: completion.routine.frequency
        }
      })) || [];

      // Fetch sprint time slots for the selected date
      console.log('Fetching sprint time slots for date:', dateStr);
      const { data: sprintTimeSlotsData, error: sprintTimeSlotsError } = await supabase
        .from('sprints')
        .select(`
          id,
          title,
          start_time,
          end_time,
          slot_date,
          estimated_hours,
          status,
          sprint_leader:employees!sprints_sprint_leader_id_fkey(name),
          project:projects!sprints_project_id_fkey(
            name,
            clients:clients!projects_client_id_fkey(name)
          )
        `)
        .eq('slot_date', dateStr);

      if (sprintTimeSlotsError) {
        console.error('Error fetching sprint time slots:', sprintTimeSlotsError);
      } else {
        console.log('Sprint time slots found:', sprintTimeSlotsData?.length || 0);
        console.log('Sprint time slots data:', sprintTimeSlotsData);
        
        // Filter out sprints without start_time and log them
        const sprintsWithStartTime = sprintTimeSlotsData?.filter(sprint => sprint.start_time) || [];
        const sprintsWithoutStartTime = sprintTimeSlotsData?.filter(sprint => !sprint.start_time) || [];
        
        console.log('Sprints with start_time:', sprintsWithStartTime.length);
        console.log('Sprints without start_time:', sprintsWithoutStartTime.length);
        
        if (sprintsWithoutStartTime.length > 0) {
          console.log('Sprints without start_time:', sprintsWithoutStartTime.map(s => ({ id: s.id, title: s.title, slot_date: s.slot_date })));
        }
      }

      // Process sprint time slots (only those with start_time)
      const sprintItems: WorkloadItem[] = [];
      
      (sprintTimeSlotsData?.filter(sprint => sprint.start_time) || []).forEach(sprint => {
        console.log('Processing sprint:', sprint.title, 'start_time:', sprint.start_time, 'end_time:', sprint.end_time, 'slot_date:', sprint.slot_date);
        
        let startTime = '09:00';
        let endTime = '10:00';
        
        if (sprint.start_time) {
          // Handle different time formats for start time
          if (sprint.start_time.includes(' ')) {
            // Format: "2024-07-01 14:00:00" - extract time part
            startTime = sprint.start_time.split(' ')[1].substring(0, 5);
          } else {
            // Format: "14:00" or "14:00:00"
            startTime = sprint.start_time.substring(0, 5);
          }
        }
        
        if (sprint.end_time) {
          // Handle different time formats for end time
          if (sprint.end_time.includes(' ')) {
            // Format: "2024-07-01 18:00:00" - extract time part
            endTime = sprint.end_time.split(' ')[1].substring(0, 5);
          } else {
            // Format: "18:00" or "18:00:00"
            endTime = sprint.end_time.substring(0, 5);
          }
        }
        
        // Calculate start and end hours
        const startHour = parseInt(startTime.split(':')[0]);
        const endHour = parseInt(endTime.split(':')[0]);
        
        console.log(`Sprint spans from ${startHour}:00 to ${endHour}:00`);
        
        // Create a workload item for each hour slot that the sprint spans
        for (let hour = startHour; hour < endHour; hour++) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
          console.log(`Creating sprint item for time slot: ${timeSlot}`);
          
          sprintItems.push({
            id: `${sprint.id}-${timeSlot}`, // Unique ID for each time slot
            type: 'sprint' as const,
            scheduled_date: dateStr,
            scheduled_time: timeSlot,
            sprint: {
              id: sprint.id,
              title: sprint.title,
              start_time: sprint.start_time,
              end_time: sprint.end_time,
              slot_date: sprint.slot_date,
              estimated_hours: sprint.estimated_hours,
              status: sprint.status,
              sprint_leader: sprint.sprint_leader,
              project: sprint.project
            }
          });
        }
      });

      const allItems = [...taskItems, ...subtaskItems, ...routineItems, ...sprintItems];
      console.log('Processed workload items:', allItems);
      console.log('Tasks:', taskItems.length, 'Subtasks:', subtaskItems.length, 'Routines:', routineItems.length, 'Sprint Time Slots:', sprintItems.length);
      return allItems;
    }
  });

  // Fetch available tasks for assignment
  const { data: availableTasks = [] } = useQuery({
    queryKey: ['available-tasks', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          date,
          scheduled_time,
          project:projects!tasks_project_id_fkey(
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `)
        .neq('status', 'Completed')
        .or(`date.is.null,date.neq.${dateStr},scheduled_time.is.null`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching available tasks:', error);
        throw error;
      }

      return data?.map(task => ({
        id: task.id,
        name: task.name,
        project_name: task.project?.name || '',
        client_name: task.project?.client?.name || '',
        status: task.status
      })) || [];
    }
  });

  // Fetch available routines for assignment
  const { data: availableRoutines = [] } = useQuery({
    queryKey: ['available-routines', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data: allRoutines, error: routinesError } = await supabase
        .from('routines')
        .select(`
          *,
          client:clients!routines_client_id_fkey(id, name),
          project:projects!routines_project_id_fkey(id, name)
        `)
        .order('created_at', { ascending: false });

      if (routinesError) {
        console.error('Error fetching routines:', routinesError);
        throw routinesError;
      }

      const { data: assignedRoutines, error: assignedError } = await supabase
        .from('routine_completions')
        .select('routine_id')
        .eq('completion_date', dateStr);

      if (assignedError) {
        console.error('Error fetching assigned routines:', assignedError);
        throw assignedError;
      }

      const assignedRoutineIds = assignedRoutines?.map(r => r.routine_id) || [];
      
      const availableRoutines = allRoutines?.filter(routine => 
        !assignedRoutineIds.includes(routine.id)
      ) || [];

      return availableRoutines as Routine[];
    }
  });

  // Fetch available subtasks for assignment
  const { data: availableSubtasks = [] } = useQuery({
    queryKey: ['available-subtasks', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('subtasks')
        .select(`
          id,
          name,
          status,
          date,
          scheduled_time,
          task:tasks!subtasks_task_id_fkey(
            name,
            project:projects!tasks_project_id_fkey(
              name,
              client:clients!projects_client_id_fkey(name)
            )
          )
        `)
        .neq('status', 'Completed')
        .or(`date.is.null,date.neq.${dateStr},scheduled_time.is.null`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching available subtasks:', error);
        throw error;
      }

      return data?.map(subtask => ({
        id: subtask.id,
        name: subtask.name,
        parent_task_name: subtask.task?.name || '',
        project_name: subtask.task?.project?.name || '',
        client_name: subtask.task?.project?.client?.name || '',
        status: subtask.status
      })) || [];
    }
  });

  // Get unique clients and projects for filters
  const clients = [...new Set(workloadItems.map(item => {
    if (item.type === 'task') return item.task?.client_name;
    if (item.type === 'subtask') return item.subtask?.client_name;
    return item.routine?.client_name;
  }))].filter(Boolean);
  
  const projects = selectedClient === 'all' 
    ? [...new Set(workloadItems.map(item => {
        if (item.type === 'task') return item.task?.project_name;
        if (item.type === 'subtask') return item.subtask?.project_name;
        return item.routine?.project_name;
      }))].filter(Boolean)
    : [...new Set(workloadItems.filter(item => {
        let clientName;
        if (item.type === 'task') clientName = item.task?.client_name;
        else if (item.type === 'subtask') clientName = item.subtask?.client_name;
        else clientName = item.routine?.client_name;
        return clientName === selectedClient;
      }).map(item => {
        if (item.type === 'task') return item.task?.project_name;
        if (item.type === 'subtask') return item.subtask?.project_name;
        return item.routine?.project_name;
      }))].filter(Boolean);

  // Get unique clients and projects from available tasks for assignment dialog
  const assignClients = [...new Set(availableTasks.map(t => t.client_name))].filter(Boolean);
  const assignProjects = assignDialogClient === 'all' || !assignDialogClient
    ? [...new Set(availableTasks.map(t => t.project_name))].filter(Boolean)
    : [...new Set(availableTasks.filter(t => t.client_name === assignDialogClient).map(t => t.project_name))].filter(Boolean);

  // Get unique clients and projects from routines for assignment dialog
  const routineClients = [...new Set(availableRoutines.map(r => r.client.name))].filter(Boolean);
  const routineProjects = routineDialogClient === 'all' || !routineDialogClient
    ? [...new Set(availableRoutines.map(r => r.project.name))].filter(Boolean)
    : [...new Set(availableRoutines.filter(r => r.client.name === routineDialogClient).map(r => r.project.name))].filter(Boolean);

  // Get unique clients and projects from subtasks for assignment dialog
  const subtaskClients = [...new Set(availableSubtasks.map(s => s.client_name))].filter(Boolean);
  const subtaskProjects = subtaskDialogClient === 'all' || !subtaskDialogClient
    ? [...new Set(availableSubtasks.map(s => s.project_name))].filter(Boolean)
    : [...new Set(availableSubtasks.filter(s => s.client_name === subtaskDialogClient).map(s => s.project_name))].filter(Boolean);

  // Reset project selection when client changes
  useEffect(() => {
    if (selectedClient !== 'all') {
      setSelectedProject('all');
    }
  }, [selectedClient]);

  // Filter workload items based on selected filters
  const filteredWorkloadItems = workloadItems.filter(item => {
    let clientName, projectName;
    if (item.type === 'task') {
      clientName = item.task?.client_name;
      projectName = item.task?.project_name;
    } else if (item.type === 'subtask') {
      clientName = item.subtask?.client_name;
      projectName = item.subtask?.project_name;
    } else {
      clientName = item.routine?.client_name;
      projectName = item.routine?.project_name;
    }
    
    if (selectedClient !== 'all' && clientName !== selectedClient) return false;
    if (selectedProject !== 'all' && projectName !== selectedProject) return false;
    return true;
  });

  // Filter available tasks for assignment dialog
  const filteredAvailableTasks = availableTasks.filter(task => {
    if (assignDialogClient && assignDialogClient !== 'all' && task.client_name !== assignDialogClient) return false;
    if (assignDialogProject && assignDialogProject !== 'all' && task.project_name !== assignDialogProject) return false;
    if (taskSearchQuery && !task.name.toLowerCase().includes(taskSearchQuery.toLowerCase())) return false;
    return true;
  });

  // Filter available routines for assignment dialog
  const filteredAvailableRoutines = availableRoutines.filter(routine => {
    if (routineDialogClient && routineDialogClient !== 'all' && routine.client.name !== routineDialogClient) return false;
    if (routineDialogProject && routineDialogProject !== 'all' && routine.project.name !== routineDialogProject) return false;
    if (routineSearchQuery && !routine.title.toLowerCase().includes(routineSearchQuery.toLowerCase())) return false;
    return true;
  });

  // Filter available subtasks for assignment dialog
  const filteredAvailableSubtasks = availableSubtasks.filter(subtask => {
    if (subtaskDialogClient && subtaskDialogClient !== 'all' && subtask.client_name !== subtaskDialogClient) return false;
    if (subtaskDialogProject && subtaskDialogProject !== 'all' && subtask.project_name !== subtaskDialogProject) return false;
    if (subtaskSearchQuery && !subtask.name.toLowerCase().includes(subtaskSearchQuery.toLowerCase())) return false;
    return true;
  });

  // Filter workload items for clear dialog
  const inProgressItems = workloadItems.filter(item => 
    (item.type === 'task' && item.task?.status === 'In Progress') ||
    (item.type === 'subtask' && item.subtask?.status === 'In Progress')
  );

  const routineItems = workloadItems.filter(item => item.type === 'routine');

  // Group workload items by time slot
  const itemsByTime = filteredWorkloadItems.reduce((acc, item) => {
    const time = item.scheduled_time;
    if (!acc[time]) acc[time] = [];
    acc[time].push(item);
    return acc;
  }, {} as Record<string, WorkloadItem[]>);

  // Assign task mutation
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, timeSlot }: { taskId: string; timeSlot: string }) => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('tasks')
        .update({
          date: dateStr,
          scheduled_time: timeSlot
        })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      setIsAssignDialogOpen(false);
      setSelectedTimeSlot('');
      setAssignDialogClient('');
      setAssignDialogProject('');
      toast.success('Task assigned successfully');
    },
    onError: (error) => {
      console.error('Assignment mutation error:', error);
      toast.error('Failed to assign task');
    }
  });

  // Create routine completion mutation
  const createRoutineCompletionMutation = useMutation({
    mutationFn: async ({ routineId, timeSlot }: { routineId: string; timeSlot: string }) => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('routine_completions')
        .insert({
          routine_id: routineId,
          completion_date: dateStr,
          scheduled_time: timeSlot,
          user_id: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-routines'] });
      setIsAssignRoutineDialogOpen(false);
      setSelectedTimeSlot('');
      setRoutineDialogClient('');
      setRoutineDialogProject('');
      toast.success('Routine assigned successfully');
    },
    onError: (error) => {
      console.error('Routine assignment mutation error:', error);
      toast.error('Failed to assign routine');
    }
  });

  // Assign subtask mutation
  const assignSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, timeSlot }: { subtaskId: string; timeSlot: string }) => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('subtasks')
        .update({
          date: dateStr,
          scheduled_time: timeSlot
        })
        .eq('id', subtaskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-subtasks'] });
      setIsAssignSubtaskDialogOpen(false);
      setSelectedTimeSlot('');
      setSubtaskDialogClient('');
      setSubtaskDialogProject('');
      toast.success('Subtask assigned successfully');
    },
    onError: (error) => {
      console.error('Subtask assignment mutation error:', error);
      toast.error('Failed to assign subtask');
    }
  });

  // Clear assignment mutation
  const clearAssignmentMutation = useMutation({
    mutationFn: async ({ itemId, itemType }: { itemId: string; itemType: 'task' | 'subtask' }) => {
      const table = itemType === 'task' ? 'tasks' : 'subtasks';
      const { error } = await supabase
        .from(table)
        .update({
          scheduled_time: null
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['available-subtasks'] });
      toast.success('Assignment cleared successfully');
    },
    onError: (error) => {
      console.error('Clear assignment mutation error:', error);
      toast.error('Failed to clear assignment');
    }
  });

  const clearRoutineCompletionMutation = useMutation({
    mutationFn: async (completionId: string) => {
      const { error } = await supabase
        .from('routine_completions')
        .delete()
        .eq('id', completionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-routines'] });
      toast.success('Routine assignment cleared successfully');
    },
    onError: (error) => {
      console.error('Clear routine completion mutation error:', error);
      toast.error('Failed to clear routine assignment');
    }
  });

  const handleAssignTask = (taskId: string) => {
    if (!selectedTimeSlot) {
      toast.error('Please select a time slot');
      return;
    }
    assignTaskMutation.mutate({ taskId, timeSlot: selectedTimeSlot });
  };

  const handleAssignSubtask = (subtaskId: string) => {
    if (!selectedTimeSlot) {
      toast.error('Please select a time slot');
      return;
    }
    assignSubtaskMutation.mutate({ subtaskId, timeSlot: selectedTimeSlot });
  };

  const handleAssignRoutine = (routineId: string) => {
    if (!selectedTimeSlot) {
      toast.error('Please select a time slot');
      return;
    }
    createRoutineCompletionMutation.mutate({ routineId, timeSlot: selectedTimeSlot });
  };

  const handleOpenAssignDialog = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setIsAssignDialogOpen(true);
  };

  const handleOpenAssignSubtaskDialog = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setIsAssignSubtaskDialogOpen(true);
  };

  const handleOpenAssignRoutineDialog = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setIsAssignRoutineDialogOpen(true);
  };

  const handleClearAssignment = (itemId: string, itemType: 'task' | 'subtask' | 'routine' | 'sprint') => {
    if (itemType === 'task' || itemType === 'subtask') {
      clearAssignmentMutation.mutate({ itemId, itemType });
    } else if (itemType === 'routine') {
      clearRoutineCompletionMutation.mutate(itemId);
    }
    // Note: Sprints cannot be cleared from workload calendar as they are time slots
  };

  const formatTimeSlot = (time: string) => {
    const [hour] = time.split(':');
    const hourNum = parseInt(hour);
    const nextHour = hourNum + 1;
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const nextAmpm = nextHour >= 24 ? 'AM' : nextHour >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    const displayNextHour = nextHour === 0 ? 12 : nextHour > 12 ? nextHour - 12 : nextHour === 24 ? 12 : nextHour;
    
    return `${displayHour}:00 ${ampm} – ${displayNextHour}:00 ${nextAmpm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTimeUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['workload-assignments'] });
  };

  const isCurrentHourSlot = (timeSlot: string) => {
    const [hour] = timeSlot.split(':');
    const slotHour = parseInt(hour);
    return slotHour === currentHour;
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Workload Calendar</h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Navigation */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="shrink-0"
            >
              Previous Day
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0 justify-start text-left min-w-[180px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">{format(selectedDate, 'PPP')}</span>
                  <span className="sm:hidden">{format(selectedDate, 'PP')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="shrink-0"
            >
              Next Day
            </Button>
          </div>
        </div>

        {/* Collapsible Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isFiltersOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Client Filters */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Clients</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                <Button
                  size="sm"
                  variant={selectedClient === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedClient('all')}
                >
                  All Clients
                </Button>
                {clients.map(client => (
                  <Button
                    key={client}
                    size="sm"
                    variant={selectedClient === client ? 'default' : 'outline'}
                    onClick={() => setSelectedClient(client)}
                  >
                    {client}
                  </Button>
                ))}
              </div>
            </div>

            {/* Project Filters */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Projects</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                <Button
                  size="sm"
                  variant={selectedProject === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedProject('all')}
                >
                  All Projects
                </Button>
                {projects.map(project => (
                  <Button
                    key={project}
                    size="sm"
                    variant={selectedProject === project ? 'default' : 'outline'}
                    onClick={() => setSelectedProject(project)}
                  >
                    {project}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
              {/* Clear Task Assignments Button */}
              <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Clear Task Assignments
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Clear Task Assignments (In Progress Only)</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {inProgressItems.filter(item => item.type === 'task').length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          No in-progress tasks assigned for this day
                        </div>
                      ) : (
                        inProgressItems.filter(item => item.type === 'task').map(item => (
                          <Card key={item.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleClearAssignment(item.id, 'task')}>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="font-medium">{item.task?.name}</div>
                                <Badge className={getStatusColor(item.task?.status || '')}>
                                  {item.task?.status}
                                </Badge>
                                <div className="text-sm text-gray-600">
                                  {item.task?.client_name} - {item.task?.project_name}
                                </div>
                                <div className="text-sm text-blue-600">
                                  Scheduled: {formatTimeSlot(item.scheduled_time)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              {/* Clear Subtask Assignments Button */}
              <Dialog open={isClearSubtaskDialogOpen} onOpenChange={setIsClearSubtaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Clear Subtask Assignments
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Clear Subtask Assignments (In Progress Only)</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {inProgressItems.filter(item => item.type === 'subtask').length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          No in-progress subtasks assigned for this day
                        </div>
                      ) : (
                        inProgressItems.filter(item => item.type === 'subtask').map(item => (
                          <Card key={item.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleClearAssignment(item.id, 'subtask')}>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="font-medium">{item.subtask?.name}</div>
                                <Badge className={getStatusColor(item.subtask?.status || '')}>
                                  {item.subtask?.status}
                                </Badge>
                                <div className="text-sm text-gray-600">
                                  {item.subtask?.client_name} - {item.subtask?.project_name}
                                </div>
                                <div className="text-sm text-blue-600">
                                  Scheduled: {formatTimeSlot(item.scheduled_time)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              {/* Clear Routines Button */}
              <Dialog open={isClearRoutinesDialogOpen} onOpenChange={setIsClearRoutinesDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Repeat className="h-4 w-4 mr-2" />
                    Clear Routines
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Clear Routine Assignments</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {routineItems.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          No routines assigned for this day
                        </div>
                      ) : (
                        routineItems.map(item => (
                          <Card key={item.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleClearAssignment(item.id, item.type)}>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="font-medium">{item.routine?.title}</div>
                                <Badge variant="outline" className="text-xs">
                                  {item.routine?.frequency}
                                </Badge>
                                <div className="text-sm text-gray-600">
                                  {item.routine?.client_name} - {item.routine?.project_name}
                                </div>
                                <div className="text-sm text-blue-600">
                                  Scheduled: {formatTimeSlot(item.scheduled_time)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Assign Task Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className={cn(
            "max-w-2xl",
            isMobile && "h-[90vh] max-h-[90vh] flex flex-col"
          )}>
            <DialogHeader className="shrink-0">
              <DialogTitle>Assign Task to {formatTimeSlot(selectedTimeSlot)}</DialogTitle>
            </DialogHeader>
            
            <div className={cn(
              "shrink-0 space-y-4",
              isMobile && "sticky top-0 bg-white z-10 pb-2 border-b"
            )}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tasks..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Client</h4>
                  <Select onValueChange={setAssignDialogClient}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {assignClients.map(client => (
                        <SelectItem key={client} value={client}>{client}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Project</h4>
                  <Select onValueChange={setAssignDialogProject}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {assignProjects.map(project => (
                        <SelectItem key={project} value={project}>{project}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <ScrollArea className={cn(
              "flex-1",
              isMobile ? "h-[40vh]" : "h-[400px]"
            )}>
              <div className="space-y-2 p-1">
                {filteredAvailableTasks.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No available tasks found
                  </div>
                ) : (
                  filteredAvailableTasks.map(task => (
                    <Card key={task.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleAssignTask(task.id)}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="font-medium">{task.name}</div>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {task.client_name} || {task.project_name}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Assign Subtask Dialog */}
        <Dialog open={isAssignSubtaskDialogOpen} onOpenChange={setIsAssignSubtaskDialogOpen}>
          <DialogContent className={cn(
            "max-w-2xl",
            isMobile && "h-[90vh] max-h-[90vh] flex flex-col"
          )}>
            <DialogHeader className="shrink-0">
              <DialogTitle>Assign Subtask to {formatTimeSlot(selectedTimeSlot)}</DialogTitle>
            </DialogHeader>
            
            <div className={cn(
              "shrink-0 space-y-4",
              isMobile && "sticky top-0 bg-white z-10 pb-2 border-b"
            )}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search subtasks..."
                  value={subtaskSearchQuery}
                  onChange={(e) => setSubtaskSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Client</h4>
                  <Select onValueChange={setSubtaskDialogClient}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {subtaskClients.map(client => (
                        <SelectItem key={client} value={client}>{client}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Project</h4>
                  <Select onValueChange={setSubtaskDialogProject}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {subtaskProjects.map(project => (
                        <SelectItem key={project} value={project}>{project}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <ScrollArea className={cn(
              "flex-1",
              isMobile ? "h-[40vh]" : "h-[400px]"
            )}>
              <div className="space-y-2 p-1">
                {filteredAvailableSubtasks.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No available subtasks found
                  </div>
                ) : (
                  filteredAvailableSubtasks.map(subtask => (
                    <Card key={subtask.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleAssignSubtask(subtask.id)}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="font-medium">{subtask.name}</div>
                          <div className="text-xs text-gray-500">Task: {subtask.parent_task_name}</div>
                          <Badge className={getStatusColor(subtask.status)}>
                            {subtask.status}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {subtask.client_name} || {subtask.project_name}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Assign Routine Dialog */}
        <Dialog open={isAssignRoutineDialogOpen} onOpenChange={setIsAssignRoutineDialogOpen}>
          <DialogContent className={cn(
            "max-w-2xl",
            isMobile && "h-[90vh] max-h-[90vh] flex flex-col"
          )}>
            <DialogHeader className="shrink-0">
              <DialogTitle>Assign Routine to {formatTimeSlot(selectedTimeSlot)}</DialogTitle>
            </DialogHeader>
            
            <div className={cn(
              "shrink-0 space-y-4",
              isMobile && "sticky top-0 bg-white z-10 pb-2 border-b"
            )}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search routines..."
                  value={routineSearchQuery}
                  onChange={(e) => setRoutineSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Client</h4>
                  <Select onValueChange={setRoutineDialogClient}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {routineClients.map(client => (
                        <SelectItem key={client} value={client}>{client}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Project</h4>
                  <Select onValueChange={setRoutineDialogProject}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {routineProjects.map(project => (
                        <SelectItem key={project} value={project}>{project}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <ScrollArea className={cn(
              "flex-1",
              isMobile ? "h-[40vh]" : "h-[400px]"
            )}>
              <div className="space-y-2 p-1">
                {filteredAvailableRoutines.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No available routines found
                  </div>
                ) : (
                  filteredAvailableRoutines.map(routine => (
                    <Card key={routine.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleAssignRoutine(routine.id)}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="font-medium">{routine.title}</div>
                          <Badge variant="outline" className="text-xs">
                            {routine.frequency}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {routine.client.name} || {routine.project.name}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Calendar Grid */}
        <div className="grid gap-4">
          {timeSlots.map(timeSlot => {
            const slotItems = itemsByTime[timeSlot] || [];
            const isCurrentSlot = isCurrentHourSlot(timeSlot);
            
            return (
              <Card 
                key={timeSlot}
                ref={isCurrentSlot ? currentSlotRef : null}
                className={cn(
                  "transition-colors duration-200",
                  isCurrentSlot && "bg-blue-50 border-blue-200 shadow-md"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className={cn(
                      "text-lg",
                      isCurrentSlot && "text-blue-700"
                    )}>
                      {formatTimeSlot(timeSlot)}
                      {isCurrentSlot && (
                        <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                          Current
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssignDialog(timeSlot)}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        {!isMobile && (
                          <>
                            <span className="ml-2">Task</span>
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssignSubtaskDialog(timeSlot)}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        {!isMobile && (
                          <>
                            <span className="ml-2">Subtask</span>
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssignRoutineDialog(timeSlot)}
                        className="shrink-0"
                      >
                        <Repeat className="h-4 w-4" />
                        {!isMobile && (
                          <>
                            <span className="ml-2">Routine</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {slotItems.length === 0 ? (
                    <div className="text-gray-500 text-sm">No items assigned</div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {slotItems.map(item => (
                        <Card key={`${item.type}-${item.id}`} className="border border-gray-200 relative">
                          {item.type !== 'sprint' && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleClearAssignment(item.id, item.type);
                              }}
                              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 hover:text-red-700 transition-colors z-10"
                              title="Clear assignment"
                              disabled={clearAssignmentMutation.isPending || clearRoutineCompletionMutation.isPending}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                          <CardContent className={cn("p-3", item.type !== 'sprint' && "pr-8")}>
                            <div className="space-y-2">
                              {item.type === 'task' ? (
                                <>
                                  <div className="text-xs text-gray-600">
                                    👤 Assigned to: {item.task?.assignee_name}
                                  </div>
                                  {item.task?.assigner?.name && (
                                    <div className="text-xs text-gray-500">
                                      📋 Assigned by: {item.task.assigner.name}
                                    </div>
                                  )}
                                  <div className="font-medium text-sm">{item.task?.name}</div>
                                  <div className="text-xs text-gray-600">
                                    {item.task?.client_name} || {item.task?.project_name}
                                  </div>
                                  {item.task?.sprint_name && (
                                    <Badge variant="outline" className="text-xs">
                                      🏃 {item.task.sprint_name}
                                    </Badge>
                                  )}
                                  <div className="pt-2 border-t border-gray-100">
                                    <TaskTimer
                                      taskId={item.task.id}
                                      taskName={item.task.name}
                                      onTimeUpdate={handleTimeUpdate}
                                    />
                                  </div>
                                </>
                              ) : item.type === 'subtask' ? (
                                <>
                                  <div className="text-xs text-gray-600">
                                    📋 Subtask
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    👤 Assigned to: {item.subtask?.assignee_name}
                                  </div>
                                  {item.subtask?.assigner?.name && (
                                    <div className="text-xs text-gray-500">
                                      📋 Assigned by: {item.subtask.assigner.name}
                                    </div>
                                  )}
                                  <div className="font-medium text-sm">{item.subtask?.name}</div>
                                  <div className="text-xs text-gray-500">
                                    Task: {item.subtask?.parent_task_name}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {item.subtask?.client_name} || {item.subtask?.project_name}
                                  </div>
                                  <div className="pt-2 border-t border-gray-100">
                                    <TaskTimer
                                      taskId={item.subtask.id}
                                      taskName={item.subtask.name}
                                      onTimeUpdate={handleTimeUpdate}
                                      isSubtask={true}
                                    />
                                  </div>
                                </>
                              ) : item.type === 'routine' ? (
                                <>
                                  <div className="text-xs text-gray-600">
                                    <Repeat className="h-3 w-3 inline mr-1" />
                                    Routine
                                  </div>
                                  <div className="font-medium text-sm">{item.routine?.title}</div>
                                  <div className="text-xs text-gray-600">
                                    {item.routine?.client_name} || {item.routine?.project_name}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {item.routine?.frequency}
                                  </Badge>
                                </>
                              ) : item.type === 'sprint' ? (
                                <>
                                  <div className="text-xs text-gray-600">
                                    🏃 Sprint Time Slot
                                  </div>
                                  <div className="font-medium text-sm">{item.sprint?.title}</div>
                                  <div className="text-xs text-gray-600">
                                    {item.sprint?.project?.clients?.name || 'No Client'} || {item.sprint?.project?.name || 'No Project'}
                                  </div>
                                  {item.sprint?.sprint_leader?.name && (
                                    <div className="text-xs text-gray-500">
                                      👤 Leader: {item.sprint.sprint_leader.name}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-600">
                                    {item.sprint?.start_time} - {item.sprint?.end_time}
                                    {item.sprint?.estimated_hours && (
                                      <span className="ml-2">({item.sprint.estimated_hours}h)</span>
                                    )}
                                  </div>
                                  <Badge className={getStatusColor(item.sprint?.status || '')}>
                                    {item.sprint?.status}
                                  </Badge>
                                </>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Navigation>
  );
};

export default WorkloadCal;
