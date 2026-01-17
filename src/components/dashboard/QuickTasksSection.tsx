import { useState, useMemo, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, Eye, Pencil, Trash2, GripVertical, List, Clock, Plus, ChevronDown, ChevronUp, CalendarPlus, ChevronRight, ArrowRight, Square, CheckSquare, FolderOpen, ArrowUpFromLine, ArrowDownToLine, Check, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { logActivity, logTaskCreated, logTaskStatusChanged } from "@/utils/activityLogger";
import { MoveSubtasksDialog } from "./MoveSubtasksDialog";
import { ConvertToSubtaskDialog } from "./ConvertToSubtaskDialog";
import LiveTimer from "./LiveTimer";
import CompactTimerControls from "./CompactTimerControls";
import TaskEditDialog from "@/components/TaskEditDialog";
import SubtaskDialog from "@/components/SubtaskDialog";
import TimeTrackerWithComment from "@/components/TimeTrackerWithComment";
import ManualTimeLog from "@/components/ManualTimeLog";
import AssignToSlotDialog from "@/components/AssignToSlotDialog";
import { MoveToProjectDialog } from "@/components/MoveToProjectDialog";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { convertISTToUTC } from "@/utils/timezoneUtils";
import type { Database } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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

type TimeFilter = "all" | "yesterday" | "today" | "tomorrow" | "laterThisWeek" | "nextWeek";
type AssignmentFilter = "all" | "assigned" | "unassigned";
type EmployeeForSubtaskDialog = { id: string; name: string; email: string };
type EditableSubtask = {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
  estimated_duration: number | null;
  assignee_id: string | null;
  task_id: string;
};

interface QuickTasksSectionProps {
  title?: string;
  defaultOpen?: boolean;
  showProjectFilters?: boolean;
  projectScope?: "misc" | "all";
}

export const QuickTasksSection = ({
  title = "Quick Tasks",
  defaultOpen = true,
  showProjectFilters = false,
  projectScope = "misc"
}: QuickTasksSectionProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [moveToProjectTask, setMoveToProjectTask] = useState<{ id: string; name: string; project_id: string | null } | null>(null);
  const [convertToSubtaskSourceTask, setConvertToSubtaskSourceTask] = useState<{ id: string; name: string } | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showingSubtasksFor, setShowingSubtasksFor] = useState<string | null>(null);
  const [showingActionsFor, setShowingActionsFor] = useState<string | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedItemsForWorkload, setSelectedItemsForWorkload] = useState<any[]>([]);
  const [selectedSubtasks, setSelectedSubtasks] = useState<{ id: string; name: string; task_id: string }[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [editingSubtaskForDialog, setEditingSubtaskForDialog] = useState<EditableSubtask | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState<"services" | "clients" | "projects">("services");

  const { data: employeesForSubtaskDialog = [] } = useQuery({
    queryKey: ["employees-for-subtask-dialog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, email")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as EmployeeForSubtaskDialog[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["quick-tasks-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["quick-tasks-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["quick-tasks-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, service, client_id")
        .order("name");
      if (error) throw error;
      return data || [];
    }
  });

  const selectedClientNames = useMemo(() => {
    return selectedClients
      .map(clientId => clients.find(c => c.id === clientId)?.name)
      .filter((name): name is string => !!name);
  }, [selectedClients, clients]);

  const availableClients = useMemo(() => {
    if (selectedServices.length === 0) return clients;
    const clientNameSet = new Set(
      projects
        .filter(project => selectedServices.includes(project.service))
        .map(project => clients.find(c => c.id === project.client_id)?.name)
        .filter((name): name is string => !!name)
    );
    return clients.filter(client => clientNameSet.has(client.name));
  }, [clients, projects, selectedServices]);

  const availableProjects = useMemo(() => {
    let filtered = projects;
    if (selectedServices.length > 0) {
      filtered = filtered.filter(project => selectedServices.includes(project.service));
    }
    if (selectedClients.length > 0) {
      filtered = filtered.filter(project => selectedClients.includes(project.client_id));
    }
    return filtered;
  }, [projects, selectedServices, selectedClients]);

  const projectNameMap = useMemo(() => {
    return new Map(projects.map(project => [project.id, project.name]));
  }, [projects]);

  const toDateInputValue = (deadline: string | null) => {
    if (!deadline) return null;
    // If stored as ISO datetime, convert to YYYY-MM-DD for <input type="date" />
    if (deadline.includes("T")) return deadline.slice(0, 10);
    return deadline;
  };

  // Preserve page scroll position across quick-task mutations / refetches.
  // This prevents the browser from jumping (often to the bottom) after any action.
  const pendingScrollRestoreRef = useRef<number | null>(null);
  const captureScrollPosition = useCallback(() => {
    pendingScrollRestoreRef.current = window.scrollY;
  }, []);

  

  

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 8,
        delay: 200, // 200ms delay to distinguish between scroll and drag
        tolerance: 5,
      },
    })
  );

  // Fetch the project
  const { data: project } = useQuery({
    queryKey: ["miscellaneous-project"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id")
        .eq("name", "Miscellanious-Quick-Temp-Orglater")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch tasks from the project with subtasks and logged time
  const { data: tasks, refetch } = useQuery({
    queryKey: ["quick-tasks", projectScope, project?.id, showCompleted],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          id,
          created_at,
          name,
          deadline,
          status,
          project_id,
          reminder_datetime,
          slot_start_time,
          slot_start_datetime,
          slot_end_datetime,
          scheduled_time,
          sort_order
        `)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("deadline", { ascending: true });

      if (projectScope === "misc") {
        if (!project?.id) return [];
        query = query.eq("project_id", project.id);
      }

      // Only filter out completed if showCompleted is false
      if (!showCompleted) {
        query = query.neq("status", "Completed");
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Enhance tasks with subtasks and logged time data
      const enhancedTasks = await Promise.all(
        (data || []).map(async (task) => {
          // Fetch subtasks for this task
          const { data: subtasks } = await supabase
            .from('subtasks')
            .select('id, name, status, deadline, estimated_duration, assignee_id')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true });

          // Fetch logged time for subtasks with details
          const subtaskIds = subtasks?.map(st => st.id) || [];
          let subtaskTimeEntries: any[] = [];
          let subtaskTimeMap: Record<string, number> = {};
          let subtaskDetailedEntries: Record<string, any[]> = {};
          
          if (subtaskIds.length > 0) {
            const { data: subtaskEntries } = await supabase
              .from('time_entries')
              .select('id, duration_minutes, start_time, end_time, comment, entry_type, task_id')
              .in('task_id', subtaskIds)
              .not('end_time', 'is', null)
              .order('start_time', { ascending: false });
            
            subtaskTimeEntries = subtaskEntries || [];
            
            // Create a map of subtask ID to total logged minutes
            subtaskTimeMap = subtaskTimeEntries.reduce((acc, entry) => {
              acc[entry.task_id] = (acc[entry.task_id] || 0) + (entry.duration_minutes || 0);
              return acc;
            }, {} as Record<string, number>);
            
            // Group detailed entries by subtask ID
            subtaskDetailedEntries = subtaskTimeEntries.reduce((acc, entry) => {
              if (!acc[entry.task_id]) {
                acc[entry.task_id] = [];
              }
              acc[entry.task_id].push(entry);
              return acc;
            }, {} as Record<string, any[]>);
          }

          // Fetch logged time entries for this task with details
          const { data: timeEntries } = await supabase
            .from('time_entries')
            .select('id, duration_minutes, start_time, end_time, comment, entry_type')
            .eq('task_id', task.id)
            .not('end_time', 'is', null)
            .order('start_time', { ascending: false });

          const totalLoggedMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
          const subtaskLoggedMinutes = subtaskTimeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
          const totalLoggedHours = Math.round(((totalLoggedMinutes + subtaskLoggedMinutes) / 60) * 100) / 100;

          // Return all subtasks - filtering happens at display time based on showCompleted
          const allSubtasks = subtasks || [];

          return {
            ...task,
            time_entries: timeEntries || [],
            subtasks: allSubtasks.map(subtask => ({
              ...subtask,
              logged_minutes: subtaskTimeMap[subtask.id] || 0,
              logged_hours: Math.round(((subtaskTimeMap[subtask.id] || 0) / 60) * 100) / 100,
              time_entries: subtaskDetailedEntries[subtask.id] || []
            })),
            total_logged_hours: totalLoggedHours,
            subtask_count: allSubtasks.filter(st => st.status !== 'Completed').length
          };
        })
      );

      return enhancedTasks;
    },
    enabled: projectScope === "misc" ? !!project?.id : true,
  });

  // Fetch active time entries for these tasks
  const { data: timeEntries } = useQuery({
    queryKey: ["quick-task-time-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .is("end_time", null);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
  });

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = startOfDay(addDays(now, -1));
    const yesterdayEnd = endOfDay(addDays(now, -1));
    const tomorrowStart = startOfDay(addDays(now, 1));
    const tomorrowEnd = endOfDay(addDays(now, 1));
    const thisWeekEnd = endOfWeek(now);
    const nextWeekStart = startOfWeek(addDays(now, 7));
    const nextWeekEnd = endOfWeek(addDays(now, 7));

    let filtered = tasks;

    if (timeFilter !== "all") {
      filtered = tasks.filter((task) => {
        if (!task.deadline) return false;
        const deadline = new Date(task.deadline);

        switch (timeFilter) {
          case "yesterday":
            return deadline >= yesterdayStart && deadline <= yesterdayEnd;
          case "today":
            return deadline >= todayStart && deadline <= todayEnd;
          case "tomorrow":
            return deadline >= tomorrowStart && deadline <= tomorrowEnd;
          case "laterThisWeek":
            return deadline > tomorrowEnd && deadline <= thisWeekEnd;
          case "nextWeek":
            return deadline >= nextWeekStart && deadline <= nextWeekEnd;
          default:
            return true;
        }
      });
    }

    // Apply assignment filter
    if (assignmentFilter === "assigned") {
      filtered = filtered.filter(task => task.status === 'Assigned' || !!task.slot_start_datetime || !!task.slot_start_time || !!task.scheduled_time);
    } else if (assignmentFilter === "unassigned") {
      filtered = filtered.filter(task => task.status !== 'Assigned' && !task.slot_start_datetime && !task.slot_start_time && !task.scheduled_time);
    }

    // Apply search filter before sorting (including subtasks)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchLower) ||
        (task.subtasks || []).some((subtask: any) => subtask.name.toLowerCase().includes(searchLower))
      );
    }

    // Apply service/client/project filters
    if (showProjectFilters && (selectedServices.length > 0 || selectedClients.length > 0 || selectedProject)) {
      const projectsById = new Map(projects.map(project => [project.id, project]));
      filtered = filtered.filter(task => {
        const project = projectsById.get(task.project_id);
        if (!project) return false;
        const matchesService = selectedServices.length === 0 || selectedServices.includes(project.service);
        const matchesClient = selectedClients.length === 0 || selectedClients.includes(project.client_id);
        const matchesProject = !selectedProject || task.project_id === selectedProject;
        return matchesService && matchesClient && matchesProject;
      });
    }

    // Sort logic
    // 1. Tasks without a custom sort_order ("recently added") stay on top
    // 2. Within "recently added", newest first (created_at desc)
    // 3. For manually ordered tasks, use sort_order (ascending)
    const sorted = [...filtered].sort((a, b) => {
      const hasSortA = a.sort_order !== null && a.sort_order !== undefined;
      const hasSortB = b.sort_order !== null && b.sort_order !== undefined;

      // Priority 1: Recently added (no sort_order) first
      if (!hasSortA && hasSortB) return -1;
      if (hasSortA && !hasSortB) return 1;

      // Priority 2: If both are recently added, newest first
      if (!hasSortA && !hasSortB) {
        const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (createdA !== createdB) return createdB - createdA;
      }

      // Priority 3: If both have sort_order, use it
      if (hasSortA && hasSortB) {
        return a.sort_order - b.sort_order;
      }

      // Priority 2: For "all" filter, sort by date and time
      if (timeFilter === "all") {
        // Sort by deadline date (most recent first)
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        
        if (dateA !== dateB) {
          return dateA - dateB; // Ascending (earliest first)
        }

        // If dates are same or both null, sort by nearest reminder/slot time
        const getNearestTime = (task: any) => {
          const times = [] as number[];
          if (task.slot_start_datetime) {
            const t = new Date(task.slot_start_datetime).getTime();
            if (!isNaN(t)) times.push(t);
          }
          if (task.slot_start_time) {
            const t = new Date(task.slot_start_time).getTime();
            if (!isNaN(t)) times.push(t);
          }
          if (task.reminder_datetime) {
            const t = new Date(task.reminder_datetime).getTime();
            if (!isNaN(t)) times.push(t);
          }
          return times.length > 0 ? Math.min(...times) : Infinity;
        };

        const timeA = getNearestTime(a);
        const timeB = getNearestTime(b);
        
        return timeA - timeB; // Nearest time first
      }

      // For other filters, just use deadline
      const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return dateA - dateB;
    });

    return sorted;
  }, [tasks, timeFilter, assignmentFilter, searchTerm, selectedServices, selectedClients, selectedProject, projects, showProjectFilters]);

  useLayoutEffect(() => {
    const y = pendingScrollRestoreRef.current;
    if (y === null) return;
    pendingScrollRestoreRef.current = null;
    requestAnimationFrame(() => {
      window.scrollTo({ top: y });
    });
  }, [tasks]);

  const filterCounts = useMemo(() => {
    if (!tasks) return { all: 0, yesterday: 0, today: 0, tomorrow: 0, laterThisWeek: 0, nextWeek: 0 };
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = startOfDay(addDays(now, -1));
    const yesterdayEnd = endOfDay(addDays(now, -1));
    const tomorrowStart = startOfDay(addDays(now, 1));
    const tomorrowEnd = endOfDay(addDays(now, 1));
    const thisWeekEnd = endOfWeek(now);
    const nextWeekStart = startOfWeek(addDays(now, 7));
    const nextWeekEnd = endOfWeek(addDays(now, 7));

    const withDeadline = tasks.filter(t => !!t.deadline);
    const inRange = (d: Date, start: Date, end: Date) => d >= start && d <= end;
    const all = tasks.length;
    const yesterday = withDeadline.filter(t => inRange(new Date(t.deadline), yesterdayStart, yesterdayEnd)).length;
    const today = withDeadline.filter(t => inRange(new Date(t.deadline), todayStart, todayEnd)).length;
    const tomorrow = withDeadline.filter(t => inRange(new Date(t.deadline), tomorrowStart, tomorrowEnd)).length;
    const laterThisWeek = withDeadline.filter(t => {
      const d = new Date(t.deadline);
      return d > tomorrowEnd && d <= thisWeekEnd;
    }).length;
    const nextWeek = withDeadline.filter(t => inRange(new Date(t.deadline), nextWeekStart, nextWeekEnd)).length;

    // Assignment counts
    const assigned = tasks.filter(t => t.status === 'Assigned' || !!t.slot_start_datetime || !!t.slot_start_time || !!t.scheduled_time).length;
    const unassigned = tasks.filter(t => t.status !== 'Assigned' && !t.slot_start_datetime && !t.slot_start_time && !t.scheduled_time).length;

    return { all, yesterday, today, tomorrow, laterThisWeek, nextWeek, assigned, unassigned };
  }, [tasks]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskNames: string[]) => {
      
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();

      // Calculate deadline based on time filter
      let deadlineDate: Date = new Date();
      const now = new Date();
      
      switch (timeFilter) {
        case "yesterday":
          deadlineDate = endOfDay(addDays(now, -1));
          break;
        case "today":
          deadlineDate = endOfDay(now);
          break;
        case "tomorrow":
          deadlineDate = endOfDay(addDays(now, 1));
          break;
        case "laterThisWeek":
          deadlineDate = endOfWeek(now);
          break;
        case "nextWeek":
          deadlineDate = endOfWeek(addDays(now, 7));
          break;
        default:
          deadlineDate = endOfDay(now);
      }

      const deadlineIso = deadlineDate.toISOString();
      // Align with CurrentShiftSection expectations: set date + scheduled_time on deadline's calendar day
      const deadlineDateStr = format(deadlineDate, "yyyy-MM-dd");
      const scheduledTime = "23:00"; // place into final shift of that day

      const targetProjectId = selectedProject || project?.id || null;
      if (!targetProjectId) {
        throw new Error("Please select a project");
      }

      const rows = taskNames.map(taskName => ({
        name: taskName,
        project_id: targetProjectId,
        status: "Not Started" as const,
        assigner_id: employee?.id,
        deadline: deadlineIso,
        date: deadlineDateStr,
        scheduled_time: scheduledTime,
      }));

      const { data, error } = await supabase
        .from("tasks")
        .insert(rows)
        .select();

      if (error) throw error;
      return data;
    },
    onMutate: () => {
      captureScrollPosition();
    },
    onSuccess: async (data) => {
      toast.success("Task created successfully");
      setNewTaskName("");
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });

      try {
        (data || []).forEach((task: any) => {
          const projectName = projectNameMap.get(task.project_id) || "Unknown Project";
          logTaskCreated(task.name, task.id, projectName);
        });
        queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      } catch (error) {
        console.error("Failed to log task creation activity:", error);
      }
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to create task");
      console.error(error);
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string; taskName?: string; projectName?: string }) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
    },
    onMutate: () => {
      captureScrollPosition();
    },
    onSuccess: (_data, variables) => {
      toast.success("Task deleted successfully");
      
      // Invalidate all relevant dashboard queries for instant refresh
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["quick-task-time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-workload"] });
      queryClient.invalidateQueries({ queryKey: ["runningTasks"] });

      if (variables?.taskId && variables?.taskName) {
        logActivity({
          action_type: "deleted",
          entity_type: "task",
          entity_id: variables.taskId,
          entity_name: variables.taskName,
          description: `Deleted task: ${variables.taskName}`,
          comment: variables.projectName ? `Project: ${variables.projectName}` : undefined
        });
        queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      }
    },
    onError: (error) => {
      toast.error("Failed to delete task");
      console.error(error);
    },
  });

  // Update task status mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Database["public"]["Enums"]["task_status"]; taskName?: string; oldStatus?: string; projectName?: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId);

      if (error) throw error;
    },
    onMutate: () => {
      captureScrollPosition();
    },
    onSuccess: (_data, variables) => {
      toast.success("Task status updated successfully");
      // Invalidate all relevant dashboard queries for instant refresh
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-workload"] });
      queryClient.invalidateQueries({ queryKey: ["runningTasks"] });

      if (variables?.taskId && variables?.taskName && variables?.oldStatus) {
        logTaskStatusChanged(
          variables.taskName,
          variables.taskId,
          variables.status,
          variables.oldStatus,
          variables.projectName
        );
        queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      }
    },
    onError: (error) => {
      toast.error("Failed to update task status");
      console.error(error);
    },
  });

  // Convert subtask to task mutation
  const convertSubtaskToTaskMutation = useMutation({
    mutationFn: async ({ subtaskId, subtaskName, parentTaskId }: { subtaskId: string; subtaskName: string; parentTaskId: string }) => {
      if (!project?.id) throw new Error("Project not found");
      
      // Get subtask details
      const { data: subtask, error: subtaskError } = await supabase
        .from("subtasks")
        .select("deadline, status, estimated_duration, assignee_id")
        .eq("id", subtaskId)
        .single();
      
      if (subtaskError) throw subtaskError;
      
      // Create new task from subtask
      const { error: taskError } = await supabase
        .from("tasks")
        .insert({
          name: subtaskName,
          project_id: project.id,
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
    onMutate: () => {
      captureScrollPosition();
    },
    onSuccess: () => {
      toast.success("Subtask converted to task");
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
    },
    onError: (error) => {
      toast.error("Failed to convert subtask to task");
      console.error(error);
    },
  });

  // Drag and drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset touch styles after drag ends
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = filteredTasks.findIndex((task) => task.id === active.id);
    const newIndex = filteredTasks.findIndex((task) => task.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Update sort_order for the moved task and adjacent tasks
    const reorderedTasks = arrayMove(filteredTasks, oldIndex, newIndex);
    
    // Update sort_order in database
    const updatePromises = reorderedTasks.map((task, index) => 
      supabase
        .from("tasks")
        .update({ sort_order: index })
        .eq("id", task.id)
    );
    
    Promise.all(updatePromises).then(() => {
      captureScrollPosition();
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
    });
  };

  // Prevent default touch behaviors that interfere with dragging
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only prevent default on the drag container, allow scrolling elsewhere
    if (e.target instanceof Element && e.target.closest('.drag-handle')) {
      e.preventDefault();
    }
  };

  // Sortable Task Component with subtasks and time logging
  const SortableTask: React.FC<{ task: any; activeEntry?: any; isPaused?: boolean }> = ({ task, activeEntry, isPaused }) => {
    const enableDrag = projectScope === "misc";
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
      active,
    } = useSortable({ id: task.id, disabled: !enableDrag });

    const [showSubtasks, setShowSubtasks] = useState<boolean>(() => {
      try {
        const raw = sessionStorage.getItem('quick.expandedSubtasks');
        // Default to false (collapsed) if no preference is saved
        if (raw === null) return false;
        const arr = JSON.parse(raw);
        return arr.includes(task.id);
      } catch {
        return false;
      }
    });
    const [newSubtaskName, setNewSubtaskName] = useState("");
    const [showTimeControls, setShowTimeControls] = useState(false);
    const [showTimeHistory, setShowTimeHistory] = useState(false);

    const visibleSubtasks = useMemo(() => {
      const list = (task.subtasks || []).filter((subtask: any) => 
        showCompleted ? true : subtask.status !== 'Completed'
      );
      const withKey = list.map((st: any) => {
        const match = /^(\d+)/.exec(st.name?.trim() || '');
        return { ...st, _sortKey: match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER };
      });
      return withKey.sort((a: any, b: any) => a._sortKey - b._sortKey || (a.name || '').localeCompare(b.name || ''));
    }, [task.subtasks, showCompleted]);

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const handleAddSubtask = (e: React.FormEvent) => {
      e.preventDefault();
      const names = newSubtaskName
        .split(/\r?\n/)
        .flatMap(part => part.split(","))
        .map(name => name.trim())
        .filter(Boolean);
      if (names.length > 0) {
        createSubtaskMutation.mutate({ taskId: task.id, names });
        // Persist expansion state
        try {
          const raw = sessionStorage.getItem('quick.expandedSubtasks') || '[]';
          const arr = JSON.parse(raw);
          if (!arr.includes(task.id)) {
            arr.push(task.id);
            sessionStorage.setItem('quick.expandedSubtasks', JSON.stringify(arr));
          }
        } catch {}
        setNewSubtaskName("");
      }
    };

    const openSubtaskEditDialog = (subtask: any) => {
      setEditingSubtaskForDialog({
        id: subtask.id,
        name: subtask.name,
        status: subtask.status,
        deadline: toDateInputValue(subtask.deadline),
        estimated_duration: subtask.estimated_duration ?? null,
        assignee_id: subtask.assignee_id ?? null,
        task_id: task.id,
      });
      setIsSubtaskDialogOpen(true);
    };

    const handleDeleteSubtask = (subtask: any) => {
      if (confirm("Are you sure you want to delete this subtask?")) {
        deleteSubtaskMutation.mutate({
          subtaskId: subtask.id,
          subtaskName: subtask.name
        });
      }
    };

    const handleToggleSubtaskStatus = (subtask: any, parentTaskId: string) => {
      const subtaskId = subtask.id;
      const currentStatus = subtask.status;
      let newStatus;
      switch (currentStatus) {
        case "Not Started":
          newStatus = "In Progress";
          break;
        case "In Progress":
          newStatus = "Completed";
          break;
        case "Completed":
          newStatus = "Not Started";
          break;
        default:
          newStatus = "Not Started";
      }
      updateSubtaskMutation.mutate({
        subtaskId,
        status: newStatus,
        parentTaskId,
        subtaskName: subtask.name
      });
      // Persist expansion state
      try {
        const raw = sessionStorage.getItem('quick.expandedSubtasks') || '[]';
        const arr = JSON.parse(raw);
        if (!arr.includes(task.id)) {
          arr.push(task.id);
          sessionStorage.setItem('quick.expandedSubtasks', JSON.stringify(arr));
        }
      } catch {}
    };

    const handleToggleTaskStatus = (task: any) => {
      const taskId = task.id;
      const currentStatus = task.status;
      let newStatus;
      switch (currentStatus) {
        case "Not Started":
          newStatus = "In Progress";
          break;
        case "In Progress":
          newStatus = "Completed";
          break;
        case "Completed":
          newStatus = "Not Started";
          break;
        default:
          newStatus = "Not Started";
      }
      
      updateTaskStatusMutation.mutate({
        taskId,
        status: newStatus,
        taskName: task.name,
        oldStatus: currentStatus,
        projectName: projectNameMap.get(task.project_id) || "Unknown Project"
      });
    };

    const openAssignForTask = (task: any) => {
      const item = {
        id: task.id,
        originalId: task.id,
        type: 'task',
        itemType: 'task',
        title: task.name,
        date: new Date().toISOString().slice(0, 10),
        client: '',
        project: '',
        assigneeId: null,
        projectId: task.project_id,
      };
      setSelectedItemsForWorkload([item]);
      setIsAssignDialogOpen(true);
    };

    return (
      <div ref={setNodeRef} style={style} className={`select-none ${active?.id === task.id ? 'drag-active' : ''}`}>
        <Card className={projectScope === "all" ? "p-2 w-full" : "p-4 w-full"}>
          <div className={projectScope === "all" ? "flex flex-col gap-2" : "flex flex-col gap-3"}>
            <div className="flex items-center gap-3">
              {/* Dedicated drag handle for better mobile touch support */}
              {enableDrag && (
                <div
                  key={`drag-handle-${task.id}`}
                  {...attributes}
                  {...listeners}
                  className="drag-handle cursor-grab active:cursor-grabbing p-2 rounded hover:bg-muted/50 transition-all duration-200 select-none"
                  role="button"
                  aria-label="Drag task"
                  style={{ touchAction: 'none' }}
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground pointer-events-none transition-transform duration-200" />
                </div>
              )}
              <div
                className="flex-1 task-content-area cursor-pointer"
                onClick={() => setShowingActionsFor(showingActionsFor === task.id ? null : task.id)}
              >
                <h3 className="font-medium text-sm sm:text-base break-words">{renderTaskName(task.name)}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span 
                    className={`px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-80 ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      task.status === 'Assigned' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                    onClick={() => handleToggleTaskStatus(task)}
                  >
                    {task.status}
                  </span>
                  <span>Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</span>
                  {projectScope === "all" && (
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      Project: {projectNameMap.get(task.project_id) || "Unknown"}
                    </span>
                  )}
                  {task.total_logged_hours > 0 && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {task.total_logged_hours}h logged
                    </span>
                  )}
                  {task.subtask_count > 0 && (
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      {task.subtask_count} subtasks
                    </span>
                  )}
                </div>
                {(task.reminder_datetime || task.slot_start_time) && (
                  <p className="text-xs text-muted-foreground break-words mt-1">
                    {task.reminder_datetime && `Reminder: ${new Date(task.reminder_datetime).toLocaleString()}`}
                    {task.reminder_datetime && task.slot_start_time && " | "}
                    {task.slot_start_time && `Slot: ${new Date(task.slot_start_time).toLocaleString()}`}
                  </p>
                )}
              </div>
            </div>

            {(showingActionsFor === task.id || activeEntry) && (
            <div className="mt-2 flex flex-wrap gap-2 justify-start task-content-area">
              {/* Time Controls Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTimeControls(!showTimeControls);
                }}
                className="h-8 px-3"
                type="button"
              >
                <Clock className="h-4 w-4" />
              </Button>

              {/* Subtasks Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !showSubtasks;
                  setShowSubtasks(next);
                  try {
                    const raw = sessionStorage.getItem('quick.expandedSubtasks') || '[]';
                    let arr = JSON.parse(raw);
                    if (next) {
                      if (!arr.includes(task.id)) arr.push(task.id);
                    } else {
                      arr = arr.filter((id: string) => id !== task.id);
                    }
                    sessionStorage.setItem('quick.expandedSubtasks', JSON.stringify(arr));
                  } catch {}
                }}
                className="h-8 px-3"
                type="button"
              >
                <List className="h-4 w-4" />
                {visibleSubtasks.length > 0 && (
                  <span className="ml-1 text-xs">{visibleSubtasks.length}</span>
                )}
              </Button>

              {activeEntry ? (
                <>
                  <div className="flex flex-col items-start gap-1">
                    <LiveTimer
                      startTime={activeEntry.start_time}
                      isPaused={isPaused}
                      timerMetadata={activeEntry.timer_metadata}
                    />
                    <span className="text-xs text-muted-foreground">
                      {isPaused ? "Paused" : "Running"}
                    </span>
                  </div>
                  <CompactTimerControls
                    taskId={task.id}
                    taskName={task.name}
                    entryId={activeEntry.id}
                    timerMetadata={activeEntry.timer_metadata}
                    onTimerUpdate={() => {}}
                  />
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleStartTask(task.id)}
                  className="h-8 px-3"
                  type="button"
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  openAssignForTask(task);
                }}
                className="h-8 px-3"
                title="Add to Workload"
                type="button"
              >
                <CalendarPlus className={`h-4 w-4 ${(task.status === 'Assigned' || task.slot_start_datetime || task.slot_start_time || task.scheduled_time) ? 'text-yellow-500' : 'text-blue-600'}`} />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveToProjectTask({ id: task.id, name: task.name, project_id: task.project_id ?? null });
                }}
                className="h-8 px-3"
                title="Move to Project"
                type="button"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTask(task);
                }}
                className="h-8 px-3"
                type="button"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/alltasks?highlight=${task.id}`);
                }}
                className="h-8 px-3"
                type="button"
              >
                <Eye className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setConvertToSubtaskSourceTask({ id: task.id, name: task.name });
                }}
                className="h-8 px-3"
                title="Convert to Subtask"
                type="button"
              >
                <ArrowDownToLine className="h-4 w-4 text-blue-600" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteTaskMutation.mutate({
                    taskId: task.id,
                    taskName: task.name,
                    projectName: projectNameMap.get(task.project_id) || "Unknown Project"
                  });
                }}
                className="h-8 px-3 text-destructive hover:text-destructive"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            )}
          </div>

          {/* Time Controls Section */}
          {showTimeControls && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex flex-wrap gap-2">
                <TimeTrackerWithComment 
                  task={{ id: task.id, name: task.name }}
                  onSuccess={() => refetch()}
                  isSubtask={false}
                />
                <ManualTimeLog 
                  taskId={task.id}
                  onSuccess={() => refetch()}
                  isSubtask={false}
                />
              </div>
              
              {/* Time Entries Display */}
              {task.time_entries && task.time_entries.length > 0 && (
                <TimeEntriesDisplay 
                  entries={task.time_entries} 
                  title="Task Time Entries" 
                />
              )}
            </div>
          )}

          {/* Subtasks Section */}
          {showSubtasks && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Subtasks</h4>
                  {selectedSubtasks.filter(s => s.task_id === task.id).length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMoveDialogOpen(true);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Move ({selectedSubtasks.filter(s => s.task_id === task.id).length})
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSubtasks(false);
                  }}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Add Subtask Form */}
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <Input
                  placeholder="Add subtasks (comma-separated)..."
                  value={newSubtaskName}
                  onChange={(e) => setNewSubtaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask(e as unknown as React.FormEvent);
                    }
                  }}
                  className="flex-1 text-sm h-8"
                />
                <Button type="submit" size="sm" disabled={!newSubtaskName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </form>

              {/* Subtasks List */}
              {visibleSubtasks.length > 0 ? (
                <div className={projectScope === "all" ? "space-y-2" : "space-y-3"}>
                  {visibleSubtasks.map((subtask: any) => (
                    <Card key={subtask.id} className={projectScope === "all" ? "p-2 bg-muted/30" : "p-4 bg-muted/30"}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <>
                            <div className="flex items-start gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isSelected = selectedSubtasks.some(s => s.id === subtask.id);
                                  if (isSelected) {
                                    setSelectedSubtasks(prev => prev.filter(s => s.id !== subtask.id));
                                  } else {
                                    setSelectedSubtasks(prev => [...prev, { id: subtask.id, name: subtask.name, task_id: task.id }]);
                                  }
                                }}
                                className="mt-0.5 shrink-0"
                              >
                                {selectedSubtasks.some(s => s.id === subtask.id) ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                )}
                              </button>
                              <p className="text-sm font-medium break-words min-w-0 flex-1">{subtask.name}</p>
                            </div>
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-1 pl-6">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span 
                                  className={`px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-80 ${
                                    subtask.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                    subtask.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                    subtask.status === 'Assigned' ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}
                                  onClick={() => handleToggleSubtaskStatus(subtask, task.id)}
                                >
                                  {subtask.status}
                                </span>
                                {subtask.logged_hours > 0 && (
                                  <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
                                    {subtask.logged_hours}h
                                  </span>
                                )}
                                {subtask.deadline && (
                                  <span className="text-muted-foreground">Due: {new Date(subtask.deadline).toLocaleDateString()}</span>
                                )}
                              </div>
                              {/* Inline action icons - on separate row for mobile */}
                              <div className="flex items-center gap-0.5 flex-wrap">
                                <TimeTrackerWithComment 
                                  task={{ id: subtask.id, name: subtask.name }}
                                  onSuccess={() => refetch()}
                                  isSubtask={true}
                                  iconOnly={true}
                                />
                                <ManualTimeLog 
                                  taskId={subtask.id} 
                                  onSuccess={() => refetch()} 
                                  isSubtask={true}
                                  iconOnly={true}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const item = {
                                      id: subtask.id,
                                      originalId: task.id,
                                      type: 'subtask',
                                      itemType: 'subtask',
                                      title: subtask.name,
                                      date: new Date().toISOString().slice(0, 10),
                                    };
                                    setSelectedItemsForWorkload([item]);
                                    setIsAssignDialogOpen(true);
                                  }}
                                  className="h-6 w-6"
                                  title="Add to Workload"
                                >
                                  <CalendarPlus className="h-3 w-3 text-blue-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSubtaskEditDialog(subtask);
                                  }}
                                  className="h-6 w-6"
                                  title="Edit"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/alltasks?highlight=${subtask.id}&subtask=true`);
                                  }}
                                  className="h-6 w-6"
                                  title="View"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Convert this subtask to a task?")) {
                                      convertSubtaskToTaskMutation.mutate({ subtaskId: subtask.id, subtaskName: subtask.name, parentTaskId: task.id });
                                    }
                                  }}
                                  className="h-6 w-6"
                                  title="Convert to Task"
                                >
                                  <ArrowUpFromLine className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSubtask(subtask);
                                  }}
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </>
                        </div>
                      </div>
                      
                      {/* Subtask Time Entries */}
                      {subtask.time_entries && subtask.time_entries.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-dashed">
                          <TimeEntriesDisplay 
                            entries={subtask.time_entries} 
                            title={`${subtask.name} Time Entries`} 
                          />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No subtasks yet</p>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  };

  // Move task up/down mutations
  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, direction }: { taskId: string; direction: "up" | "down" }) => {
      const currentTask = filteredTasks.find((t) => t.id === taskId);
      if (!currentTask) return;

      const currentIndex = filteredTasks.findIndex((t) => t.id === taskId);
      if (
        (direction === "up" && currentIndex === 0) ||
        (direction === "down" && currentIndex === filteredTasks.length - 1)
      ) {
        return; // Can't move further
      }

      const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      const swapTask = filteredTasks[swapIndex];

      // Assign sort_order values
      const currentOrder = currentTask.sort_order ?? currentIndex;
      const swapOrder = swapTask.sort_order ?? swapIndex;

      // Update both tasks
      const { error: error1 } = await supabase
        .from("tasks")
        .update({ sort_order: swapOrder })
        .eq("id", taskId);

      const { error: error2 } = await supabase
        .from("tasks")
        .update({ sort_order: currentOrder })
        .eq("id", swapTask.id);

      if (error1 || error2) throw error1 || error2;
    },
    onMutate: () => {
      captureScrollPosition();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
    },
    onError: (error) => {
      toast.error("Failed to reorder task");
      console.error(error);
    },
  });

  const handleStartTask = async (taskId: string) => {
    captureScrollPosition();
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("email", (await supabase.auth.getUser()).data.user?.email)
      .single();

    if (!employee) return;

    await supabase.from("time_entries").insert({
      task_id: taskId,
      employee_id: employee.id,
      entry_type: "task",
      start_time: new Date().toISOString(),
    });

    refetch();
  };

  // Task expansion handlers
  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const toggleSubtasks = (taskId: string) => {
    setShowingSubtasksFor(showingSubtasksFor === taskId ? null : taskId);
  };

  // Subtask creation mutation
  const createSubtaskMutation = useMutation({
    mutationFn: async ({ taskId, names }: { taskId: string; names: string[] }) => {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();

      if (!employee) throw new Error("Employee not found");

      const rows = names.map(name => ({
        name,
        task_id: taskId,
        status: "Not Started",
        assigner_id: employee.id,
      }));

      const { data, error } = await supabase
        .from("subtasks")
        .insert(rows)
        .select();

      if (error) throw error;
      return data;
    },
    onMutate: () => {
      captureScrollPosition();
    },
    onSuccess: (data, variables) => {
      toast.success("Subtask created successfully");
      queryClient.invalidateQueries({ queryKey: ["quick-tasks", project?.id] });

      try {
        (data || []).forEach((subtask: any) => {
          logActivity({
            action_type: "created",
            entity_type: "subtask",
            entity_id: subtask.id,
            entity_name: subtask.name,
            description: `Created subtask: ${subtask.name}`,
            comment: variables?.taskId ? `Task ID: ${variables.taskId}` : undefined
          });
        });
        queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      } catch (error) {
        console.error("Failed to log subtask creation activity:", error);
      }
    },
    onError: (error) => {
      toast.error("Failed to create subtask");
      console.error(error);
    },
  });

  // Subtask update mutation
  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, name, status, parentTaskId }: { subtaskId: string; name?: string; status?: string; parentTaskId?: string; subtaskName?: string }) => {
      const updates: any = {};
      if (name) updates.name = name;
      if (status) updates.status = status;

      const { error } = await supabase
        .from("subtasks")
        .update(updates)
        .eq("id", subtaskId);

      if (error) throw error;
    },
    onMutate: () => {
      captureScrollPosition();
    },
    onSuccess: (_data, variables) => {
      toast.success("Subtask updated successfully");
      queryClient.invalidateQueries({ queryKey: ["quick-tasks", project?.id] });

      if (variables?.subtaskId && variables?.subtaskName) {
        logActivity({
          action_type: "updated",
          entity_type: "subtask",
          entity_id: variables.subtaskId,
          entity_name: variables.subtaskName,
          description: `Updated subtask: ${variables.subtaskName}`,
          comment: variables?.status ? `Status: ${variables.status}` : undefined
        });
        queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      }
    },
    onError: (error) => {
      toast.error("Failed to update subtask");
      console.error(error);
    },
  });

  const updateSubtaskDetailsMutation = useMutation({
    mutationFn: async ({ subtaskId, updates }: { subtaskId: string; updates: any }) => {
      const { error } = await supabase.from("subtasks").update(updates).eq("id", subtaskId);
      if (error) throw error;
    },
    onMutate: () => {
      captureScrollPosition();
    },
    onSuccess: () => {
      toast.success("Subtask updated successfully");
      // Invalidate all relevant dashboard queries for instant refresh
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-workload"] });
      setIsSubtaskDialogOpen(false);
      setEditingSubtaskForDialog(null);
    },
    onError: (error) => {
      toast.error("Failed to update subtask");
      console.error(error);
    },
  });

  // Subtask delete mutation
  const deleteSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId }: { subtaskId: string; subtaskName?: string }) => {
      const { error } = await supabase
        .from("subtasks")
        .delete()
        .eq("id", subtaskId);

      if (error) throw error;
    },
    onMutate: () => {
      captureScrollPosition();
    },
    onSuccess: (_data, variables) => {
      toast.success("Subtask deleted successfully");
      // Invalidate all relevant dashboard queries for instant refresh
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-workload"] });
      queryClient.invalidateQueries({ queryKey: ["runningTasks"] });

      if (variables?.subtaskId && variables?.subtaskName) {
        logActivity({
          action_type: "deleted",
          entity_type: "subtask",
          entity_id: variables.subtaskId,
          entity_name: variables.subtaskName,
          description: `Deleted subtask: ${variables.subtaskName}`
        });
        queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      }
    },
    onError: (error) => {
      toast.error("Failed to delete subtask");
      console.error(error);
    },
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const names = newTaskName
      .split(/\r?\n/)
      .flatMap(part => part.split(","))
      .map(name => name.trim())
      .filter(Boolean);
    if (names.length > 0) {
      createTaskMutation.mutate(names);
    }
  };

  // Helper function to format date as DD/MM/YYYY
  const formatDateDDMMYYYY = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper function to format time entries
  const formatTimeEntry = (entry: any) => {
    const startTime = new Date(entry.start_time);
    const endTime = new Date(entry.end_time);
    const duration = entry.duration_minutes || 0;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    const timeRange = `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    return {
      duration: durationStr,
      timeRange,
      date: startTime.toLocaleDateString(),
      comment: entry.comment || 'No comment'
    };
  };

  // Time Entries Display Component
  const TimeEntriesDisplay: React.FC<{ entries: any[]; title: string }> = ({ entries, title }) => {
    if (!entries || entries.length === 0) return null;

    return (
      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
        <h5 className="text-sm font-medium text-muted-foreground">{title}</h5>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {entries.slice(0, 5).map((entry) => {
            const formatted = formatTimeEntry(entry);
            return (
              <div key={entry.id} className="bg-background rounded p-2 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {formatted.duration} • {formatted.timeRange}
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {formatted.comment}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatted.date}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {entries.length > 5 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              +{entries.length - 5} more entries
            </div>
          )}
        </div>
      </div>
    );
  };

  // Countdown Timer Component
  const CountdownTimer: React.FC<{ targetTime: Date; taskName: string }> = ({ targetTime, taskName }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isStarted, setIsStarted] = useState(false);
    const [isVerySoon, setIsVerySoon] = useState(false);
    const [isOverdue, setIsOverdue] = useState(false);

    const updateCountdown = useCallback(() => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        // Check if it's overdue (more than 5 minutes past)
        if (diff < -5 * 60 * 1000) {
          setIsOverdue(true);
          setIsStarted(false);
          setIsVerySoon(false);
          
          const overdueDiff = Math.abs(diff);
          const hours = Math.floor(overdueDiff / (1000 * 60 * 60));
          const minutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours > 0) {
            setTimeLeft(`${hours}h ${minutes}m`);
          } else {
            setTimeLeft(`${minutes}m`);
          }
        } else {
          // Within 5 minutes of start time
          setTimeLeft('Started');
          setIsStarted(true);
          setIsOverdue(false);
          setIsVerySoon(false);
        }
        return;
      }
      
      setIsStarted(false);
      setIsOverdue(false);
      
      // Check if very soon (less than 5 minutes)
      setIsVerySoon(diff < 5 * 60 * 1000);
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    }, [targetTime]);

    useEffect(() => {
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }, [updateCountdown]);

    if (isOverdue) {
      return (
        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
          Overdue by {timeLeft}
        </span>
      );
    }

    if (isStarted) {
      return (
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
          Started
        </span>
      );
    }

    if (isVerySoon) {
      return (
        <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200 animate-pulse">
          <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-1"></span>
          Starts in {timeLeft}
        </span>
      );
    }

    return (
      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
        Starts in {timeLeft}
      </span>
    );
  };

  // Timeline view component - shows tasks grouped by time (slots or deadlines)
  const TimelineView = () => {
    // Check if any tasks have slot_start_datetime (priority) or slot_start_time
    const tasksWithSlots = filteredTasks.filter(task => task.slot_start_datetime || task.slot_start_time);
    const hasSlotTasks = tasksWithSlots.length > 0;
    
    // Use slot times if available, otherwise group by deadline time
    const tasksToDisplay = hasSlotTasks ? tasksWithSlots : filteredTasks;
    
    // Helper function to format time for display (HH:MM AM/PM)
    const formatTimeDisplay = (date: Date): string => {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    };
    
    // Helper function to convert time string to minutes since midnight
    const timeToMinutes = (timeStr: string): number => {
      // Handle various time formats (12-hour, 24-hour, locale-specific)
      const cleanTime = timeStr.replace(/[AP]M/i, '').trim();
      const [hours, minutes] = cleanTime.split(':').map(Number);
      
      // Check if it's 12-hour format with AM/PM
      const isPM = /PM/i.test(timeStr);
      const isAM = /AM/i.test(timeStr);
      
      let totalMinutes = hours * 60 + (minutes || 0);
      
      // Convert 12-hour to 24-hour format
      if (isPM && hours !== 12) {
        totalMinutes += 12 * 60;
      } else if (isAM && hours === 12) {
        totalMinutes = 0 + (minutes || 0); // Midnight
      }
      
      return totalMinutes;
    };
    
    // Group tasks by date and time (slot start datetime/time or deadline time)
    const tasksByDateTime = tasksToDisplay.reduce((acc, task) => {
      let dateTimeKey: string;
      let timeValue: Date;
      let sortableTime: number; // Minutes since midnight for proper sorting
      
      if (task.slot_start_datetime) {
        // Priority: Use slot_start_datetime if available (from TaskEditDialog)
        timeValue = new Date(task.slot_start_datetime);
        const date = formatDateDDMMYYYY(timeValue);
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time}`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else if (task.slot_start_time) {
        // Fallback: Use slot_start_time if available
        timeValue = new Date(task.slot_start_time);
        const date = formatDateDDMMYYYY(timeValue);
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time}`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else if (task.deadline) {
        // Fallback: Use deadline time
        timeValue = new Date(task.deadline);
        const date = formatDateDDMMYYYY(timeValue);
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time}`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else {
        // For tasks without any time, group as "No Time Set"
        dateTimeKey = "No Time Set";
        sortableTime = 24 * 60; // Put at the end (midnight next day)
      }
      
      if (!acc[dateTimeKey]) {
        acc[dateTimeKey] = { tasks: [], sortableTime };
      }
      acc[dateTimeKey].tasks.push(task);
      return acc;
    }, {} as Record<string, { tasks: any[], sortableTime: number }>);

    // Sort date-time slots chronologically, with "No Time Set" at the end
    const sortedDateTimeSlots = Object.keys(tasksByDateTime).sort((a, b) => {
      if (a === "No Time Set") return 1;
      if (b === "No Time Set") return -1;
      
      // Extract date and time from the key "DD/MM/YYYY HH:MM AM/PM"
      const [dateA, timeA] = a.split(' ');
      const [dateB, timeB] = b.split(' ');
      
      // Parse DD/MM/YYYY format
      const [dayA, monthA, yearA] = dateA.split('/').map(Number);
      const [dayB, monthB, yearB] = dateB.split('/').map(Number);
      
      // Create comparable date objects
      const dateObjA = new Date(yearA, monthA - 1, dayA);
      const dateObjB = new Date(yearB, monthB - 1, dayB);
      
      // Compare dates first
      const dateCompare = dateObjA.getTime() - dateObjB.getTime();
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, compare times using the sortableTime (minutes since midnight)
      return tasksByDateTime[a].sortableTime - tasksByDateTime[b].sortableTime;
    });

    // Debug: Log the sorted time slots to verify correct ordering
    console.log('Timeline time slots sorted:', sortedDateTimeSlots);

    return (
      <div className="relative">
        {/* Timeline mode indicator */}
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{hasSlotTasks ? "Time Slots" : "Deadline Times"}</span>
          {hasSlotTasks && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {tasksWithSlots.some(t => t.slot_start_datetime) ? "Using slot datetime" : 
               tasksWithSlots.some(t => t.slot_start_time) ? "Using slot times" : "Using deadline times"}
            </span>
          )}
        </div>
        
        {/* Vertical timeline thread with knots */}
        <div className="absolute left-8 top-12 bottom-0 w-0.5 bg-blue-200"></div>
        {sortedDateTimeSlots.map((dateTimeSlot, index) => (
          <div
            key={`knot-${dateTimeSlot}`}
            className="absolute left-7 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"
            style={{
              top: `${12 + index * (sortedDateTimeSlots.length > 1 ? 96 / (sortedDateTimeSlots.length - 1) : 0)}px`
            }}
          ></div>
        ))}

        <div className="space-y-6">
          {sortedDateTimeSlots.map((dateTimeSlot, index) => (
            <div key={dateTimeSlot} className="relative">
              {/* Mobile: Stack time node above content, Desktop: Side by side */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                {/* Time node on the vertical thread */}
                <div className={`relative z-10 flex items-center justify-center w-full sm:w-16 h-8 bg-background border border-border rounded-md text-sm font-medium mb-3 sm:mb-0 ${
                  dateTimeSlot === "No Time Set" ? "text-muted-foreground" : ""
                }`}>
                  {dateTimeSlot}
                </div>

                {/* Tasks at this time slot */}
                <div className="flex-1 space-y-2 pl-0 sm:pl-4">
                {tasksByDateTime[dateTimeSlot].tasks.map((task) => {
                  const activeEntry = timeEntries?.find((entry) => entry.task_id === task.id);
                  const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");
                  
                  return (
                    <Card key={task.id} className="p-3 max-w-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setShowingActionsFor(showingActionsFor === task.id ? null : task.id)}
                        >
                          <h3 className="font-medium text-sm break-words">{renderTaskName(task.name)}</h3>
                          <p className="text-xs text-muted-foreground">
                            Due: {task.deadline ? formatDateDDMMYYYY(new Date(task.deadline)) : "No deadline"}
                          </p>
                          {(task.slot_start_datetime || task.slot_start_time) && (
                            <p className="text-xs text-muted-foreground">
                              Slot: {formatDateDDMMYYYY(new Date(task.slot_start_datetime || task.slot_start_time))} {new Date(task.slot_start_datetime || task.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          {(task.slot_start_datetime || task.slot_start_time) && !activeEntry && (
                            <div className="mt-1">
                              <CountdownTimer 
                                targetTime={new Date(task.slot_start_datetime || task.slot_start_time)} 
                                taskName={task.name}
                              />
                            </div>
                          )}
                        </div>
                        
                        {(showingActionsFor === task.id || activeEntry) && (
                        <div className="flex items-center gap-1 justify-end">
                          {activeEntry ? (
                            <>
                              <div className="flex flex-col items-end gap-1">
                                <LiveTimer
                                  startTime={activeEntry.start_time}
                                  isPaused={isPaused}
                                  timerMetadata={activeEntry.timer_metadata}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {isPaused ? "Paused" : "Running"}
                                </span>
                              </div>
                              <CompactTimerControls
                                taskId={task.id}
                                taskName={task.name}
                                entryId={activeEntry.id}
                                timerMetadata={activeEntry.timer_metadata}
                                onTimerUpdate={() => {}}
                              />
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleStartTask(task.id)}
                              className="h-7 px-2"
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoveToProjectTask({ id: task.id, name: task.name, project_id: task.project_id ?? null });
                            }}
                            className="h-7 px-2"
                            title="Move to Project"
                          >
                            <FolderOpen className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTask(task);
                            }}
                            className="h-7 px-2"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/alltasks?highlight=${task.id}`);
                            }}
                            className="h-7 px-2"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConvertToSubtaskSourceTask({ id: task.id, name: task.name });
                            }}
                            className="h-7 px-2"
                            title="Convert to Subtask"
                          >
                            <ArrowDownToLine className="h-3 w-3 text-blue-600" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this task?')) {
                                deleteTaskMutation.mutate({
                                  taskId: task.id,
                                  taskName: task.name,
                                  projectName: projectNameMap.get(task.project_id) || "Unknown Project"
                                });
                              }
                            }}
                            className="h-7 px-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
              </div>
            </div>
          ))}

          {sortedDateTimeSlots.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tasks for this period</p>
            </div>
          )}
        </div>
      </div>
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

  if (projectScope === "misc" && !project) return null;
  if (!tasks || tasks.length === 0) return null;

  return (
    <>
      <Card className="w-full">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="px-6 py-4">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <h2 className="text-lg font-semibold">{title}</h2>
                  <div className="flex items-center gap-1.5 ml-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      id="show-completed-quick" 
                      checked={showCompleted} 
                      onCheckedChange={(checked) => setShowCompleted(checked === true)}
                      className="h-3.5 w-3.5"
                    />
                    <Label htmlFor="show-completed-quick" className="text-xs text-muted-foreground cursor-pointer">
                      Show completed
                    </Label>
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "timeline" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("timeline")}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
        <CollapsibleContent>
          <CardContent className="px-0 sm:px-6 py-6">
            <div className="space-y-4">
              {/* Search filter */}
              <div className="flex gap-2">
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                {searchTerm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Time & Assignment filters */}
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                <Button
                  variant={timeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("all")}
                >
                  <span className="hidden sm:inline">All</span>
                  <span className="sm:hidden">All</span>
                  <Badge variant="secondary" className="ml-1 sm:ml-2">{filterCounts.all}</Badge>
                </Button>
                <Button
                  variant={timeFilter === "yesterday" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("yesterday")}
                >
                  <span className="hidden sm:inline">Yesterday</span>
                  <span className="sm:hidden">Yest</span>
                  <Badge variant="secondary" className="ml-1 sm:ml-2">{filterCounts.yesterday}</Badge>
                </Button>
                <Button
                  variant={timeFilter === "today" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("today")}
                >
                  <span className="hidden sm:inline">Today</span>
                  <span className="sm:hidden">Tod</span>
                  <Badge variant="secondary" className="ml-1 sm:ml-2">{filterCounts.today}</Badge>
                </Button>
                <Button
                  variant={timeFilter === "tomorrow" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("tomorrow")}
                >
                  <span className="hidden sm:inline">Tomorrow</span>
                  <span className="sm:hidden">Tom</span>
                  <Badge variant="secondary" className="ml-1 sm:ml-2">{filterCounts.tomorrow}</Badge>
                </Button>
                <Button
                  variant={timeFilter === "laterThisWeek" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("laterThisWeek")}
                >
                  <span className="hidden sm:inline">Later This Week</span>
                  <span className="sm:hidden">LTW</span>
                  <Badge variant="secondary" className="ml-1 sm:ml-2">{filterCounts.laterThisWeek}</Badge>
                </Button>
                <Button
                  variant={timeFilter === "nextWeek" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("nextWeek")}
                >
                  <span className="hidden sm:inline">Next Week</span>
                  <span className="sm:hidden">NW</span>
                  <Badge variant="secondary" className="ml-1 sm:ml-2">{filterCounts.nextWeek}</Badge>
                </Button>
                <Button
                  variant={assignmentFilter === "assigned" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAssignmentFilter("assigned")}
                  className={assignmentFilter === "assigned" ? "bg-teal-600 hover:bg-teal-700 text-white" : "border-teal-500 text-teal-600 hover:bg-teal-50"}
                >
                  <span className="hidden sm:inline">Assigned</span>
                  <span className="sm:hidden">Asgn</span>
                  <Badge variant="secondary" className="ml-1 sm:ml-2">{filterCounts.assigned}</Badge>
                </Button>
                <Button
                  variant={assignmentFilter === "unassigned" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAssignmentFilter("unassigned")}
                  className={assignmentFilter === "unassigned" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border-cyan-500 text-cyan-600 hover:bg-cyan-50"}
                >
                  <span className="hidden sm:inline">Unassigned</span>
                  <span className="sm:hidden">Unasgn</span>
                  <Badge variant="secondary" className="ml-1 sm:ml-2">{filterCounts.unassigned}</Badge>
                </Button>
              </div>

              {showProjectFilters && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Select Filters:</span>
                  </div>

                  <Tabs value={activeFilterTab} onValueChange={(value) => setActiveFilterTab(value as any)}>
                    <TabsList className="w-full justify-start">
                      <TabsTrigger value="services">Services</TabsTrigger>
                      {selectedServices.length > 0 && <TabsTrigger value="clients">Clients</TabsTrigger>}
                      {selectedClients.length > 0 && <TabsTrigger value="projects">Projects</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="services" className="mt-3">
                      {services.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {services.map((service) => (
                            <Button
                              key={service.id}
                              variant={selectedServices.includes(service.name) ? "default" : "outline"}
                              size="sm"
                              type="button"
                              onClick={() => {
                                setSelectedServices(prev => {
                                  const newServices = prev.includes(service.name)
                                    ? prev.filter(name => name !== service.name)
                                    : [...prev, service.name];
                                  setSelectedClients([]);
                                  setSelectedProject("");
                                  setActiveFilterTab(newServices.length > 0 ? "clients" : "services");
                                  return newServices;
                                });
                              }}
                              className="flex items-center gap-2 text-xs"
                            >
                              {selectedServices.includes(service.name) && <Check className="h-3 w-3" />}
                              {service.name}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No services found</div>
                      )}
                    </TabsContent>

                    <TabsContent value="clients" className="mt-3">
                      {selectedServices.length === 0 ? (
                        <div className="text-xs text-muted-foreground">Select a service to see clients.</div>
                      ) : availableClients.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {availableClients.map((client) => (
                            <Button
                              key={client.id}
                              variant={selectedClients.includes(client.id) ? "default" : "outline"}
                              size="sm"
                              type="button"
                              onClick={() => {
                                setSelectedClients(prev => {
                                  const newClients = prev.includes(client.id)
                                    ? prev.filter(id => id !== client.id)
                                    : [...prev, client.id];
                                  setSelectedProject("");
                                  setActiveFilterTab(newClients.length > 0 ? "projects" : "clients");
                                  return newClients;
                                });
                              }}
                              className="flex items-center gap-2 text-xs"
                            >
                              {selectedClients.includes(client.id) && <Check className="h-3 w-3" />}
                              {client.name}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No clients found for selected services</div>
                      )}
                    </TabsContent>

                    <TabsContent value="projects" className="mt-3">
                      {selectedClients.length === 0 ? (
                        <div className="text-xs text-muted-foreground">Select a client to see projects.</div>
                      ) : availableProjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {availableProjects.map((project) => (
                            <Button
                              key={project.id}
                              variant={selectedProject === project.id ? "default" : "outline"}
                              size="sm"
                              type="button"
                              onClick={() => setSelectedProject(project.id)}
                              className="flex items-center gap-2 text-xs"
                            >
                              {selectedProject === project.id && <Check className="h-3 w-3" />}
                              {project.name}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No projects found for selected clients</div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {(selectedServices.length > 0 || selectedClients.length > 0 || selectedProject) && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded flex flex-wrap items-center gap-2">
                      {selectedServices.length > 0 && <span>Services: {selectedServices.join(", ")}</span>}
                      {selectedClients.length > 0 && (
                        <span className="ml-2">
                          | Clients: {selectedClients.map(id => clients.find(c => c.id === id)?.name).filter(Boolean).join(", ")}
                        </span>
                      )}
                      {selectedProject && (
                        <span className="ml-2">
                          | Project: {projects.find(p => p.id === selectedProject)?.name}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setSelectedServices([]);
                          setSelectedClients([]);
                          setSelectedProject("");
                          setActiveFilterTab("services");
                        }}
                        className="h-auto px-2 py-1 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick add task input */}
              <form onSubmit={handleCreateTask} className="flex gap-2">
                <Input
                  placeholder="Add tasks (comma-separated)..."
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTask(e as unknown as React.FormEvent);
                    }
                  }}
                  className="flex-1"
                />
                <Button type="submit" disabled={!newTaskName.trim() || createTaskMutation.isPending}>
                  Add
                </Button>
              </form>

              {filteredTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks for this time period</p>
              ) : viewMode === "timeline" ? (
                <TimelineView />
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredTasks.map(task => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {filteredTasks.map((task) => {
                        const activeEntry = timeEntries?.find((entry) => entry.task_id === task.id);
                        const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");

                        return (
                          <SortableTask
                            key={task.id}
                            task={task}
                            activeEntry={activeEntry}
                            isPaused={isPaused}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
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
          queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
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
        queryClient.invalidateQueries({ queryKey: ['workload-assignments'] });
      }}
    />
    
    <MoveSubtasksDialog
      open={isMoveDialogOpen}
      onOpenChange={setIsMoveDialogOpen}
      selectedSubtasks={selectedSubtasks}
      onSuccess={() => {
        setSelectedSubtasks([]);
        refetch();
      }}
    />

    <SubtaskDialog
      isOpen={isSubtaskDialogOpen}
      onClose={() => {
        setIsSubtaskDialogOpen(false);
        setEditingSubtaskForDialog(null);
      }}
      onSave={(data) => {
        if (!editingSubtaskForDialog) return;
        // Convert YYYY-MM-DD from the dialog into an ISO datetime (end-of-day),
        // which matches how tasks/subtasks deadlines are used elsewhere.
        let deadlineToSave = data.deadline ?? null;
        if (deadlineToSave && /^\d{4}-\d{2}-\d{2}$/.test(deadlineToSave)) {
          deadlineToSave = endOfDay(new Date(deadlineToSave)).toISOString();
        }
        updateSubtaskDetailsMutation.mutate({
          subtaskId: editingSubtaskForDialog.id,
          updates: {
            name: data.name,
            status: data.status,
            assignee_id: data.assignee_id || null,
            deadline: deadlineToSave,
            estimated_duration: data.estimated_duration ?? null,
          },
        });
      }}
      taskId={editingSubtaskForDialog?.task_id || ""}
      editingSubtask={editingSubtaskForDialog}
      employees={employeesForSubtaskDialog}
      isLoading={updateSubtaskDetailsMutation.isPending}
    />

    <MoveToProjectDialog
      open={!!moveToProjectTask}
      onOpenChange={(open) => {
        if (!open) setMoveToProjectTask(null);
      }}
      taskId={moveToProjectTask?.id || ""}
      taskName={moveToProjectTask?.name}
      currentProjectId={moveToProjectTask?.project_id || null}
    />

    <ConvertToSubtaskDialog
      open={!!convertToSubtaskSourceTask}
      onOpenChange={(open) => {
        if (!open) setConvertToSubtaskSourceTask(null);
      }}
      sourceTask={convertToSubtaskSourceTask}
      onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
        queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
        queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
      }}
    />
    
  </>
  );
};
