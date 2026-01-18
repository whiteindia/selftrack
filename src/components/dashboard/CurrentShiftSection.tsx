import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Clock, ChevronLeft, ChevronRight as ChevronRightIcon, CalendarPlus, Pencil, Trash2, List, Plus, CheckSquare, Square, X, ArrowRight, FolderOpen, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';
import { format, addHours, addDays, subDays, startOfHour, isWithinInterval, isSameDay, startOfDay, endOfDay } from 'date-fns';
import LiveTimer from './LiveTimer';
import CompactTimerControls from './CompactTimerControls';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { logActivity, logTaskCreated, logTaskStatusChanged } from '@/utils/activityLogger';
import TaskEditDialog from '@/components/TaskEditDialog';
import AssignToSlotDialog from '@/components/AssignToSlotDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MoveSubtasksDialog } from "./MoveSubtasksDialog";
import { MoveToProjectDialog } from "@/components/MoveToProjectDialog";
import { ConvertToSubtaskDialog } from "./ConvertToSubtaskDialog";
import { assignToCurrentSlot } from "@/utils/assignToCurrentSlot";

interface WorkloadItem {
  id: string;
  type: 'task' | 'subtask' | 'routine' | 'sprint' | 'slot-task';
  scheduled_time: string;
  scheduled_date: string;
  task?: {
    id: string;
    name: string;
    status: string;
    project_id?: string;
    deadline?: string;
    assignee?: { name: string };
    project?: { id?: string; name: string; client?: { name: string } };
    slot_start_datetime?: string;
    slot_end_datetime?: string;
    reminder_datetime?: string | null;
  };
  subtask?: {
    id: string;
    name: string;
    status: string;
    project_id?: string;
    assignee?: { name: string };
    task?: { id?: string; name: string; project_id?: string };
    project?: { id?: string; name: string; client?: { name: string } };
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
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState<any>(null);
  const [moveToProjectTask, setMoveToProjectTask] = useState<{ id: string; name: string; project_id: string | null } | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedItemsForWorkload, setSelectedItemsForWorkload] = useState<any[]>([]);
  const [selectedSubtasks, setSelectedSubtasks] = useState<{ id: string; name: string; task_id: string }[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
  const [shiftInputs, setShiftInputs] = useState<Record<string, string>>({});
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [subtaskDialogTaskId, setSubtaskDialogTaskId] = useState<string | null>(null);
  const [subtaskDialogTaskName, setSubtaskDialogTaskName] = useState<string>('');
  const [subtaskDialogParentDeadline, setSubtaskDialogParentDeadline] = useState<string | null | undefined>(null);
  const [subtaskEditId, setSubtaskEditId] = useState<string | null>(null);
  const [subtaskEditText, setSubtaskEditText] = useState<string>('');
  const [subtaskNewName, setSubtaskNewName] = useState<string>('');
  const [convertToSubtaskSourceTask, setConvertToSubtaskSourceTask] = useState<{ id: string; name: string } | null>(null);
  const [selectedShiftSlots, setSelectedShiftSlots] = useState<Record<string, string>>({});
  const [selectedShiftProjects, setSelectedShiftProjects] = useState<Record<string, string>>({});
  const [shiftInputsFocused, setShiftInputsFocused] = useState<Record<string, boolean>>({});
  const shiftInputContainers = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: miscProject } = useQuery({
    queryKey: ['misc-project'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('name', 'Miscellanious-Quick-Temp-Orglater')
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: projectChoices = [] } = useQuery({
    queryKey: ['current-shift-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

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

  const getProjectName = (item: WorkloadItem) => {
    if (item.type === 'task' || item.type === 'slot-task') {
      return item.task?.project?.name || '';
    }
    return item.subtask?.project?.name || '';
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

  // Function to render task name with clickable links
  const renderTaskName = (name: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = name.split(urlRegex);

    return parts.map((part, index) => {
      // NOTE: don't use urlRegex.test() here (regex has /g and test() is stateful via lastIndex)
      const isUrl = /^https?:\/\//i.test(part);
      if (isUrl) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part.length > 30 ? part.substring(0, 30) + '...' : part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Fetch workload items for selected date and nearby days
  const { data: workloadItems = [], isLoading } = useQuery({
    queryKey: ['current-shift-workload', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const nextDateStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
      const prevDateStr = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
      const dayStartIso = startOfDay(selectedDate).toISOString();
      const dayEndIso = endOfDay(selectedDate).toISOString();

      // Fetch tasks with scheduled_time
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          date,
          deadline,
          slot_start_datetime,
          slot_end_datetime,
          project_id,
          reminder_datetime,
          assignee:employees!tasks_assignee_id_fkey(name),
          project:projects!tasks_project_id_fkey(
            id,
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
          deadline,
          slot_start_datetime,
          slot_end_datetime,
          project_id,
          reminder_datetime,
          assignee:employees!tasks_assignee_id_fkey(name),
          project:projects!tasks_project_id_fkey(
            id,
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `)
        .gte('slot_start_datetime', dayStartIso)
        .lt('slot_start_datetime', dayEndIso);

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
            id,
            name,
            project_id,
            project:projects!tasks_project_id_fkey(
              id,
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
                project_id: task.project_id,
                deadline: task.deadline,
                assignee: task.assignee,
                project: task.project,
                slot_start_datetime: task.slot_start_datetime,
                slot_end_datetime: task.slot_end_datetime,
                reminder_datetime: task.reminder_datetime
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
                project_id: task.project_id,
                deadline: task.deadline,
                assignee: task.assignee,
                project: task.project,
                slot_start_datetime: task.slot_start_datetime,
                slot_end_datetime: task.slot_end_datetime,
                reminder_datetime: task.reminder_datetime
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
                project_id: subtask.task?.project_id,
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

  const projectOptions = useMemo(() => {
    const projectSet = new Set<string>();
    workloadItems.forEach(item => {
      const itemDateTime = parseScheduledTime(item.scheduled_time, item.scheduled_date);
      if (!itemDateTime || !isSameDay(itemDateTime, selectedDate)) return;
      const projectName = getProjectName(item);
      if (projectName) projectSet.add(projectName);
    });
    return Array.from(projectSet);
  }, [workloadItems, selectedDate]);

  const [selectedProject, setSelectedProject] = useState('all');

  const filteredWorkloadItems = useMemo(() => {
    if (selectedProject === 'all') return workloadItems;
    return workloadItems.filter(item => getProjectName(item) === selectedProject);
  }, [workloadItems, selectedProject]);

  const isQuickShiftItem = (item: WorkloadItem) => {
    const projectId =
      item.type === 'subtask' ? item.subtask?.task?.project_id : item.task?.project_id;

    if (miscProject?.id && projectId === miscProject.id) return true;
    if (item.type === 'subtask' && item.subtask?.parent_task_name?.startsWith('Quick Tasks')) return true;
    if ((item.type === 'task' || item.type === 'slot-task') && item.task?.name?.startsWith('Quick Tasks')) return true;
    return false;
  };

  const itemsByShift = shifts.map(currentShift => {
    const shiftItems = filteredWorkloadItems.filter(item => {
      const itemDateTime = parseScheduledTime(item.scheduled_time, item.scheduled_date);
      if (!itemDateTime) return false;

      // Check if item falls in this shift (start inclusive, end exclusive)
      const isInCurrentShift = isInShiftRange(itemDateTime, currentShift.start, currentShift.end);

      // Also check next day's corresponding shift if viewing today and item is within next 6 hours
      const nextShift = nextDayShifts.find(s => s.id === currentShift.id);
      const isInNextShift = isToday && nextShift && 
        isInShiftRange(itemDateTime, nextShift.start, nextShift.end) && 
        isWithinInterval(itemDateTime, { start: now, end: next6Hours });

      if (isInCurrentShift) return true;
      if (isInNextShift) return isQuickShiftItem(item);
      return false;
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

    // Assign to current slot
    await assignToCurrentSlot(taskId, isSubtask ? 'subtask' : 'task');

    await supabase.from("time_entries").insert({
      task_id: taskId,
      employee_id: employee.id,
      entry_type: isSubtask ? "subtask" : "task",
      start_time: new Date().toISOString(),
    });

    // Invalidate queries so UI updates
    queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-workload"] });
    queryClient.invalidateQueries({ queryKey: ["workload-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["runningTasks"] });
  };

  const createShiftSubtaskMutation = useMutation({
    mutationFn: async ({ name, shiftStart }: { name: string; shiftStart: string }) => {
      if (!miscProject?.id) {
        throw new Error('Quick task project not found');
      }

      // Use selected nav date as the task date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Build start/end Date objects on that date in local time
      const [startH, startM] = shiftStart.split(':').map(Number);
      
      // Determine letter based on time period and set proper 6-hour shift boundaries
      // A: 12am-6am, B: 6am-12pm, C: 12pm-6pm, D: 6pm-12am
      let periodLetter = 'A';
      let shiftStartHour = 0;
      let shiftEndHour = 6;
      
      if (startH >= 0 && startH < 6) {
        periodLetter = 'A';
        shiftStartHour = 0;
        shiftEndHour = 6;
      } else if (startH >= 6 && startH < 12) {
        periodLetter = 'B';
        shiftStartHour = 6;
        shiftEndHour = 12;
      } else if (startH >= 12 && startH < 18) {
        periodLetter = 'C';
        shiftStartHour = 12;
        shiftEndHour = 18;
      } else {
        periodLetter = 'D';
        shiftStartHour = 18;
        shiftEndHour = 24;
      }

      // Quick Task parent should span the full 6-hour shift
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(shiftStartHour, 0, 0, 0);

      // For Shift D (18:00-24:00), end time is midnight next day
      const endDateTime = new Date(selectedDate);
      if (shiftEndHour === 24) {
        // Set to next day at 00:00
        endDateTime.setDate(endDateTime.getDate() + 1);
        endDateTime.setHours(0, 0, 0, 0);
      } else {
        endDateTime.setHours(shiftEndHour, 0, 0, 0);
      }

      const parentTaskName = `Quick Tasks ${periodLetter} (${format(selectedDate, 'MMM d')})`;

      // Check if parent task already exists for this period
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('name', parentTaskName)
        .eq('project_id', miscProject.id)
        .eq('date', dateStr)
        .single();

      let parentTaskId = existingTask?.id;
      let createdParent = false;

      // If parent task doesn't exist, create it
      if (!parentTaskId) {
        const deadlineValue = endOfDay(selectedDate).toISOString();
        const slotStartValue = startDateTime.toISOString();
        const slotEndValue = endDateTime.toISOString();

        const { data: newTask, error: taskError } = await supabase.from('tasks').insert({
          name: parentTaskName,
          status: 'Not Started',
          date: dateStr,
          scheduled_time: shiftStart,
          deadline: deadlineValue,
          slot_start_datetime: slotStartValue,
          slot_end_datetime: slotEndValue,
          project_id: miscProject.id,
        }).select('id').single();

        if (taskError) throw taskError;
        parentTaskId = newTask.id;
        createdParent = true;
      }

      // Create subtask under the parent task
      const { data: subtaskData, error: subtaskError } = await supabase.from('subtasks').insert({
        name,
        task_id: parentTaskId,
        status: 'Not Started',
        date: dateStr,
        scheduled_time: shiftStart,
        deadline: endOfDay(selectedDate).toISOString(),
      }).select('id, name');

      if (subtaskError) throw subtaskError;
      return {
        parentTaskId,
        parentTaskName,
        createdParent,
        subtask: subtaskData?.[0]
      };
    },
    onSuccess: (data) => {
      toast.success('Subtask added to shift');
      queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-workload'] });
      queryClient.invalidateQueries({ queryKey: ['workload-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-subtasks'] });

      try {
        if (data?.createdParent && data.parentTaskId && data.parentTaskName) {
          logTaskCreated(data.parentTaskName, data.parentTaskId, 'Miscellanious-Quick-Temp-Orglater');
        }
        if (data?.subtask?.id && data?.subtask?.name) {
          logActivity({
            action_type: 'created',
            entity_type: 'subtask',
            entity_id: data.subtask.id,
            entity_name: data.subtask.name,
            description: `Created subtask: ${data.subtask.name}`,
            comment: data.parentTaskName ? `Parent task: ${data.parentTaskName}` : undefined
          });
        }
        queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      } catch (error) {
        console.error('Failed to log shift subtask activity:', error);
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error('Failed to add subtask to shift');
    }
  });

  const createShiftTaskMutation = useMutation({
    mutationFn: async ({ name, shiftStart, projectId }: { name: string; shiftStart: string; projectId: string }) => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const deadlineValue = endOfDay(selectedDate).toISOString();
      const [startH, startM] = shiftStart.split(':').map(Number);
      const slotStartDateTime = new Date(selectedDate);
      slotStartDateTime.setHours(startH, startM || 0, 0, 0);
      const slotEndDateTime = new Date(slotStartDateTime);
      slotEndDateTime.setHours(slotStartDateTime.getHours() + 1);

      const { data, error } = await supabase.from('tasks').insert({
        name,
        project_id: projectId,
        status: 'Not Started',
        date: dateStr,
        scheduled_time: shiftStart,
        deadline: deadlineValue,
        slot_start_datetime: slotStartDateTime.toISOString(),
        slot_end_datetime: slotEndDateTime.toISOString(),
      }).select('id, name, project_id');

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: (data) => {
      toast.success('Task added to shift');
      queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-workload'] });
      queryClient.invalidateQueries({ queryKey: ['workload-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks-quick-add'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      if (data?.id && data?.name) {
        const projectName = projectChoices.find((p: any) => p.id === data.project_id)?.name || 'Project';
        logTaskCreated(data.name, data.id, projectName);
        queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error('Failed to add task to shift');
    }
  });

  const handleAddShiftTask = (shiftId: string, shiftStart: Date) => {
    const value = (shiftInputs[shiftId] || '').trim();
    if (!value) return;
    const selectedSlot = selectedShiftSlots[shiftId];
    const shiftStartStr = selectedSlot || `${shiftStart.getHours().toString().padStart(2, '0')}:00`;
    const selectedProjectId = selectedShiftProjects[shiftId];

    if (selectedProjectId) {
      createShiftTaskMutation.mutate({ name: value, shiftStart: shiftStartStr, projectId: selectedProjectId });
    } else {
      if (!miscProject?.id) {
        toast.error('Quick task project not found');
        return;
      }
      createShiftSubtaskMutation.mutate({ name: value, shiftStart: shiftStartStr });
    }
    setShiftInputs(prev => ({ ...prev, [shiftId]: '' }));
    setSelectedShiftSlots(prev => ({ ...prev, [shiftId]: '' }));
    setSelectedShiftProjects(prev => ({ ...prev, [shiftId]: '' }));
  };

  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'task' | 'subtask'; name?: string }) => {
      if (type === 'task') {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subtasks').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: async (_data, variables) => {
      toast.success('Item deleted');
      // Use refetchQueries for immediate UI update (works better on mobile)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['current-shift-workload'] }),
        queryClient.refetchQueries({ queryKey: ['quick-tasks'] }),
        queryClient.refetchQueries({ queryKey: ['tasks'] }),
        queryClient.refetchQueries({ queryKey: ['subtasks'] }),
        queryClient.refetchQueries({ queryKey: ['dashboard-workload'] }),
        queryClient.refetchQueries({ queryKey: ['runningTasks'] }),
      ]);

      if (variables?.id && variables?.name) {
        logActivity({
          action_type: 'deleted',
          entity_type: variables.type,
          entity_id: variables.id,
          entity_name: variables.name,
          description: `Deleted ${variables.type}: ${variables.name}`
        });
        queryClient.refetchQueries({ queryKey: ['activity-feed'] });
      }
    },
    onError: () => {
      toast.error('Failed to delete item');
    }
  });

  const clearFromSlotMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          // Remove task from shift slot / schedule.
          // We only clear the time/slot fields (not `date`) to avoid failures if `date` is non-nullable.
          scheduled_time: null,
          // clear legacy + current slot fields
          slot_start_time: null,
          slot_start_datetime: null,
          slot_end_datetime: null,
        })
        .eq('id', taskId);

      if (error) {
        console.error('Failed to clear from slot:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Cleared from slot');
      queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-workload'] });
      queryClient.invalidateQueries({ queryKey: ['workload-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to clear from slot');
    }
  });

  const clearSubtaskFromSlotMutation = useMutation({
    mutationFn: async ({ subtaskId }: { subtaskId: string }) => {
      const { error } = await supabase
        .from('subtasks')
        .update({
          // Remove subtask from shift slot / schedule.
          // We only clear the time field (not `date`) to avoid failures if `date` is non-nullable.
          scheduled_time: null,
        })
        .eq('id', subtaskId);

      if (error) {
        console.error('Failed to clear subtask from slot:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Cleared from slot');
      queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-workload'] });
      queryClient.invalidateQueries({ queryKey: ['workload-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-subtasks'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to clear from slot');
    }
  });

  const handleCreateSubtask = (taskId: string, name: string, parentDeadline?: string | null) => {
    if (!name.trim()) return;
    createSubtaskMutation.mutate({ taskId, name: name.trim(), parentDeadline });
  };

  const handleToggleSubtaskStatus = (subtask: any) => {
    const current = subtask.status || 'Not Started';
    // Toggle: Not Started → In Progress → Completed → Not Started
    let next: string;
    if (current === 'Not Started') next = 'In Progress';
    else if (current === 'In Progress') next = 'Completed';
    else next = 'Not Started';
    updateSubtaskStatusMutation.mutate({ subtaskId: subtask.id, status: next, subtaskName: subtask.name });
  };

  const handleDeleteSubtask = (subtask: any) => {
    deleteSubtaskMutation.mutate({ subtaskId: subtask.id, subtaskName: subtask.name });
  };

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Database['public']['Enums']['task_status']; taskName?: string; oldStatus?: string; projectName?: string }) => {
      const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: async (_data, variables) => {
      // Use refetchQueries for immediate UI update (works better on mobile)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['current-shift-workload'] }),
        queryClient.refetchQueries({ queryKey: ['quick-tasks'] }),
        queryClient.refetchQueries({ queryKey: ['tasks'] }),
        queryClient.refetchQueries({ queryKey: ['dashboard-workload'] }),
      ]);

      if (variables?.taskId && variables?.taskName && variables?.oldStatus) {
        logTaskStatusChanged(
          variables.taskName,
          variables.taskId,
          variables.status,
          variables.oldStatus,
          variables.projectName
        );
        queryClient.refetchQueries({ queryKey: ['activity-feed'] });
      }
    },
    onError: () => toast.error('Failed to update task status'),
  });

  const handleToggleTaskStatus = (task: any) => {
    const taskId = task.id;
    const currentStatus = task.status;
    let next: Database['public']['Enums']['task_status'] = 'Not Started';
    if (currentStatus === 'Not Started') next = 'In Progress';
    else if (currentStatus === 'In Progress') next = 'Completed';
    else if (currentStatus === 'Completed') next = 'Not Started';
    updateTaskStatusMutation.mutate({
      taskId,
      status: next,
      taskName: task.name,
      oldStatus: currentStatus,
      projectName: task.project?.name
    });
  };

  const { data: dialogSubtasks = [], isLoading: isDialogSubtasksLoading } = useQuery({
    queryKey: ['task-subtasks', subtaskDialogTaskId],
    enabled: subtaskDialogOpen && !!subtaskDialogTaskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subtasks')
        .select('id, name, status, deadline')
        .eq('task_id', subtaskDialogTaskId);
      if (error) throw error;
      const withKey = (data || []).map((st: any) => {
        const match = /^(\d+)/.exec(st.name?.trim() || '');
        return { ...st, _sortKey: match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER };
      });
      return withKey.sort((a: any, b: any) => a._sortKey - b._sortKey || (a.name || '').localeCompare(b.name || ''));
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async ({ taskId, name, parentDeadline }: { taskId: string; name: string; parentDeadline?: string | null }) => {
      const { data, error } = await supabase.from('subtasks').insert({
        name,
        task_id: taskId,
        status: 'Not Started',
        deadline: parentDeadline || null,
      }).select('id, name');
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: (data, variables) => {
      toast.success('Subtask added');
      queryClient.invalidateQueries({ queryKey: ['task-subtasks', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });

      if (data?.id && data?.name) {
        logActivity({
          action_type: 'created',
          entity_type: 'subtask',
          entity_id: data.id,
          entity_name: data.name,
          description: `Created subtask: ${data.name}`
        });
        queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      }
    },
    onError: () => toast.error('Failed to add subtask'),
  });

  const updateSubtaskStatusMutation = useMutation({
    mutationFn: async ({ subtaskId, status }: { subtaskId: string; status: string; subtaskName?: string; parentTaskName?: string }) => {
      const { error } = await supabase.from('subtasks').update({ status }).eq('id', subtaskId);
      if (error) throw error;
    },
    onSuccess: async (_data, variables) => {
      // Use refetchQueries for immediate UI update (works better on mobile)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['task-subtasks'] }),
        queryClient.refetchQueries({ queryKey: ['current-shift-workload'] }),
        queryClient.refetchQueries({ queryKey: ['quick-tasks'] }),
      ]);

      if (variables?.subtaskId && variables?.subtaskName) {
        const commentParts: string[] = [];
        if (variables?.status) commentParts.push(`Status: ${variables.status}`);
        if (variables?.parentTaskName) commentParts.push(`Parent task: ${variables.parentTaskName}`);
        
        logActivity({
          action_type: 'updated',
          entity_type: 'subtask',
          entity_id: variables.subtaskId,
          entity_name: variables.subtaskName,
          description: `Updated subtask status: ${variables.subtaskName}`,
          comment: commentParts.length > 0 ? commentParts.join(' | ') : undefined
        });
        queryClient.refetchQueries({ queryKey: ['activity-feed'] });
      }
    },
    onError: () => toast.error('Failed to update subtask'),
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId }: { subtaskId: string; subtaskName?: string; parentTaskName?: string }) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
      if (error) throw error;
    },
    onSuccess: async (_data, variables) => {
      toast.success('Subtask deleted');
      // Use refetchQueries for immediate UI update (works better on mobile)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['task-subtasks'] }),
        queryClient.refetchQueries({ queryKey: ['current-shift-workload'] }),
        queryClient.refetchQueries({ queryKey: ['quick-tasks'] }),
        queryClient.refetchQueries({ queryKey: ['subtasks'] }),
      ]);

      if (variables?.subtaskId && variables?.subtaskName) {
        logActivity({
          action_type: 'deleted',
          entity_type: 'subtask',
          entity_id: variables.subtaskId,
          entity_name: variables.subtaskName,
          description: `Deleted subtask: ${variables.subtaskName}`,
          comment: variables?.parentTaskName ? `Parent task: ${variables.parentTaskName}` : undefined
        });
        queryClient.refetchQueries({ queryKey: ['activity-feed'] });
      }
    },
    onError: () => toast.error('Failed to delete subtask'),
  });

  // Convert subtask to task mutation
  const convertSubtaskToTaskMutation = useMutation({
    mutationFn: async ({ subtaskId, subtaskName }: { subtaskId: string; subtaskName: string }) => {
      // Get subtask details
      const { data: subtask, error: subtaskError } = await supabase
        .from("subtasks")
        .select("deadline, status, estimated_duration, assignee_id, task_id")
        .eq("id", subtaskId)
        .single();
      
      if (subtaskError) throw subtaskError;
      
      // Get parent task's project_id
      const { data: parentTask, error: parentError } = await supabase
        .from("tasks")
        .select("project_id")
        .eq("id", subtask.task_id)
        .single();
      
      if (parentError) throw parentError;
      
      // Create new task from subtask
      const { error: taskError } = await supabase
        .from("tasks")
        .insert({
          name: subtaskName,
          project_id: parentTask.project_id,
          status: subtask?.status === 'Completed' ? 'Completed' : 'Not Started',
          deadline: subtask?.deadline,
          estimated_duration: subtask?.estimated_duration,
          assignee_id: subtask?.assignee_id,
        });
      
      if (taskError) throw taskError;
      
      // Delete the subtask
      const { error: deleteError } = await supabase
        .from("subtasks")
        .delete()
        .eq("id", subtaskId);
      
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast.success("Subtask converted to task");
      queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
    },
    onError: (error) => {
      toast.error("Failed to convert subtask to task");
      console.error(error);
    },
  });

  const openAssignForItem = (item: WorkloadItem) => {
    const projectName = getItemProject(item);
    const projectId = item.task?.project_id || item.subtask?.project_id || item.subtask?.task?.project_id || '';
    const selected = {
      id: item.id,
      originalId: item.id,
      type: item.type,
      itemType: item.type,
      title: getItemTitle(item),
      date: item.scheduled_date || selectedDate.toISOString().split('T')[0],
      client: '',
      project: projectName,
      assigneeId: null,
      projectId: projectId || '',
    };
    setSelectedItemsForWorkload([selected]);
    setIsAssignDialogOpen(true);
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
    <>
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="px-6 py-4">
          <CollapsibleTrigger asChild>
            <div className="flex flex-col gap-2 cursor-pointer">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <h2 className="text-base sm:text-lg font-semibold whitespace-nowrap">Current Focus Goals Shift</h2>
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
        <CollapsibleContent>
        <CardContent className="px-0 sm:px-6 py-6">
          <div className="space-y-4">
            {projectOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedProject === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedProject('all')}
                >
                  All Projects
                </Button>
                {projectOptions.map(project => (
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
            )}

            {selectedSubtasks.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsMoveDialogOpen(true)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Move ({selectedSubtasks.length})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedSubtasks([])}
                  className="text-muted-foreground"
                >
                  Clear selection
                </Button>
              </div>
            )}
            {itemsByShift.map(shift => {
              const isCurrentShift = isToday && now >= shift.start && now < shift.end;
              return (
              <div 
                key={shift.id} 
                className={cn(
                  "space-y-2 p-3 rounded-lg transition-all",
                  shift.id === 'A' && 'bg-blue-50 dark:bg-blue-900/20',
                  shift.id === 'B' && 'bg-green-50 dark:bg-green-900/20',
                  shift.id === 'C' && 'bg-amber-50 dark:bg-amber-900/20',
                  shift.id === 'D' && 'bg-purple-50 dark:bg-purple-900/20',
                  isCurrentShift && shift.id === 'A' && 'ring-4 ring-blue-500 dark:ring-blue-400',
                  isCurrentShift && shift.id === 'B' && 'ring-4 ring-green-500 dark:ring-green-400',
                  isCurrentShift && shift.id === 'C' && 'ring-4 ring-amber-500 dark:ring-amber-400',
                  isCurrentShift && shift.id === 'D' && 'ring-4 ring-purple-500 dark:ring-purple-400'
                )}
              >
              {(() => {
                  const isCurrentShift = isToday && now >= shift.start && now < shift.end;
                  const clockColorClass = isCurrentShift 
                    ? cn(
                        'animate-blink-shift',
                        shift.id === 'A' && 'text-blue-600 dark:text-blue-400',
                        shift.id === 'B' && 'text-green-600 dark:text-green-400',
                        shift.id === 'C' && 'text-amber-600 dark:text-amber-400',
                        shift.id === 'D' && 'text-purple-600 dark:text-purple-400'
                      )
                    : 'text-muted-foreground';
                  return (
                    <div className="flex items-center gap-2">
                      <Clock className={cn("h-4 w-4", clockColorClass)} />
                      <h3 className="font-medium text-sm">{shift.label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {shift.items.length} items
                      </Badge>
                    </div>
                  );
                })()}

                <div className="pl-6">
                  <div
                    className="flex gap-2 items-center mb-2"
                    ref={(el) => {
                      shiftInputContainers.current[shift.id] = el;
                    }}
                    onBlurCapture={(e) => {
                      const current = shiftInputContainers.current[shift.id];
                      const nextTarget = e.relatedTarget as Node | null;
                      if (!current || (nextTarget && current.contains(nextTarget))) return;
                      setShiftInputsFocused(prev => ({ ...prev, [shift.id]: false }));
                    }}
                    onFocusCapture={() => setShiftInputsFocused(prev => ({ ...prev, [shift.id]: true }))}
                  >
                    <input
                      className="flex-1 rounded-md border px-2 py-1 text-sm bg-background"
                      placeholder={`Quick add to ${shift.label}`}
                      value={shiftInputs[shift.id] || ''}
                      onChange={(e) => setShiftInputs(prev => ({ ...prev, [shift.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddShiftTask(shift.id, shift.start);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddShiftTask(shift.id, shift.start)}
                      disabled={!((shiftInputs[shift.id] || '').trim()) || createShiftSubtaskMutation.isPending || createShiftTaskMutation.isPending}
                    >
                      Add
                    </Button>
                  </div>
                  {(shiftInputsFocused[shift.id] || (shiftInputs[shift.id] || '').trim().length > 0) && (
                    <>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(() => {
                          const slots: string[] = [];
                          const start = new Date(shift.start);
                          const end = new Date(shift.end);
                          const cursor = new Date(start);
                          while (cursor < end) {
                            const slot = `${cursor.getHours().toString().padStart(2, '0')}:00`;
                            slots.push(slot);
                            cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
                          }
                          return slots.map(slot => (
                            <Button
                              key={`${shift.id}-${slot}`}
                              type="button"
                              size="sm"
                              variant={selectedShiftSlots[shift.id] === slot ? "default" : "outline"}
                              onClick={() => setSelectedShiftSlots(prev => ({ ...prev, [shift.id]: slot }))}
                              className="text-xs"
                            >
                              {slot}
                            </Button>
                          ));
                        })()}
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Select
                          value={selectedShiftProjects[shift.id] || ''}
                          onValueChange={(value) => setSelectedShiftProjects(prev => ({ ...prev, [shift.id]: value }))}
                        >
                          <SelectTrigger className="h-8 w-[200px] text-xs">
                            <SelectValue placeholder="Optional project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projectChoices.map((project: any) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedShiftProjects[shift.id] && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => setSelectedShiftProjects(prev => ({ ...prev, [shift.id]: '' }))}
                          >
                            Clear project
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {shift.items.length === 0 ? (
                  <div className="text-xs text-muted-foreground pl-6">No scheduled items</div>
                ) : (
                  <div className="space-y-2 pl-6">
                    {(() => {
                      // Separate Quick Tasks subtasks from other items
                      const quickTaskSubtasks = shift.items.filter(
                        item => item.type === 'subtask' && item.subtask?.parent_task_name?.startsWith('Quick Tasks')
                      );
                      // Filter out Quick Tasks parent tasks (not needed in current shift) and Quick Tasks subtasks
                      const otherItems = shift.items.filter(
                        item => {
                          // Skip Quick Tasks subtasks (they're rendered separately)
                          if (item.type === 'subtask' && item.subtask?.parent_task_name?.startsWith('Quick Tasks')) return false;
                          // Skip Quick Tasks parent tasks entirely
                          if ((item.type === 'task' || item.type === 'slot-task') && item.task?.name?.startsWith('Quick Tasks')) return false;
                          return true;
                        }
                      );

                      // Group quick task subtasks by parent task name
                      const quickTaskGroups: Record<string, typeof quickTaskSubtasks> = {};
                      quickTaskSubtasks.forEach(item => {
                        const parentName = item.subtask?.parent_task_name || 'Quick Tasks';
                        if (!quickTaskGroups[parentName]) quickTaskGroups[parentName] = [];
                        quickTaskGroups[parentName].push(item);
                      });

                      const renderItem = (item: WorkloadItem) => {
                        const realTaskId = item.type === 'slot-task' ? item.task?.id : item.id;
                        const activeEntry = activeEntries.find(entry =>
                          entry.task_id === realTaskId ||
                          (item.type === 'subtask' && entry.task_id === item.subtask?.id)
                        );
                        const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");
                        const hasSlot = item.task?.slot_start_datetime || item.task?.slot_end_datetime;
                        // Check if task has a reminder (highlight in red)
                        const hasReminder = (item.type === 'task' || item.type === 'slot-task') && item.task?.reminder_datetime;

                        return (
                          <div 
                            key={item.id} 
                            className={cn(
                              'flex items-start justify-between p-3 rounded-md transition-all',
                              hasReminder
                                ? 'bg-red-100 border border-red-400 dark:bg-red-950/40 dark:border-red-700'
                                : item.type === 'subtask'
                                  ? 'bg-blue-50 dark:bg-blue-900/30'
                                  : item.type === 'slot-task'
                                    ? 'bg-purple-50 dark:bg-purple-900/20'
                                    : 'bg-muted/30',
                              activeEntry && !hasReminder && 'border border-orange-300 bg-orange-50 dark:bg-orange-900/20',
                              getItemStatus(item) === 'In Progress' && !hasReminder && 'border border-orange-300 bg-orange-50/60 dark:bg-orange-900/20'
                            )}
                            onClick={() => setCollapsedItems(prev => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            })}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm flex flex-col gap-1">
                                {item.type === 'subtask' ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const subtaskId = item.subtask?.id || item.id;
                                        const parentTaskId = item.subtask?.task?.id || '';
                                        if (!parentTaskId) return;
                                        setSelectedSubtasks(prev => {
                                          const exists = prev.some(s => s.id === subtaskId);
                                          if (exists) return prev.filter(s => s.id !== subtaskId);
                                          return [...prev, { id: subtaskId, name: item.subtask?.name || '', task_id: parentTaskId }];
                                        });
                                      }}
                                      className="mt-0.5 shrink-0"
                                      aria-label="Select subtask"
                                      title="Select"
                                    >
                                      {selectedSubtasks.some(s => s.id === (item.subtask?.id || item.id)) ? (
                                        <CheckSquare className="h-4 w-4 text-primary" />
                                      ) : (
                                        <Square className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                      )}
                                    </button>
                                    <span className={getItemTitleClasses(item)}>{renderTaskName(item.subtask?.name || '')}</span>
                                    {/* Inline icons for subtasks */}
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => { e.stopPropagation(); openAssignForItem(item); }}
                                        className="h-6 px-1"
                                        title="Add to Workload"
                                      >
                                        <CalendarPlus className="h-3 w-3 text-yellow-500" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => { 
                                          e.stopPropagation();
                                          if (confirm("Convert this subtask to a task?")) {
                                            convertSubtaskToTaskMutation.mutate({ 
                                              subtaskId: item.subtask?.id || item.id, 
                                              subtaskName: item.subtask?.name || '' 
                                            });
                                          }
                                        }}
                                        className="h-6 px-1"
                                        title="Convert to Task"
                                      >
                                        <ArrowUpFromLine className="h-3 w-3 text-green-600" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          deleteItemMutation.mutate({ 
                                            id: item.subtask?.id || item.id, 
                                            type: 'subtask',
                                            name: item.subtask?.name || 'Subtask'
                                          }); 
                                        }}
                                        className="h-6 px-1 text-destructive hover:text-destructive"
                                        title="Delete subtask"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-1 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleSubtaskStatus(item.subtask);
                                        }}
                                      >
                                        {item.subtask?.status || 'Not Started'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className={cn(getItemTitleClasses(item), hasSlot && 'text-orange-600 dark:text-orange-400')}>
                                    {renderTaskName(getItemTitle(item) || '')}
                                  </span>
                                )}
                                {item.type === 'subtask' && item.subtask?.parent_task_name && item.subtask.parent_task_name !== item.subtask?.name && (
                                  <span className="text-xs text-muted-foreground">
                                    Parent: {item.subtask.parent_task_name}
                                  </span>
                                )}
                                {item.type === 'slot-task' && (
                                  <Badge variant="secondary" className="mt-1 w-fit text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                                    Time Slot
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={cn(
                                    "h-5 px-1.5 text-[10px]",
                                    getItemStatus(item) === 'Completed' && 'bg-green-100 text-green-800 border-green-200',
                                    getItemStatus(item) === 'In Progress' && 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                    getItemStatus(item) === 'Assigned' && 'bg-orange-100 text-orange-800 border-orange-200',
                                    getItemStatus(item) === 'On-Head' && 'bg-blue-100 text-blue-800 border-blue-200',
                                    !['Completed', 'In Progress', 'Assigned', 'On-Head'].includes(getItemStatus(item)) && 'bg-gray-100 text-gray-800 border-gray-200'
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.type === 'task' || item.type === 'slot-task') {
                                      handleToggleTaskStatus({
                                        id: item.task?.id || item.id,
                                        status: getItemStatus(item),
                                        name: item.task?.name || getItemTitle(item),
                                        project: item.task?.project
                                      });
                                    }
                                  }}
                                >
                                  {getItemStatus(item)}
                                </Button>
                                {(() => {
                                  const deadline = item.task?.deadline;
                                  if (deadline) {
                                    return (
                                      <span className="text-[10px] text-muted-foreground">
                                        Due: {format(new Date(deadline), 'MMM d')}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                                <span className="text-muted-foreground">•</span>
                                <span className="font-medium">{getItemProject(item)}</span>
                                <span className="text-muted-foreground">•</span>
                                {(() => {
                                  try {
                                    if (item.type === 'slot-task' && item.task?.slot_start_datetime) {
                                      const start = new Date(item.task.slot_start_datetime);
                                      const end = item.task.slot_end_datetime ? new Date(item.task.slot_end_datetime) : null;
                                      return end 
                                        ? `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
                                        : format(start, 'HH:mm');
                                    }
                                    if (item.scheduled_time.includes('T') || item.scheduled_time.includes(' ')) {
                                      return format(new Date(item.scheduled_time), 'HH:mm');
                                    }
                                    return format(new Date(`${item.scheduled_date}T${item.scheduled_time}`), 'HH:mm');
                                  } catch (error) {
                                    return 'Invalid time';
                                  }
                                })()}
                              </div>
                              {/* Only show action buttons row when item is clicked (expanded) */}
                              {collapsedItems.has(item.id) && item.type !== 'subtask' && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); openAssignForItem(item); }}
                                    className="h-7 px-2"
                                    title="Add to Workload"
                                  >
                                    <CalendarPlus className="h-4 w-4 text-yellow-500" />
                                  </Button>
                                  {(item.type === 'task' || item.type === 'slot-task') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setEditingTask({
                                          id: item.task?.id || item.id,
                                          name: item.task?.name || getItemTitle(item),
                                          status: item.task?.status,
                                          project_id: item.task?.project_id,
                                          deadline: item.task?.deadline,
                                          slot_start_datetime: item.task?.slot_start_datetime,
                                          slot_end_datetime: item.task?.slot_end_datetime,
                                        }); 
                                      }}
                                      className="h-7 px-2"
                                      title="Edit"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {(item.type === 'task' || item.type === 'slot-task') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMoveToProjectTask({
                                          id: realTaskId || item.id,
                                          name: item.task?.name || getItemTitle(item),
                                          project_id: item.task?.project_id || null,
                                        });
                                      }}
                                      className="h-7 px-2"
                                      title="Move to Project"
                                    >
                                      <FolderOpen className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {(item.type === 'task' || item.type === 'slot-task') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSubtaskDialogTaskId(realTaskId || item.id);
                                        setSubtaskDialogTaskName(item.task?.name || getItemTitle(item));
                                        setSubtaskDialogParentDeadline(item.task?.deadline);
                                        setSubtaskDialogOpen(true);
                                      }}
                                      className="h-7 px-2"
                                      title="Subtasks"
                                    >
                                      <List className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {(item.type === 'task' || item.type === 'slot-task') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConvertToSubtaskSourceTask({
                                          id: realTaskId || item.id,
                                          name: item.task?.name || getItemTitle(item),
                                        });
                                      }}
                                      className="h-7 px-2"
                                      title="Convert to Subtask"
                                    >
                                      <ArrowDownToLine className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  )}
                                  {(item.type === 'task' || item.type === 'slot-task') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        deleteItemMutation.mutate({ 
                                          id: realTaskId || item.id, 
                                          type: 'task',
                                          name: item.task?.name || 'Task'
                                        }); 
                                      }}
                                      className="h-7 px-2 text-destructive hover:text-destructive"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleStartTask(realTaskId || item.id, item.type === 'subtask')}
                                    className="h-7 px-2"
                                    title="Start"
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>

                                  {item.type === 'subtask' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2"
                                      title="Clear from slot"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearSubtaskFromSlotMutation.mutate({ subtaskId: item.subtask?.id || item.id });
                                      }}
                                      disabled={clearSubtaskFromSlotMutation.isPending}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}

                                  {(item.type === 'task' || item.type === 'slot-task') && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2"
                                      title="Clear from slot"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearFromSlotMutation.mutate({ taskId: realTaskId || item.id });
                                      }}
                                      disabled={clearFromSlotMutation.isPending}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      };

                      return (
                        <>
                          {/* Render other items first */}
                          {otherItems.map(item => renderItem(item))}

                          {/* Render Quick Tasks groups - expanded by default, click to collapse */}
                          {Object.entries(quickTaskGroups).map(([parentName, subtasks]) => {
                            const groupKey = `quicktask-group-${parentName}`;
                            const isExpanded = collapsedItems.has(groupKey); // Collapsed by default

                            return (
                              <div key={groupKey} className="border border-red-300 rounded-md bg-red-50 dark:bg-red-900/20">
                                <div
                                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30"
                                  onClick={() => setCollapsedItems(prev => {
                                    const next = new Set(prev);
                                    if (next.has(groupKey)) next.delete(groupKey);
                                    else next.add(groupKey);
                                    return next;
                                  })}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-red-600" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-red-600" />
                                  )}
                                  <span className="font-medium text-sm text-red-700 dark:text-red-300">
                                    {parentName}
                                  </span>
                                  <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200">
                                    {subtasks.length} subtasks
                                  </Badge>
                                </div>
                                {isExpanded && (
                                  <div className="space-y-1 p-2 pt-0">
                                    {subtasks.map(item => {
                                      const realTaskId = item.subtask?.id || item.id;
                                      const activeEntry = activeEntries.find(entry => entry.task_id === realTaskId);
                                      const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");
                                      const parentTaskId = item.subtask?.task?.id || '';

                                      return (
                                        <div
                                          key={item.id}
                                          className={cn(
                                            'flex items-start justify-between p-2 rounded-md transition-all bg-red-100/50 dark:bg-red-900/30',
                                            activeEntry && 'border border-orange-300 bg-orange-50 dark:bg-orange-900/20',
                                            getItemStatus(item) === 'In Progress' && 'border border-orange-300 bg-orange-50/60 dark:bg-orange-900/20'
                                          )}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!parentTaskId) return;
                                                  setSelectedSubtasks(prev => {
                                                    const exists = prev.some(s => s.id === realTaskId);
                                                    if (exists) return prev.filter(s => s.id !== realTaskId);
                                                    return [...prev, { id: realTaskId, name: item.subtask?.name || '', task_id: parentTaskId }];
                                                  });
                                                }}
                                                className="mt-0.5 shrink-0"
                                                aria-label="Select subtask"
                                                title="Select"
                                              >
                                                {selectedSubtasks.some(s => s.id === realTaskId) ? (
                                                  <CheckSquare className="h-4 w-4 text-primary" />
                                                ) : (
                                                  <Square className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                                )}
                                              </button>
                                              <span className={cn(
                                                'text-red-800 dark:text-red-200',
                                                item.subtask?.status === 'Completed' && 'line-through decoration-current/70'
                                              )}>
                                                {renderTaskName(item.subtask?.name || '')}
                                              </span>
                                              {/* Inline icons for Quick Tasks subtasks */}
                                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={(e) => { e.stopPropagation(); openAssignForItem(item); }}
                                                  className="h-5 px-1"
                                                  title="Add to Workload"
                                                >
                                                  <CalendarPlus className="h-3 w-3 text-yellow-500" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    deleteItemMutation.mutate({ 
                                                      id: item.subtask?.id || item.id, 
                                                      type: 'subtask',
                                                      name: item.subtask?.name || 'Subtask'
                                                    });
                                                  }}
                                                  className="h-5 px-1 text-destructive hover:text-destructive"
                                                  title="Delete"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-5 px-1 text-xs"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleSubtaskStatus(item.subtask);
                                                  }}
                                                >
                                                  {item.subtask?.status || 'Not Started'}
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {activeEntry ? (
                                              <>
                                                <LiveTimer
                                                  startTime={activeEntry.start_time}
                                                  isPaused={isPaused}
                                                  timerMetadata={activeEntry.timer_metadata}
                                                />
                                                <CompactTimerControls
                                                  taskId={realTaskId}
                                                  taskName={item.subtask?.name || ''}
                                                  entryId={activeEntry.id}
                                                  timerMetadata={activeEntry.timer_metadata}
                                                  onTimerUpdate={() => {}}
                                                />
                                              </>
                                            ) : (
                                              <>
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleStartTask(realTaskId, true)}
                                                  className="h-6 px-1"
                                                  title="Start"
                                                >
                                                  <Play className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 px-1"
                                                  title="Clear from slot"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearSubtaskFromSlotMutation.mutate({ subtaskId: realTaskId });
                                                  }}
                                                  disabled={clearSubtaskFromSlotMutation.isPending}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );})}
          </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
    {editingTask && (
      <TaskEditDialog
        isOpen={!!editingTask}
        onClose={() => { 
          setEditingTask(null); 
          queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] }); 
        }}
        task={editingTask}
        mode="full"
      />
    )}
    <AssignToSlotDialog
      open={isAssignDialogOpen}
      onOpenChange={setIsAssignDialogOpen}
      selectedItems={selectedItemsForWorkload}
      onAssigned={() => {
        setIsAssignDialogOpen(false);
        setSelectedItemsForWorkload([]);
        toast.success('Added to workload');
        queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
      }}
    />

    <MoveSubtasksDialog
      open={isMoveDialogOpen}
      onOpenChange={setIsMoveDialogOpen}
      selectedSubtasks={selectedSubtasks}
      onSuccess={() => {
        setSelectedSubtasks([]);
        queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
        queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['subtasks'] });
        queryClient.invalidateQueries({ queryKey: ['task-subtasks'] });
      }}
    />

    <MoveToProjectDialog
      open={!!moveToProjectTask}
      onOpenChange={(open) => {
        if (!open) setMoveToProjectTask(null);
      }}
      taskId={moveToProjectTask?.id || ""}
      taskName={moveToProjectTask?.name}
      currentProjectId={moveToProjectTask?.project_id || null}
      onMoved={() => {
        queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
        queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['hostlist-tasks'] });
      }}
    />
    <ConvertToSubtaskDialog
      open={!!convertToSubtaskSourceTask}
      onOpenChange={(open) => {
        if (!open) setConvertToSubtaskSourceTask(null);
      }}
      sourceTask={convertToSubtaskSourceTask}
      onSuccess={() => {
        // Ensure current shift refreshes after conversion.
        queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
        queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['hostlist-tasks'] });
      }}
    />
    <Dialog open={subtaskDialogOpen} onOpenChange={(open) => { if (!open) { setSubtaskDialogOpen(false); setSubtaskDialogTaskId(null); setSubtaskDialogTaskName(''); setSubtaskNewName(''); setSubtaskEditId(null); setSubtaskEditText(''); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subtasks for {subtaskDialogTaskName || 'Task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (subtaskDialogTaskId && subtaskNewName.trim()) {
                handleCreateSubtask(subtaskDialogTaskId, subtaskNewName, subtaskDialogParentDeadline);
                setSubtaskNewName('');
              }
            }}
            className="flex gap-2"
          >
            <input
              className="flex-1 rounded-md border px-2 py-1 text-sm bg-background"
              placeholder="Add subtask"
              value={subtaskNewName}
              onChange={(e) => setSubtaskNewName(e.target.value)}
            />
            <Button size="sm" type="submit" disabled={!subtaskNewName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          {isDialogSubtasksLoading ? (
            <div className="text-sm text-muted-foreground">Loading subtasks...</div>
          ) : dialogSubtasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">No subtasks</div>
          ) : (
            <div className="space-y-2">
              {dialogSubtasks.map((st: any) => (
                <div key={st.id} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleToggleSubtaskStatus(st)}
                      title="Toggle status"
                    >
                      {st.status === 'Completed' ? (
                        <CheckSquare className="h-4 w-4 text-green-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                    {subtaskEditId === st.id ? (
                      <input
                        className="rounded border px-1 py-0.5 text-sm"
                        value={subtaskEditText}
                        onChange={(e) => setSubtaskEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (subtaskEditText.trim()) {
                              supabase.from('subtasks').update({ name: subtaskEditText.trim() }).eq('id', st.id).then(({ error }) => {
                                if (!error) {
                                  setSubtaskEditId(null);
                                  setSubtaskEditText('');
                                  queryClient.invalidateQueries({ queryKey: ['task-subtasks'] });
                                  queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
                                }
                              });
                            }
                          }
                        }}
                      />
                    ) : (
                      <span className={cn(
                        'text-sm',
                        st.status === 'Completed' && 'line-through text-muted-foreground'
                      )}>
                        {st.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {subtaskEditId === st.id ? (
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (subtaskEditText.trim()) {
                          supabase.from('subtasks').update({ name: subtaskEditText.trim() }).eq('id', st.id).then(({ error }) => {
                            if (!error) {
                              setSubtaskEditId(null);
                              setSubtaskEditText('');
                              queryClient.invalidateQueries({ queryKey: ['task-subtasks'] });
                              queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
                            }
                          });
                        }
                      }} className="h-7 px-2">Save</Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setSubtaskEditId(st.id); setSubtaskEditText(st.name); }}
                        className="h-7 px-2"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteSubtask(st)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

interface TaskSubtaskListProps {
  taskId: string;
  parentDeadline?: string | null;
  isOpen: boolean;
  onCreateSubtask: (taskId: string, name: string, parentDeadline?: string | null) => void;
  onToggleStatus: (subtask: any) => void;
  onDelete: (subtaskId: string) => void;
}

const TaskSubtaskList: React.FC<TaskSubtaskListProps> = ({
  taskId,
  parentDeadline,
  isOpen,
  onCreateSubtask,
  onToggleStatus,
  onDelete,
}) => {
  const [newSubtask, setNewSubtask] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ['task-subtasks', taskId],
    enabled: isOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subtasks')
        .select('id, name, status, deadline')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const saveEdit = () => {
    if (!editingId || !editText.trim()) return;
    supabase.from('subtasks').update({ name: editText.trim() }).eq('id', editingId).then(({ error }) => {
      if (!error) {
        setEditingId(null);
        setEditText('');
      }
    });
  };

  return (
    <div className="mt-2 rounded-md border border-muted p-3 space-y-2 bg-background">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newSubtask.trim()) {
            onCreateSubtask(taskId, newSubtask, parentDeadline);
            setNewSubtask('');
          }
        }}
        className="flex gap-2"
      >
        <input
          className="flex-1 rounded-md border px-2 py-1 text-sm bg-background"
          placeholder="Add subtask"
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
        />
        <Button size="sm" type="submit" disabled={!newSubtask.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading subtasks...</div>
      ) : subtasks.length === 0 ? (
        <div className="text-xs text-muted-foreground">No subtasks</div>
      ) : (
        <div className="space-y-2">
          {subtasks.map((st: any) => (
            <div
              key={st.id}
              className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-sm"
            >
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onToggleStatus(st)}
                  title="Toggle status"
                >
                  {st.status === 'Completed' ? (
                    <CheckSquare className="h-4 w-4 text-green-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
                {editingId === st.id ? (
                  <input
                    className="rounded border px-1 py-0.5 text-sm"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEdit();
                      }
                    }}
                  />
                ) : (
                  <span className={cn(
                    'truncate',
                    st.status === 'Completed' && 'line-through text-muted-foreground'
                  )}>
                    {st.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {editingId === st.id ? (
                  <Button size="sm" variant="ghost" onClick={saveEdit} className="h-7 px-2">Save</Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingId(st.id); setEditText(st.name); }}
                    className="h-7 px-2"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => onDelete(st.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
