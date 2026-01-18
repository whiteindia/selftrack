import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pin, Search, ChevronDown, ChevronRight, Play, Eye, Pencil, Trash2, Clock, List, CalendarPlus, FolderOpen, X, Check, Filter, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import LiveTimer from "./LiveTimer";
import CompactTimerControls from "./CompactTimerControls";
import TaskEditDialog from "@/components/TaskEditDialog";
import SubtaskDialog from "@/components/SubtaskDialog";
import AssignToSlotDialog from "@/components/AssignToSlotDialog";
import { MoveToProjectDialog } from "@/components/MoveToProjectDialog";
import { MoveSubtasksDialog } from "./MoveSubtasksDialog";
import type { Database } from "@/integrations/supabase/types";
import { useUserPins } from "@/hooks/useUserPins";
import { assignToCurrentSlot } from "@/utils/assignToCurrentSlot";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, format } from "date-fns";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TimeFilter = "all" | "yesterday" | "today" | "tomorrow" | "laterThisWeek" | "nextWeek";

export const PinnedUntilGoalsSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [projectSearch, setProjectSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [showProjectResults, setShowProjectResults] = useState(false);
  const [showTaskResults, setShowTaskResults] = useState(false);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | null>(null);
  const [showingActionsFor, setShowingActionsFor] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [moveToProjectTask, setMoveToProjectTask] = useState<{ id: string; name: string; project_id: string | null } | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedItemsForWorkload, setSelectedItemsForWorkload] = useState<any[]>([]);
  const [showSubtasksFor, setShowSubtasksFor] = useState<Set<string>>(new Set());
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [editingSubtaskForDialog, setEditingSubtaskForDialog] = useState<any>(null);
  const [quickAddTaskName, setQuickAddTaskName] = useState("");
  const [quickAddSubtaskNames, setQuickAddSubtaskNames] = useState<Record<string, string>>({});
  const [selectedSubtasks, setSelectedSubtasks] = useState<{ id: string; name: string; task_id: string }[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [showAllProjectTasks, setShowAllProjectTasks] = useState(false);
  
  // New state for QuickTasks-like features
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [newTaskName, setNewTaskName] = useState("");

  // Use database-backed pins instead of localStorage
  const { pinnedIds: pinnedProjectIds, togglePin: togglePinProject, isToggling: isTogglingProject } = useUserPins('project');
  const { pinnedIds: pinnedTaskIds, togglePin: togglePinTask, removePin: unpinTask, isToggling: isTogglingTask } = useUserPins('task');

  // Fetch the miscellaneous project as default
  const { data: miscProject } = useQuery({
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

  // Set default project filter to misc project on mount
  useEffect(() => {
    if (miscProject?.id && selectedProjectFilter === null) {
      setSelectedProjectFilter(miscProject.id);
      setShowAllProjectTasks(true);
    }
  }, [miscProject?.id, selectedProjectFilter]);

  // Fetch all projects for search
  const { data: projects = [] } = useQuery({
    queryKey: ["pinned-goals-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, service, client_id, clients(name)")
        .order("name");
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch tasks for search (from all projects)
  const { data: allTasks = [] } = useQuery({
    queryKey: ["pinned-goals-all-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, project_id, status, deadline")
        .neq("status", "Completed")
        .order("name");
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch pinned tasks with full details - optimized batch fetching
  const { data: pinnedTasks = [] } = useQuery({
    queryKey: ["pinned-goals-tasks", pinnedTaskIds, showCompleted],
    queryFn: async () => {
      if (pinnedTaskIds.length === 0) return [];
      
      // Fetch all tasks in a single query with project info
      const { data: tasksData, error } = await supabase
        .from("tasks")
        .select(`
          id,
          name,
          deadline,
          status,
          project_id,
          reminder_datetime,
          slot_start_time,
          slot_start_datetime,
          scheduled_time,
          project:projects!tasks_project_id_fkey(id, name, service, client_id, clients(name))
        `)
        .in("id", pinnedTaskIds);

      if (error) throw error;
      if (!tasksData || tasksData.length === 0) return [];

      const taskIds = tasksData.map(t => t.id);

      // Batch fetch all subtasks for all tasks at once
      let subtasksQuery = supabase
        .from('subtasks')
        .select('id, name, status, deadline, estimated_duration, assignee_id, task_id')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });
      
      if (!showCompleted) {
        subtasksQuery = subtasksQuery.neq('status', 'Completed');
      }
      
      const { data: allSubtasks } = await subtasksQuery;

      // Batch fetch all time entries for all tasks at once
      const { data: allTimeEntries } = await supabase
        .from('time_entries')
        .select('duration_minutes, task_id')
        .in('task_id', taskIds)
        .not('end_time', 'is', null);

      // Group subtasks and time entries by task_id
      const subtasksByTask: Record<string, typeof allSubtasks> = {};
      const timeEntriesByTask: Record<string, number> = {};

      (allSubtasks || []).forEach(subtask => {
        if (!subtasksByTask[subtask.task_id]) subtasksByTask[subtask.task_id] = [];
        subtasksByTask[subtask.task_id]!.push(subtask);
      });

      (allTimeEntries || []).forEach(entry => {
        if (!timeEntriesByTask[entry.task_id]) timeEntriesByTask[entry.task_id] = 0;
        timeEntriesByTask[entry.task_id] += entry.duration_minutes || 0;
      });

      // Combine data
      return tasksData.map(task => {
        const subtasks = subtasksByTask[task.id] || [];
        const totalLoggedMinutes = timeEntriesByTask[task.id] || 0;
        return {
          ...task,
          subtasks,
          total_logged_hours: Math.round((totalLoggedMinutes / 60) * 100) / 100,
          subtask_count: subtasks.length
        };
      });
    },
    enabled: pinnedTaskIds.length > 0
  });

  // Fetch active time entries
  const { data: timeEntries = [] } = useQuery({
    queryKey: ["pinned-goals-time-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .is("end_time", null);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000
  });

  // Fetch employees for subtask dialog
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-pinned"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, email")
        .order("name");
      if (error) throw error;
      return data || [];
    }
  });

  // Filter search results
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return [];
    const search = projectSearch.toLowerCase();
    return projects
      .filter(p => p.name.toLowerCase().includes(search))
      .slice(0, 10);
  }, [projects, projectSearch]);

  const filteredSearchTasks = useMemo(() => {
    if (!taskSearch.trim()) return [];
    const search = taskSearch.toLowerCase();
    let tasks = allTasks.filter(t => t.name.toLowerCase().includes(search));
    
    // If a project is selected in the filter, only show tasks from that project
    if (selectedProjectFilter) {
      tasks = tasks.filter(t => t.project_id === selectedProjectFilter);
    }
    
    return tasks.slice(0, 10);
  }, [allTasks, taskSearch, selectedProjectFilter]);

  // Get unique pinned projects from pinned tasks
  const pinnedProjectsFromTasks = useMemo(() => {
    const projectIds = new Set(pinnedTasks.map(t => t.project_id));
    // Also include misc project
    if (miscProject?.id) projectIds.add(miscProject.id);
    return projects.filter(p => projectIds.has(p.id) || pinnedProjectIds.includes(p.id));
  }, [pinnedTasks, projects, pinnedProjectIds, miscProject?.id]);

  // Fetch all tasks for the selected project (when showAllProjectTasks is true)
  const { data: allProjectTasks = [] } = useQuery({
    queryKey: ["pinned-goals-project-tasks", selectedProjectFilter, showCompleted],
    queryFn: async () => {
      if (!selectedProjectFilter) return [];
      
      // Fetch tasks with project info in single query
      let query = supabase
        .from("tasks")
        .select(`
          id,
          name,
          deadline,
          status,
          project_id,
          reminder_datetime,
          slot_start_time,
          slot_start_datetime,
          slot_end_datetime,
          scheduled_time,
          created_at,
          project:projects!tasks_project_id_fkey(id, name, service, client_id, clients(name))
        `)
        .eq("project_id", selectedProjectFilter)
        .order("created_at", { ascending: false });

      if (!showCompleted) {
        query = query.neq("status", "Completed");
      }

      const { data: tasksData, error } = await query;
      if (error) throw error;
      if (!tasksData || tasksData.length === 0) return [];

      const taskIds = tasksData.map(t => t.id);

      // Batch fetch subtasks and time entries
      let subtasksQuery = supabase
        .from('subtasks')
        .select('id, name, status, deadline, estimated_duration, assignee_id, task_id')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });
      
      if (!showCompleted) {
        subtasksQuery = subtasksQuery.neq('status', 'Completed');
      }
      
      const [{ data: allSubtasks }, { data: allTimeEntries }] = await Promise.all([
        subtasksQuery,
        supabase.from('time_entries').select('duration_minutes, task_id').in('task_id', taskIds).not('end_time', 'is', null)
      ]);

      const subtasksByTask: Record<string, typeof allSubtasks> = {};
      const timeEntriesByTask: Record<string, number> = {};

      (allSubtasks || []).forEach(subtask => {
        if (!subtasksByTask[subtask.task_id]) subtasksByTask[subtask.task_id] = [];
        subtasksByTask[subtask.task_id]!.push(subtask);
      });

      (allTimeEntries || []).forEach(entry => {
        if (!timeEntriesByTask[entry.task_id]) timeEntriesByTask[entry.task_id] = 0;
        timeEntriesByTask[entry.task_id] += entry.duration_minutes || 0;
      });

      return tasksData.map(task => {
        const subtasks = subtasksByTask[task.id] || [];
        const totalLoggedMinutes = timeEntriesByTask[task.id] || 0;
        return {
          ...task,
          subtasks,
          total_logged_hours: Math.round((totalLoggedMinutes / 60) * 100) / 100,
          subtask_count: subtasks.length
        };
      });
    },
    enabled: !!selectedProjectFilter && showAllProjectTasks
  });

  // Filter displayed tasks by selected project and time filter
  const displayedTasks = useMemo(() => {
    let tasksToFilter: any[];
    
    // If showing all tasks for a selected project
    if (showAllProjectTasks && selectedProjectFilter && allProjectTasks.length > 0) {
      tasksToFilter = allProjectTasks;
    } else if (!selectedProjectFilter) {
      tasksToFilter = pinnedTasks;
    } else {
      tasksToFilter = pinnedTasks.filter(t => t.project_id === selectedProjectFilter);
    }

    // Apply time filter
    if (timeFilter !== "all") {
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

      tasksToFilter = tasksToFilter.filter((task) => {
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

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      tasksToFilter = tasksToFilter.filter(task =>
        task.name.toLowerCase().includes(searchLower) ||
        (task.subtasks || []).some((subtask: any) => subtask.name.toLowerCase().includes(searchLower))
      );
    }

    return tasksToFilter;
  }, [pinnedTasks, selectedProjectFilter, showAllProjectTasks, allProjectTasks, timeFilter, searchTerm]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    let baseTasks: any[];
    if (showAllProjectTasks && selectedProjectFilter && allProjectTasks.length > 0) {
      baseTasks = allProjectTasks;
    } else if (!selectedProjectFilter) {
      baseTasks = pinnedTasks;
    } else {
      baseTasks = pinnedTasks.filter(t => t.project_id === selectedProjectFilter);
    }

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

    const withDeadline = baseTasks.filter(t => !!t.deadline);
    const inRange = (d: Date, start: Date, end: Date) => d >= start && d <= end;
    const all = baseTasks.length;
    const yesterday = withDeadline.filter(t => inRange(new Date(t.deadline), yesterdayStart, yesterdayEnd)).length;
    const today = withDeadline.filter(t => inRange(new Date(t.deadline), todayStart, todayEnd)).length;
    const tomorrow = withDeadline.filter(t => inRange(new Date(t.deadline), tomorrowStart, tomorrowEnd)).length;
    const laterThisWeek = withDeadline.filter(t => {
      const d = new Date(t.deadline);
      return d > tomorrowEnd && d <= thisWeekEnd;
    }).length;
    const nextWeek = withDeadline.filter(t => inRange(new Date(t.deadline), nextWeekStart, nextWeekEnd)).length;

    return { all, yesterday, today, tomorrow, laterThisWeek, nextWeek };
  }, [pinnedTasks, selectedProjectFilter, showAllProjectTasks, allProjectTasks]);

  // Task mutations
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task status updated");
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
    }
  });

  const handleToggleTaskStatus = (task: any) => {
    const statusMap: Record<string, TaskStatus> = {
      "Not Started": "In Progress",
      "In Progress": "Completed",
      "Completed": "Not Started"
    };
    updateTaskStatusMutation.mutate({
      taskId: task.id,
      status: statusMap[task.status] || "Not Started"
    });
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      toast.success("Task deleted");
      // Remove from pinned via database
      unpinTask(taskId);
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
    }
  });

  // Subtask mutations
  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, status }: { subtaskId: string; status: string }) => {
      const { error } = await supabase
        .from("subtasks")
        .update({ status })
        .eq("id", subtaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subtask status updated");
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
    }
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await supabase.from("subtasks").delete().eq("id", subtaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subtask deleted");
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
    }
  });

  // Quick add task mutation (supports comma-separated names)
  const quickAddTaskMutation = useMutation({
    mutationFn: async ({ names, projectId }: { names: string[]; projectId: string }) => {
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
      const deadlineDateStr = format(deadlineDate, "yyyy-MM-dd");

      const rows = names.map(name => ({
        name,
        project_id: projectId,
        status: "Not Started" as const,
        date: deadlineDateStr,
        deadline: deadlineIso,
      }));
      const { data, error } = await supabase
        .from("tasks")
        .insert(rows)
        .select();
      if (error) throw error;
      return data || [];
    },
    onSuccess: (data) => {
      toast.success(data.length > 1 ? `${data.length} tasks added` : "Task added");
      data.forEach((task: any) => togglePinTask(task.id)); // Auto-pin the new tasks
      setQuickAddTaskName("");
      setNewTaskName("");
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
    }
  });

  // Quick add subtask mutation (supports comma-separated names)
  const quickAddSubtaskMutation = useMutation({
    mutationFn: async ({ names, taskId }: { names: string[]; taskId: string }) => {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();

      const rows = names.map(name => ({
        name,
        task_id: taskId,
        status: "Not Started",
        assigner_id: employee?.id || null
      }));
      const { data, error } = await supabase
        .from("subtasks")
        .insert(rows)
        .select();
      if (error) throw error;
      return data || [];
    },
    onSuccess: (data) => {
      toast.success(data.length > 1 ? `${data.length} subtasks added` : "Subtask added");
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
    }
  });

  const handleStartTask = async (taskId: string) => {
    try {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();

      if (!employee) {
        toast.error("Employee not found");
        return;
      }

      // Assign task to current slot
      await assignToCurrentSlot(taskId, 'task');

      const { error } = await supabase.from("time_entries").insert({
        task_id: taskId,
        employee_id: employee.id,
        start_time: new Date().toISOString(),
        entry_type: "task"
      });

      if (error) throw error;

      await supabase.from("tasks").update({ status: "In Progress" }).eq("id", taskId);

      toast.success("Timer started");
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["runningTasks"] });
      queryClient.invalidateQueries({ queryKey: ["running-timers"] });
      queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-workload"] });
      queryClient.invalidateQueries({ queryKey: ["workload-tasks"] });
    } catch (error) {
      toast.error("Failed to start timer");
      console.error(error);
    }
  };

  // Start subtask timer
  const handleStartSubtask = async (subtaskId: string, taskId: string) => {
    try {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();

      if (!employee) {
        toast.error("Employee not found");
        return;
      }

      // Assign subtask to current slot
      await assignToCurrentSlot(subtaskId, 'subtask');

      const { error } = await supabase.from("time_entries").insert({
        task_id: subtaskId,
        employee_id: employee.id,
        start_time: new Date().toISOString(),
        entry_type: "subtask"
      });

      if (error) throw error;

      await supabase.from("subtasks").update({ status: "In Progress" }).eq("id", subtaskId);

      toast.success("Subtask timer started");
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["runningTasks"] });
      queryClient.invalidateQueries({ queryKey: ["running-timers"] });
      queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-workload"] });
      queryClient.invalidateQueries({ queryKey: ["workload-tasks"] });
    } catch (error) {
      toast.error("Failed to start subtask timer");
      console.error(error);
    }
  };

  // Open assign for subtask
  const openAssignForSubtask = (subtask: any, taskId: string) => {
    setSelectedItemsForWorkload([{
      id: subtask.id,
      originalId: subtask.id,
      type: 'subtask',
      itemType: 'subtask',
      title: subtask.name,
      date: new Date().toISOString().slice(0, 10),
      taskId: taskId,
    }]);
    setIsAssignDialogOpen(true);
  };

  const handleToggleSubtaskStatus = (subtask: any) => {
    const statusMap: Record<string, string> = {
      "Not Started": "In Progress",
      "In Progress": "Completed",
      "Completed": "Not Started"
    };
    updateSubtaskMutation.mutate({
      subtaskId: subtask.id,
      status: statusMap[subtask.status] || "Not Started"
    });
  };

  const openAssignForTask = (task: any) => {
    setSelectedItemsForWorkload([{
      id: task.id,
      originalId: task.id,
      type: 'task',
      itemType: 'task',
      title: task.name,
      date: new Date().toISOString().slice(0, 10),
      projectId: task.project_id,
    }]);
    setIsAssignDialogOpen(true);
  };

  const parsePauseInfo = (timerMetadata: string | null) => {
    if (!timerMetadata) return { isPaused: false };
    const pauseMatches = [...timerMetadata.matchAll(/Timer paused at ([^,\n]+)/g)];
    const resumeMatches = [...timerMetadata.matchAll(/Timer resumed at ([^,\n]+)/g)];
    return { isPaused: pauseMatches.length > resumeMatches.length };
  };

  // Helper function to format date for timeline view
  const formatDateDDMMYYYY = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper function to format time for display (HH:MM AM/PM)
  const formatTimeDisplay = (date: Date): string => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
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
          setTimeLeft('Started');
          setIsStarted(true);
          setIsOverdue(false);
          setIsVerySoon(false);
        }
        return;
      }

      setIsStarted(false);
      setIsOverdue(false);
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

  // Timeline view component - only shows tasks with slot or reminder set
  const TimelineView = () => {
    // Only show tasks that have a slot or reminder set
    const tasksWithSlotsOrReminders = displayedTasks.filter(
      task => task.slot_start_datetime || task.slot_start_time || task.reminder_datetime
    );

    // Group tasks by date and time
    const tasksByDateTime = tasksWithSlotsOrReminders.reduce((acc, task) => {
      let dateTimeKey: string;
      let sortableTime: number;

      if (task.slot_start_datetime) {
        const timeValue = new Date(task.slot_start_datetime);
        const date = formatDateDDMMYYYY(timeValue);
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time}`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else if (task.slot_start_time) {
        const timeValue = new Date(task.slot_start_time);
        const date = formatDateDDMMYYYY(timeValue);
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time}`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else if (task.reminder_datetime) {
        const timeValue = new Date(task.reminder_datetime);
        const date = formatDateDDMMYYYY(timeValue);
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time} (Reminder)`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else {
        dateTimeKey = "No Time Set";
        sortableTime = 24 * 60;
      }

      if (!acc[dateTimeKey]) {
        acc[dateTimeKey] = { tasks: [], sortableTime };
      }
      acc[dateTimeKey].tasks.push(task);
      return acc;
    }, {} as Record<string, { tasks: any[]; sortableTime: number }>);

    const sortedSlots = Object.keys(tasksByDateTime).sort((a, b) => {
      if (a === "No Time Set") return 1;
      if (b === "No Time Set") return -1;
      
      // Extract date from the key "DD/MM/YYYY HH:MM AM/PM" or "DD/MM/YYYY HH:MM AM/PM (Reminder)"
      const datePartA = a.split(' ').slice(0, 1)[0];
      const datePartB = b.split(' ').slice(0, 1)[0];
      
      const [dayA, monthA, yearA] = datePartA.split('/').map(Number);
      const [dayB, monthB, yearB] = datePartB.split('/').map(Number);
      
      const dateObjA = new Date(yearA, monthA - 1, dayA);
      const dateObjB = new Date(yearB, monthB - 1, dayB);
      
      const dateCompare = dateObjA.getTime() - dateObjB.getTime();
      if (dateCompare !== 0) return dateCompare;
      
      return tasksByDateTime[a].sortableTime - tasksByDateTime[b].sortableTime;
    });

    if (tasksWithSlotsOrReminders.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p>No tasks with time slots or reminders</p>
          <p className="text-sm">Edit tasks to add slots or reminders to see them here</p>
        </div>
      );
    }

    return (
      <div className="relative">
        {/* Timeline mode indicator */}
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Time Slots & Reminders</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            {tasksWithSlotsOrReminders.length} items
          </span>
        </div>

        {/* Vertical timeline thread */}
        <div className="absolute left-8 top-12 bottom-0 w-0.5 bg-blue-200"></div>

        <div className="space-y-6">
          {sortedSlots.map((dateTimeSlot) => (
            <div key={dateTimeSlot} className="relative">
              {/* Knot on the timeline */}
              <div className="absolute left-7 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm z-10" style={{ top: '4px' }}></div>

              <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                {/* Time node */}
                <div className={`relative z-10 flex items-center justify-center w-full sm:w-auto sm:min-w-[160px] h-8 bg-background border border-border rounded-md text-sm font-medium mb-3 sm:mb-0 px-3 ${
                  dateTimeSlot === "No Time Set" ? "text-muted-foreground" : ""
                }`}>
                  {dateTimeSlot}
                </div>

                {/* Tasks at this time slot */}
                <div className="flex-1 space-y-2 pl-0 sm:pl-4">
                  {tasksByDateTime[dateTimeSlot].tasks.map((task: any) => {
                    const activeEntry = timeEntries.find(e => e.task_id === task.id);
                    const isPaused = activeEntry ? parsePauseInfo(activeEntry.timer_metadata).isPaused : false;
                    const slotTime = task.slot_start_datetime || task.slot_start_time;

                    return (
                      <Card key={task.id} className="p-3 max-w-2xl">
                        <div
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer"
                          onClick={() => setShowingActionsFor(showingActionsFor === task.id ? null : task.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm break-words">{task.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {task.status}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Due: {task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB') : "No deadline"}
                              </span>
                              {task.project?.name && (
                                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                  {task.project.name}
                                </span>
                              )}
                            </div>
                            {slotTime && !activeEntry && (
                              <div className="mt-2">
                                <CountdownTimer
                                  targetTime={new Date(slotTime)}
                                  taskName={task.name}
                                />
                              </div>
                            )}
                          </div>

                          {(showingActionsFor === task.id || activeEntry) && (
                            <div className="flex items-center gap-1 justify-end flex-wrap">
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
                                    onTimerUpdate={() => {
                                      queryClient.invalidateQueries({ queryKey: ["pinned-goals-time-entries"] });
                                    }}
                                  />
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartTask(task.id);
                                  }}
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
                                  openAssignForTask(task);
                                }}
                                className="h-7 px-2"
                                title="Add to Workload"
                              >
                                <CalendarPlus className="h-3 w-3 text-blue-600" />
                              </Button>

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
                                  togglePinTask(task.id);
                                }}
                                className="h-7 px-2"
                                title={pinnedTaskIds.includes(task.id) ? "Unpin" : "Pin"}
                              >
                                <Pin className={`h-3 w-3 ${pinnedTaskIds.includes(task.id) ? 'fill-amber-600 text-amber-600' : ''}`} />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Delete this task?")) {
                                    deleteTaskMutation.mutate(task.id);
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
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="px-6 py-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="flex items-center text-base font-semibold">
                  <Pin className="h-4 w-4 mr-2 text-amber-600" />
                  Pinned
                </CardTitle>
                {displayedTasks.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{displayedTasks.length}</Badge>
                )}
                <div className="flex items-center gap-1.5 ml-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    id="show-completed-pinned" 
                    checked={showCompleted} 
                    onCheckedChange={(checked) => setShowCompleted(checked === true)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="show-completed-pinned" className="text-xs text-muted-foreground cursor-pointer">
                    Show
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
          <CardContent className="px-4 py-4 space-y-4">
            {/* Search Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Search */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Search Projects to Pin</span>
                </div>
                <Input
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => {
                    setProjectSearch(e.target.value);
                    setShowProjectResults(true);
                  }}
                  onFocus={() => setShowProjectResults(true)}
                  onBlur={() => setTimeout(() => setShowProjectResults(false), 200)}
                />
                {showProjectResults && filteredProjects.length > 0 && (
                  <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-60 overflow-y-auto">
                    <CardContent className="p-2">
                      {filteredProjects.map((project: any) => (
                        <div
                          key={project.id}
                          className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => togglePinProject(project.id)}
                        >
                          <Checkbox
                            checked={pinnedProjectIds.includes(project.id)}
                            onCheckedChange={(e) => {}}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{project.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {project.service} • {project.clients?.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Task Search */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Search Tasks to Pin</span>
                </div>
                <Input
                  placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={(e) => {
                    setTaskSearch(e.target.value);
                    setShowTaskResults(true);
                  }}
                  onFocus={() => setShowTaskResults(true)}
                  onBlur={() => setTimeout(() => setShowTaskResults(false), 200)}
                />
                {showTaskResults && filteredSearchTasks.length > 0 && (
                  <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-60 overflow-y-auto">
                    <CardContent className="p-2">
                      {filteredSearchTasks.map((task: any) => {
                        const project = projects.find(p => p.id === task.project_id);
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                            onClick={() => togglePinTask(task.id)}
                          >
                            <Checkbox
                              checked={pinnedTaskIds.includes(task.id)}
                              onCheckedChange={(e) => {}}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{task.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {project?.name} • {task.status}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Time Filters */}
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
            </div>

            {/* Search filter */}
            <div className="flex gap-2">
              <Input
                placeholder="Filter tasks..."
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

            {/* Pinned Project Filters */}
            {pinnedProjectsFromTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Filter by Project:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={selectedProjectFilter === null ? "default" : "outline"}
                    onClick={() => {
                      setSelectedProjectFilter(null);
                      setShowAllProjectTasks(false);
                    }}
                    className="text-xs"
                  >
                    All ({pinnedTasks.length})
                  </Button>
                  {pinnedProjectsFromTasks.map((project: any) => {
                    const count = pinnedTasks.filter(t => t.project_id === project.id).length;
                    const isMisc = project.id === miscProject?.id;
                    return (
                      <Button
                        key={project.id}
                        size="sm"
                        variant={selectedProjectFilter === project.id ? "default" : "outline"}
                        onClick={() => {
                          setSelectedProjectFilter(project.id);
                          setShowAllProjectTasks(isMisc);
                        }}
                        className="flex items-center gap-2 text-xs"
                      >
                        {selectedProjectFilter === project.id && <Check className="h-3 w-3" />}
                        {project.name} {isMisc && "(Default)"}
                        <X
                          className="h-3 w-3 ml-1 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinProject(project.id);
                          }}
                        />
                      </Button>
                    );
                  })}
                </div>
                
                {/* Show All Tasks Checkbox - shows when a project is selected */}
                {selectedProjectFilter && (
                  <div className="flex items-center gap-2 mt-3">
                    <Checkbox
                      id="show-all-project-tasks"
                      checked={showAllProjectTasks}
                      onCheckedChange={(checked) => setShowAllProjectTasks(checked === true)}
                    />
                    <label 
                      htmlFor="show-all-project-tasks" 
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Show all tasks (to pin)
                    </label>
                  </div>
                )}
                
                {/* Quick Add Task Input - shows when a project is selected (comma-separated) */}
                {selectedProjectFilter && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="Add tasks (comma-separated)..."
                      value={quickAddTaskName}
                      onChange={(e) => setQuickAddTaskName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && quickAddTaskName.trim() && selectedProjectFilter) {
                          const names = quickAddTaskName
                            .split(/\r?\n/)
                            .flatMap(part => part.split(","))
                            .map(name => name.trim())
                            .filter(Boolean);
                          if (names.length > 0) {
                            quickAddTaskMutation.mutate({ names, projectId: selectedProjectFilter });
                          }
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (quickAddTaskName.trim() && selectedProjectFilter) {
                          const names = quickAddTaskName
                            .split(/\r?\n/)
                            .flatMap(part => part.split(","))
                            .map(name => name.trim())
                            .filter(Boolean);
                          if (names.length > 0) {
                            quickAddTaskMutation.mutate({ names, projectId: selectedProjectFilter });
                          }
                        }
                      }}
                      disabled={!quickAddTaskName.trim() || quickAddTaskMutation.isPending}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Tasks Display */}
            {viewMode === "timeline" ? (
              <TimelineView />
            ) : displayedTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Pin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p>No tasks for this period</p>
                <p className="text-sm">Search and pin projects or tasks above, or add new ones</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedTasks.map((task: any) => {
                  const activeEntry = timeEntries.find(e => e.task_id === task.id);
                  const isPaused = activeEntry ? parsePauseInfo(activeEntry.timer_metadata).isPaused : false;
                  const isShowingSubtasks = showSubtasksFor.has(task.id);

                  return (
                    <Card key={task.id} className="p-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePinTask(task.id)}
                            className="h-6 px-2 text-amber-600"
                            title={pinnedTaskIds.includes(task.id) ? "Unpin" : "Pin"}
                          >
                            <Pin className={`h-3 w-3 ${pinnedTaskIds.includes(task.id) ? 'fill-amber-600' : ''}`} />
                          </Button>
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setShowingActionsFor(showingActionsFor === task.id ? null : task.id)}
                          >
                            <h3 className="font-medium text-sm break-words">{task.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span
                                className={`px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${
                                  task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTaskStatus(task);
                                }}
                              >
                                {task.status}
                              </span>
                              <span>Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</span>
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                {task.project?.name}
                              </span>
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
                          </div>
                        </div>

                        {/* Action buttons */}
                        {(showingActionsFor === task.id || activeEntry) && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newSet = new Set(showSubtasksFor);
                                if (isShowingSubtasks) newSet.delete(task.id);
                                else newSet.add(task.id);
                                setShowSubtasksFor(newSet);
                              }}
                              className="h-8 px-3"
                            >
                              <List className="h-4 w-4" />
                              {task.subtask_count > 0 && <span className="ml-1 text-xs">{task.subtask_count}</span>}
                            </Button>

                            {activeEntry ? (
                              <>
                                <div className="flex flex-col items-start gap-1">
                                  <LiveTimer
                                    startTime={activeEntry.start_time}
                                    isPaused={isPaused}
                                    timerMetadata={activeEntry.timer_metadata}
                                  />
                                  <span className="text-xs text-muted-foreground">{isPaused ? "Paused" : "Running"}</span>
                                </div>
                                <CompactTimerControls
                                  taskId={task.id}
                                  taskName={task.name}
                                  entryId={activeEntry.id}
                                  timerMetadata={activeEntry.timer_metadata}
                                  onTimerUpdate={() => {
                                    queryClient.invalidateQueries({ queryKey: ["pinned-goals-time-entries"] });
                                  }}
                                />
                              </>
                            ) : (
                              <Button size="sm" onClick={() => handleStartTask(task.id)} className="h-8 px-3">
                                <Play className="h-4 w-4" />
                              </Button>
                            )}

                            <Button size="sm" variant="ghost" onClick={() => openAssignForTask(task)} className="h-8 px-3" title="Add to Workload">
                              <CalendarPlus className="h-4 w-4 text-blue-600" />
                            </Button>

                            <Button size="sm" variant="ghost" onClick={() => setMoveToProjectTask({ id: task.id, name: task.name, project_id: task.project_id })} className="h-8 px-3" title="Move to Project">
                              <FolderOpen className="h-4 w-4" />
                            </Button>

                            <Button size="sm" variant="ghost" onClick={() => setEditingTask(task)} className="h-8 px-3">
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button size="sm" variant="ghost" onClick={() => navigate(`/alltasks?highlight=${task.id}`)} className="h-8 px-3">
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Delete this task?")) {
                                  deleteTaskMutation.mutate(task.id);
                                }
                              }}
                              className="h-8 px-3 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* Subtasks */}
                        {isShowingSubtasks && (
                          <div className="ml-4 mt-3 space-y-2">
                            {/* Quick Add Subtask Input (comma-separated) */}
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Add subtasks (comma-separated)..."
                                value={quickAddSubtaskNames[task.id] || ""}
                                onChange={(e) => setQuickAddSubtaskNames(prev => ({ ...prev, [task.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const inputValue = quickAddSubtaskNames[task.id] || "";
                                    const names = inputValue
                                      .split(/\r?\n/)
                                      .flatMap(part => part.split(","))
                                      .map(name => name.trim())
                                      .filter(Boolean);
                                    if (names.length > 0) {
                                      quickAddSubtaskMutation.mutate({ names, taskId: task.id });
                                      setQuickAddSubtaskNames(prev => ({ ...prev, [task.id]: "" }));
                                    }
                                  }
                                }}
                                className="flex-1 h-8 text-sm"
                              />
                              <Button
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                  const inputValue = quickAddSubtaskNames[task.id] || "";
                                  const names = inputValue
                                    .split(/\r?\n/)
                                    .flatMap(part => part.split(","))
                                    .map(name => name.trim())
                                    .filter(Boolean);
                                  if (names.length > 0) {
                                    quickAddSubtaskMutation.mutate({ names, taskId: task.id });
                                    setQuickAddSubtaskNames(prev => ({ ...prev, [task.id]: "" }));
                                  }
                                }}
                                disabled={!(quickAddSubtaskNames[task.id] || "").trim() || quickAddSubtaskMutation.isPending}
                              >
                                Add
                              </Button>
                            </div>

                            {task.subtasks && task.subtasks.length > 0 && task.subtasks.map((subtask: any) => {
                              const subtaskActiveEntry = timeEntries.find(e => e.task_id === subtask.id && e.entry_type === 'subtask');
                              const subtaskIsPaused = subtaskActiveEntry ? parsePauseInfo(subtaskActiveEntry.timer_metadata).isPaused : false;
                              
                              return (
                                <Card key={subtask.id} className="p-3 bg-muted/30">
                                  <div className="flex flex-col gap-2">
                                    {/* Subtask Name and Status Row */}
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
                                          <Check className="h-4 w-4 text-primary" />
                                        ) : (
                                          <div className="h-4 w-4 border rounded border-muted-foreground hover:border-primary" />
                                        )}
                                      </button>
                                      <p className="text-sm font-medium break-words min-w-0 flex-1">{subtask.name}</p>
                                    </div>
                                    
                                    {/* Status and Info Row */}
                                    <div className="flex items-center gap-1.5 flex-wrap text-xs pl-6">
                                      <span 
                                        className={`px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${
                                          subtask.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                          subtask.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                          subtask.status === 'Assigned' ? 'bg-orange-100 text-orange-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}
                                        onClick={() => handleToggleSubtaskStatus(subtask)}
                                      >
                                        {subtask.status}
                                      </span>
                                      {subtask.deadline && (
                                        <span className="text-muted-foreground">Due: {new Date(subtask.deadline).toLocaleDateString()}</span>
                                      )}
                                      {subtask.estimated_duration && (
                                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                          Est: {subtask.estimated_duration}h
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Action Buttons Row */}
                                    <div className="flex items-center gap-0.5 flex-wrap pl-6">
                                      {subtaskActiveEntry ? (
                                        <>
                                          <LiveTimer
                                            startTime={subtaskActiveEntry.start_time}
                                            isPaused={subtaskIsPaused}
                                            timerMetadata={subtaskActiveEntry.timer_metadata}
                                          />
                                          <CompactTimerControls
                                            taskId={subtask.id}
                                            taskName={subtask.name}
                                            entryId={subtaskActiveEntry.id}
                                            timerMetadata={subtaskActiveEntry.timer_metadata}
                                            onTimerUpdate={() => {
                                              queryClient.invalidateQueries({ queryKey: ["pinned-goals-time-entries"] });
                                            }}
                                            isSubtask={true}
                                          />
                                        </>
                                      ) : (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => handleStartSubtask(subtask.id, task.id)}
                                          className="h-7 w-7"
                                          title="Start Timer"
                                        >
                                          <Play className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => openAssignForSubtask(subtask, task.id)}
                                        className="h-7 w-7"
                                        title="Add to Workload"
                                      >
                                        <CalendarPlus className="h-3.5 w-3.5 text-blue-600" />
                                      </Button>
                                      
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          setSelectedSubtasks([{ id: subtask.id, name: subtask.name, task_id: task.id }]);
                                          setIsMoveDialogOpen(true);
                                        }}
                                        className="h-7 w-7"
                                        title="Move to Task"
                                      >
                                        <ArrowRight className="h-3.5 w-3.5" />
                                      </Button>
                                      
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingSubtaskForDialog({
                                            id: subtask.id,
                                            name: subtask.name,
                                            status: subtask.status,
                                            deadline: subtask.deadline,
                                            estimated_duration: subtask.estimated_duration,
                                            assignee_id: subtask.assignee_id,
                                            task_id: task.id
                                          });
                                          setIsSubtaskDialogOpen(true);
                                        }}
                                        className="h-7 w-7"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          if (confirm("Delete this subtask?")) {
                                            deleteSubtaskMutation.mutate(subtask.id);
                                          }
                                        }}
                                        className="h-7 w-7 text-destructive"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Dialogs */}
      {editingTask && (
        <TaskEditDialog
          isOpen={!!editingTask}
          onClose={() => {
            setEditingTask(null);
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
          }}
          task={editingTask}
        />
      )}

      {moveToProjectTask && (
        <MoveToProjectDialog
          open={!!moveToProjectTask}
          onOpenChange={(open) => {
            if (!open) {
              setMoveToProjectTask(null);
              queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
              queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
            }
          }}
          taskId={moveToProjectTask.id}
          taskName={moveToProjectTask.name}
          currentProjectId={moveToProjectTask.project_id}
          onMoved={() => {
            setMoveToProjectTask(null);
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
          }}
        />
      )}

      {isAssignDialogOpen && (
        <AssignToSlotDialog
          open={isAssignDialogOpen}
          onOpenChange={(open) => {
            setIsAssignDialogOpen(open);
            if (!open) setSelectedItemsForWorkload([]);
          }}
          selectedItems={selectedItemsForWorkload}
          onAssigned={() => {
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
          }}
        />
      )}

      {isMoveDialogOpen && (
        <MoveSubtasksDialog
          open={isMoveDialogOpen}
          onOpenChange={(open) => {
            setIsMoveDialogOpen(open);
            if (!open) setSelectedSubtasks([]);
          }}
          selectedSubtasks={selectedSubtasks}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
            setSelectedSubtasks([]);
          }}
        />
      )}

      {isSubtaskDialogOpen && editingSubtaskForDialog && (
        <SubtaskDialog
          isOpen={isSubtaskDialogOpen}
          onClose={() => {
            setIsSubtaskDialogOpen(false);
            setEditingSubtaskForDialog(null);
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
          }}
          onSave={(data) => {
            // Handle save if needed
            setIsSubtaskDialogOpen(false);
            setEditingSubtaskForDialog(null);
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-project-tasks"] });
          }}
          editingSubtask={editingSubtaskForDialog}
          taskId={editingSubtaskForDialog.task_id}
          employees={employees}
        />
      )}
    </Card>
  );
};
