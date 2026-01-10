import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FolderOpen,
  List,
  Pencil,
  Play,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MoveSubtasksDialog } from "./MoveSubtasksDialog";
import { ConvertToSubtaskDialog } from "./ConvertToSubtaskDialog";
import LiveTimer from "./LiveTimer";
import CompactTimerControls from "./CompactTimerControls";
import TaskEditDialog from "@/components/TaskEditDialog";
import TimeTrackerWithComment from "@/components/TimeTrackerWithComment";
import ManualTimeLog from "@/components/ManualTimeLog";
import AssignToSlotDialog from "@/components/AssignToSlotDialog";
import { MoveToProjectDialog } from "@/components/MoveToProjectDialog";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "date-fns";

type HotProjectStatus = "Imp" | "On-Head" | "Targeted";
type TimeFilter = "all" | "yesterday" | "today" | "tomorrow" | "laterThisWeek" | "nextWeek";
type AssignmentFilter = "all" | "assigned" | "unassigned";

export const HotProjSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("timeline");
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showingActionsFor, setShowingActionsFor] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<"all" | string>("all");

  const [editingTask, setEditingTask] = useState<any>(null);
  const [moveToProjectTask, setMoveToProjectTask] = useState<{ id: string; name: string; project_id: string | null } | null>(null);
  const [convertToSubtaskSourceTask, setConvertToSubtaskSourceTask] = useState<{ id: string; name: string } | null>(null);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedItemsForWorkload, setSelectedItemsForWorkload] = useState<any[]>([]);

  const [selectedSubtasks, setSelectedSubtasks] = useState<{ id: string; name: string; task_id: string }[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);

  const hotStatuses: HotProjectStatus[] = ["Imp", "On-Head", "Targeted"];

  // Render task name with clickable hyperlinks (same behavior as Hotlist/QuickTasks)
  const renderTaskName = (name: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = (name || "").split(urlRegex);

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
            {part.length > 30 ? part.substring(0, 30) + "..." : part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const { data: hotProjects = [] } = useQuery({
    queryKey: ["hotproj-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status")
        .in("status", hotStatuses)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const hotProjectIds = useMemo(() => hotProjects.map((p: any) => p.id), [hotProjects]);

  const { data: tasks } = useQuery({
    queryKey: ["hotproj-tasks", hotProjectIds, showCompleted],
    enabled: hotProjectIds.length > 0,
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
          sort_order,
          project:projects!inner(name)
        `)
        .in("project_id", hotProjectIds)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("deadline", { ascending: true })
        .limit(300);

      // Match Hotlist behavior: hide completed unless explicitly requested
      if (!showCompleted) {
        query = query.neq("status", "Completed");
      }

      const { data: baseTasks, error } = await query;
      if (error) throw error;
      const base = baseTasks || [];
      if (base.length === 0) return [];

      const taskIds = base.map((t: any) => t.id);

      const { data: subtasks } = await supabase
        .from("subtasks")
        .select("id, name, status, deadline, estimated_duration, task_id")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true });

      const subtaskIds = (subtasks || []).map((st: any) => st.id);

      const { data: subtaskEntries } =
        subtaskIds.length > 0
          ? await supabase
              .from("time_entries")
              .select("id, duration_minutes, start_time, end_time, comment, entry_type, task_id")
              .in("task_id", subtaskIds)
              .not("end_time", "is", null)
              .order("start_time", { ascending: false })
          : ({ data: [] } as any);

      const { data: taskEntries } = await supabase
        .from("time_entries")
        .select("id, duration_minutes, start_time, end_time, comment, entry_type, task_id")
        .in("task_id", taskIds)
        .not("end_time", "is", null)
        .order("start_time", { ascending: false });

      const subtaskTimeMap = (subtaskEntries || []).reduce((acc: Record<string, number>, entry: any) => {
        acc[entry.task_id] = (acc[entry.task_id] || 0) + (entry.duration_minutes || 0);
        return acc;
      }, {});

      const subtaskDetailedEntries = (subtaskEntries || []).reduce((acc: Record<string, any[]>, entry: any) => {
        (acc[entry.task_id] ||= []).push(entry);
        return acc;
      }, {});

      const taskEntriesByTask = (taskEntries || []).reduce((acc: Record<string, any[]>, entry: any) => {
        (acc[entry.task_id] ||= []).push(entry);
        return acc;
      }, {});

      const enhanced = base.map((task: any) => {
        const tEntries = taskEntriesByTask[task.id] || [];
        const totalLoggedMinutes = tEntries.reduce((sum: number, e: any) => sum + (e.duration_minutes || 0), 0);

        // Keep ALL subtasks available so the "Show completed" toggle can reveal completed subtasks too.
        const taskSubtasks = (subtasks || []).filter((st: any) => st.task_id === task.id);
        const subLoggedMinutes = taskSubtasks.reduce((sum: number, st: any) => sum + (subtaskTimeMap[st.id] || 0), 0);
        const totalLoggedHours = Math.round(((totalLoggedMinutes + subLoggedMinutes) / 60) * 100) / 100;

        return {
          ...task,
          time_entries: tEntries,
          subtasks: taskSubtasks.map((st: any) => ({
            ...st,
            logged_minutes: subtaskTimeMap[st.id] || 0,
            logged_hours: Math.round(((subtaskTimeMap[st.id] || 0) / 60) * 100) / 100,
            time_entries: subtaskDetailedEntries[st.id] || [],
          })),
          total_logged_hours: totalLoggedHours,
          subtask_count: taskSubtasks.filter((st: any) => st.status !== "Completed").length,
        };
      });

      return enhanced;
    },
  });

  const { data: timeEntries } = useQuery({
    queryKey: ["hotproj-task-time-entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_entries").select("*").is("end_time", null);
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

    let filtered = tasks as any[];
    if (timeFilter !== "all") {
      filtered = filtered.filter((task) => {
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

    const sorted = [...filtered].sort((a, b) => {
      const hasSortA = a.sort_order !== null && a.sort_order !== undefined;
      const hasSortB = b.sort_order !== null && b.sort_order !== undefined;

      // Recently added (no sort_order) first
      if (!hasSortA && hasSortB) return -1;
      if (hasSortA && !hasSortB) return 1;

      // Within recently added, newest first
      if (!hasSortA && !hasSortB) {
        const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (createdA !== createdB) return createdB - createdA;
      }

      // Manually ordered tasks
      if (hasSortA && hasSortB) return a.sort_order - b.sort_order;

      // Fallback
      const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return dateA - dateB;
    });

    return sorted;
  }, [tasks, timeFilter]);

  const hotprojProjects = useMemo(() => {
    return Array.from(
      new Set(
        (filteredTasks || [])
          .map((task: any) => task.project?.name || (task as any).projects?.name || "")
          .filter(Boolean)
      )
    );
  }, [filteredTasks]);

  const displayedTasks = useMemo(() => {
    let list = filteredTasks as any[];

    if (selectedProject !== "all") {
      list = list.filter((task) => (task.project?.name || (task as any).projects?.name) === selectedProject);
    }

    if (assignmentFilter === "assigned") {
      list = list.filter(
        (task) => task.status === "Assigned" || !!task.slot_start_datetime || !!task.slot_start_time || !!task.scheduled_time
      );
    } else if (assignmentFilter === "unassigned") {
      list = list.filter(
        (task) => task.status !== "Assigned" && !task.slot_start_datetime && !task.slot_start_time && !task.scheduled_time
      );
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      list = list.filter(
        (task) =>
          (task.name || "").toLowerCase().includes(searchLower) ||
          (task.subtasks || []).some((subtask: any) => (subtask.name || "").toLowerCase().includes(searchLower))
      );
    }

    return list;
  }, [filteredTasks, selectedProject, assignmentFilter, searchTerm]);

  const filterCounts = useMemo(() => {
    if (!tasks) return { all: 0, yesterday: 0, today: 0, tomorrow: 0, laterThisWeek: 0, nextWeek: 0, assigned: 0, unassigned: 0 };
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

    const withDeadline = (tasks as any[]).filter((t) => !!t.deadline);
    const inRange = (d: Date, start: Date, end: Date) => d >= start && d <= end;

    // Count tasks + their (active) subtasks (matches Hotlist behavior)
    const countWithSubtasks = (taskList: any[]) => {
      return taskList.reduce((count, t) => count + 1 + (t.subtask_count || 0), 0);
    };

    const all = countWithSubtasks(tasks as any[]);
    const yesterdayTasks = withDeadline.filter((t) => inRange(new Date(t.deadline), yesterdayStart, yesterdayEnd));
    const yesterday = countWithSubtasks(yesterdayTasks);
    const todayTasks = withDeadline.filter((t) => inRange(new Date(t.deadline), todayStart, todayEnd));
    const today = countWithSubtasks(todayTasks);
    const tomorrowTasks = withDeadline.filter((t) => inRange(new Date(t.deadline), tomorrowStart, tomorrowEnd));
    const tomorrow = countWithSubtasks(tomorrowTasks);
    const laterThisWeekTasks = withDeadline.filter((t) => {
      const d = new Date(t.deadline);
      return d > tomorrowEnd && d <= thisWeekEnd;
    });
    const laterThisWeek = countWithSubtasks(laterThisWeekTasks);
    const nextWeekTasks = withDeadline.filter((t) => inRange(new Date(t.deadline), nextWeekStart, nextWeekEnd));
    const nextWeek = countWithSubtasks(nextWeekTasks);

    const assignedTasks = (tasks as any[]).filter(
      (t) => t.status === "Assigned" || !!t.slot_start_datetime || !!t.slot_start_time || !!t.scheduled_time
    );
    const assigned = countWithSubtasks(assignedTasks);
    const unassignedTasks = (tasks as any[]).filter(
      (t) => t.status !== "Assigned" && !t.slot_start_datetime && !t.slot_start_time && !t.scheduled_time
    );
    const unassigned = countWithSubtasks(unassignedTasks);

    return { all, yesterday, today, tomorrow, laterThisWeek, nextWeek, assigned, unassigned };
  }, [tasks]);

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] });
    },
    onError: () => toast.error("Failed to delete task"),
  });

  // Subtask mutations (Hotlist parity)
  const createSubtaskMutation = useMutation({
    mutationFn: async ({ taskId, name }: { taskId: string; name: string }) => {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();
      if (!employee) throw new Error("Employee not found");
      const { error } = await supabase.from("subtasks").insert({ name, task_id: taskId, status: "Not Started", assigner_id: employee.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subtask created successfully");
      queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] });
    },
    onError: () => toast.error("Failed to create subtask"),
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, name, status }: { subtaskId: string; name?: string; status?: string }) => {
      const updates: any = {};
      if (name) updates.name = name;
      if (status) updates.status = status;
      const { error } = await supabase.from("subtasks").update(updates).eq("id", subtaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subtask updated successfully");
      queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] });
    },
    onError: () => toast.error("Failed to update subtask"),
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await supabase.from("subtasks").delete().eq("id", subtaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subtask deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] });
    },
    onError: () => toast.error("Failed to delete subtask"),
  });

  const convertSubtaskToTaskMutation = useMutation({
    mutationFn: async ({ subtaskId, subtaskName }: { subtaskId: string; subtaskName: string }) => {
      const { data: subtask, error: subtaskError } = await supabase
        .from("subtasks")
        .select("deadline, status, estimated_duration, assignee_id, task_id")
        .eq("id", subtaskId)
        .single();

      if (subtaskError) throw subtaskError;

      const { data: parentTask, error: parentError } = await supabase.from("tasks").select("project_id").eq("id", subtask.task_id).single();
      if (parentError) throw parentError;

      const { error: taskError } = await supabase.from("tasks").insert({
        name: subtaskName,
        project_id: parentTask.project_id,
        status: subtask?.status === "Completed" ? "Completed" : "Not Started",
        deadline: subtask?.deadline,
        estimated_duration: subtask?.estimated_duration,
        assignee_id: subtask?.assignee_id,
      });
      if (taskError) throw taskError;

      const { error: deleteError } = await supabase.from("subtasks").delete().eq("id", subtaskId);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast.success("Subtask converted to task");
      queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] });
    },
    onError: (error) => {
      toast.error("Failed to convert subtask to task");
      console.error(error);
    },
  });

  const handleStartTask = async (taskId: string) => {
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

    queryClient.invalidateQueries({ queryKey: ["hotproj-task-time-entries"] });
  };

  const SortableTask: React.FC<{ task: any; activeEntry?: any; isPaused?: boolean }> = ({ task, activeEntry, isPaused }) => {
    const [showSubtasks, setShowSubtasks] = useState<boolean>(() => {
      try {
        const raw = sessionStorage.getItem("hotproj.expandedSubtasks") || "[]";
        const arr = JSON.parse(raw);
        return arr.includes(task.id);
      } catch {
        return false;
      }
    });
    const [newSubtaskName, setNewSubtaskName] = useState("");
    const [showTimeControls, setShowTimeControls] = useState(false);
    const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
    const [editSubtaskName, setEditSubtaskName] = useState("");

    const visibleSubtasks = useMemo(() => {
      const list = (task.subtasks || []).filter((subtask: any) => (showCompleted ? true : subtask.status !== "Completed"));
      const withKey = list.map((st: any) => {
        const match = /^(\d+)/.exec(st.name?.trim() || "");
        return { ...st, _sortKey: match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER };
      });
      return withKey.sort((a: any, b: any) => a._sortKey - b._sortKey || (a.name || "").localeCompare(b.name || ""));
    }, [task.subtasks, showCompleted]);

    const handleAddSubtask = (e: React.FormEvent) => {
      e.preventDefault();
      if (newSubtaskName.trim()) {
        createSubtaskMutation.mutate({ taskId: task.id, name: newSubtaskName.trim() });
        setNewSubtaskName("");
      }
    };

    const handleEditSubtask = (subtaskId: string, currentName: string) => {
      setEditingSubtask(subtaskId);
      setEditSubtaskName(currentName);
    };

    const handleSaveSubtask = (subtaskId: string) => {
      if (editSubtaskName.trim()) {
        updateSubtaskMutation.mutate({ subtaskId, name: editSubtaskName.trim() });
        setEditingSubtask(null);
        setEditSubtaskName("");
      }
    };

    const handleCancelEdit = () => {
      setEditingSubtask(null);
      setEditSubtaskName("");
    };

    const handleDeleteSubtask = (subtaskId: string) => {
      if (confirm("Are you sure you want to delete this subtask?")) {
        deleteSubtaskMutation.mutate(subtaskId);
      }
    };

    const handleToggleSubtaskStatus = (subtaskId: string, currentStatus: string) => {
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
      updateSubtaskMutation.mutate({ subtaskId, status: newStatus });
    };

    const openAssignForTask = (task: any) => {
      const item = {
        id: task.id,
        originalId: task.id,
        type: "task",
        itemType: "task",
        title: task.name,
        date: new Date().toISOString().slice(0, 10),
        client: "",
        project: "",
        assigneeId: null,
        projectId: task.project_id,
      };
      setSelectedItemsForWorkload([item]);
      setIsAssignDialogOpen(true);
    };

    return (
      <div className="select-none">
        <Card className="p-4 w-full">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 task-content-area cursor-pointer" onClick={() => setShowingActionsFor(showingActionsFor === task.id ? null : task.id)}>
                <h3 className="font-medium text-sm sm:text-base break-words">{renderTaskName(task.name)}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                  {(task.project?.name || (task as any).projects?.name) && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">{task.project?.name || (task as any).projects?.name}</span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      task.status === "Completed"
                        ? "bg-green-100 text-green-800"
                        : task.status === "In Progress"
                        ? "bg-yellow-100 text-yellow-800"
                        : task.status === "Assigned"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {task.status}
                  </span>
                  <span>Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</span>
                  {task.total_logged_hours > 0 && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{task.total_logged_hours}h logged</span>}
                  {visibleSubtasks.length > 0 && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{visibleSubtasks.length} subtasks</span>}
                </div>
              </div>
            </div>

            {(showingActionsFor === task.id || activeEntry) && (
              <div className="mt-2 flex flex-wrap gap-2 justify-start task-content-area">
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowTimeControls(!showTimeControls); }} className="h-8 px-3" type="button">
                  <Clock className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSubtasks((prev) => {
                      const next = !prev;
                      try {
                        const raw = sessionStorage.getItem("hotproj.expandedSubtasks") || "[]";
                        const arr = JSON.parse(raw);
                        if (next) {
                          if (!arr.includes(task.id)) arr.push(task.id);
                        } else {
                          const idx = arr.indexOf(task.id);
                          if (idx >= 0) arr.splice(idx, 1);
                        }
                        sessionStorage.setItem("hotproj.expandedSubtasks", JSON.stringify(arr));
                      } catch {}
                      return next;
                    });
                  }}
                  className="h-8 px-3"
                  type="button"
                >
                  <List className="h-4 w-4" />
                  {visibleSubtasks.length > 0 && <span className="ml-1 text-xs">{visibleSubtasks.length}</span>}
                </Button>

                {activeEntry ? (
                  <>
                    <div className="flex flex-col items-start gap-1">
                      <LiveTimer startTime={activeEntry.start_time} isPaused={isPaused} timerMetadata={activeEntry.timer_metadata} />
                      <span className="text-xs text-muted-foreground">{isPaused ? "Paused" : "Running"}</span>
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
                  <Button size="sm" onClick={() => handleStartTask(task.id)} className="h-8 px-3" type="button">
                    <Play className="h-4 w-4" />
                  </Button>
                )}

                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openAssignForTask(task); }} className="h-8 px-3" title="Add to Workload" type="button">
                  <CalendarPlus className={`h-4 w-4 ${(task.status === "Assigned" || task.slot_start_datetime || task.slot_start_time || task.scheduled_time) ? "text-yellow-500" : "text-blue-600"}`} />
                </Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setMoveToProjectTask({ id: task.id, name: task.name, project_id: task.project_id ?? null }); }} className="h-8 px-3" title="Move to Project" type="button">
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingTask(task); }} className="h-8 px-3" type="button">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/alltasks?highlight=${task.id}`); }} className="h-8 px-3" type="button">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setConvertToSubtaskSourceTask({ id: task.id, name: task.name }); }} className="h-8 px-3" title="Convert to Subtask" type="button">
                  <ArrowDownToLine className="h-4 w-4 text-blue-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteTaskMutation.mutate(task.id); }} className="h-8 px-3 text-destructive hover:text-destructive" type="button">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {showTimeControls && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex flex-wrap gap-2">
                  <TimeTrackerWithComment task={{ id: task.id, name: task.name }} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] })} isSubtask={false} />
                  <ManualTimeLog taskId={task.id} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] })} isSubtask={false} />
                </div>
              </div>
            )}

            {showSubtasks && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Subtasks</h4>
                    {selectedSubtasks.filter((s) => s.task_id === task.id).length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMoveDialogOpen(true);
                        }}
                        className="h-7 px-2 text-xs"
                        type="button"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Move ({selectedSubtasks.filter((s) => s.task_id === task.id).length})
                      </Button>
                    )}
                  </div>
                </div>

                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <Input placeholder="Add subtask..." value={newSubtaskName} onChange={(e) => setNewSubtaskName(e.target.value)} className="flex-1 text-sm h-8" />
                  <Button type="submit" size="sm" disabled={!newSubtaskName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>

                {visibleSubtasks.length > 0 ? (
                  <div className="space-y-3">
                    {visibleSubtasks.map((subtask: any) => (
                      <Card key={subtask.id} className="p-4 bg-muted/30">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {editingSubtask === subtask.id ? (
                              <div className="flex gap-2">
                                <Input value={editSubtaskName} onChange={(e) => setEditSubtaskName(e.target.value)} className="flex-1 text-sm h-8" autoFocus />
                                <Button size="sm" onClick={() => handleSaveSubtask(subtask.id)} disabled={!editSubtaskName.trim()} type="button">
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit} type="button">
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isSelected = selectedSubtasks.some((s) => s.id === subtask.id);
                                      if (isSelected) {
                                        setSelectedSubtasks((prev) => prev.filter((s) => s.id !== subtask.id));
                                      } else {
                                        setSelectedSubtasks((prev) => [...prev, { id: subtask.id, name: subtask.name, task_id: task.id }]);
                                      }
                                    }}
                                    className="mt-0.5 shrink-0"
                                    type="button"
                                  >
                                    {selectedSubtasks.some((s) => s.id === subtask.id) ? (
                                      <CheckSquare className="h-4 w-4 text-primary" />
                                    ) : (
                                      <Square className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                    )}
                                  </button>
                                  <p className="text-sm font-medium break-words">{subtask.name}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-80 ${
                                      subtask.status === "Completed"
                                        ? "bg-green-100 text-green-800"
                                        : subtask.status === "In Progress"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : subtask.status === "Assigned"
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                    onClick={() => handleToggleSubtaskStatus(subtask.id, subtask.status)}
                                  >
                                    {subtask.status}
                                  </span>
                                  {subtask.logged_hours > 0 && (
                                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">{subtask.logged_hours}h</span>
                                  )}
                                  <div className="flex items-center gap-0.5 ml-1">
                                    <TimeTrackerWithComment task={{ id: subtask.id, name: subtask.name }} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] })} isSubtask={true} iconOnly={true} />
                                    <ManualTimeLog taskId={subtask.id} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] })} isSubtask={true} iconOnly={true} />
                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditSubtask(subtask.id, subtask.name); }} className="h-6 w-6" title="Edit" type="button">
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/alltasks?highlight=${subtask.id}&subtask=true`); }} className="h-6 w-6" title="View" type="button">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Convert this subtask to a task?")) {
                                          convertSubtaskToTaskMutation.mutate({ subtaskId: subtask.id, subtaskName: subtask.name });
                                        }
                                      }}
                                      className="h-6 w-6"
                                      title="Convert to Task"
                                      type="button"
                                    >
                                      <ArrowUpFromLine className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(subtask.id); }} className="h-6 w-6 text-destructive hover:text-destructive" title="Delete" type="button">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {subtask.deadline && <span className="text-muted-foreground">Due: {new Date(subtask.deadline).toLocaleDateString()}</span>}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">No subtasks yet</p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // Timeline view component - copied from Hotlist pattern, grouped by slot/deadline time
  const TimelineView = () => {
    const tasksWithSlots = displayedTasks.filter((task: any) => task.slot_start_datetime || task.slot_start_time);
    const hasSlotTasks = tasksWithSlots.length > 0;
    const tasksToDisplay = hasSlotTasks ? tasksWithSlots : displayedTasks;

    const formatTimeDisplay = (date: Date): string => {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    };

    const tasksByDateTime = tasksToDisplay.reduce((acc: any, task: any) => {
      let dateTimeKey: string;
      let timeValue: Date;
      let sortableTime: number;

      if (task.slot_start_datetime) {
        timeValue = new Date(task.slot_start_datetime);
        const date = new Date(task.slot_start_datetime).toLocaleDateString("en-GB");
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time}`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else if (task.slot_start_time) {
        timeValue = new Date(task.slot_start_time);
        const date = new Date(task.slot_start_time).toLocaleDateString("en-GB");
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time}`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else if (task.deadline) {
        timeValue = new Date(task.deadline);
        const date = new Date(task.deadline).toLocaleDateString("en-GB");
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time}`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else {
        dateTimeKey = "No Time Set";
        sortableTime = 24 * 60;
      }

      if (!acc[dateTimeKey]) acc[dateTimeKey] = { tasks: [], sortableTime };
      acc[dateTimeKey].tasks.push(task);
      return acc;
    }, {} as Record<string, { tasks: any[]; sortableTime: number }>);

    const sortedDateTimeSlots = Object.keys(tasksByDateTime).sort((a, b) => {
      if (a === "No Time Set") return 1;
      if (b === "No Time Set") return -1;
      const [dateA] = a.split(" ");
      const [dateB] = b.split(" ");
      const [dayA, monthA, yearA] = dateA.split("/").map(Number);
      const [dayB, monthB, yearB] = dateB.split("/").map(Number);
      const dateObjA = new Date(yearA, monthA - 1, dayA);
      const dateObjB = new Date(yearB, monthB - 1, dayB);
      const dateCompare = dateObjA.getTime() - dateObjB.getTime();
      if (dateCompare !== 0) return dateCompare;
      return tasksByDateTime[a].sortableTime - tasksByDateTime[b].sortableTime;
    });

    const CountdownTimer: React.FC<{ targetTime: Date }> = ({ targetTime }) => {
      const [timeLeft, setTimeLeft] = useState("");
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
            setTimeLeft(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
          } else {
            setTimeLeft("Started");
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

        if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
        else if (minutes > 0) setTimeLeft(`${minutes}m ${seconds}s`);
        else setTimeLeft(`${seconds}s`);
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

    return (
      <div className="relative">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{hasSlotTasks ? "Time Slots" : "Deadline Times"}</span>
        </div>

        <div className="absolute left-8 top-12 bottom-0 w-0.5 bg-blue-200"></div>
        {sortedDateTimeSlots.map((dateTimeSlot, index) => (
          <div
            key={`knot-${dateTimeSlot}`}
            className="absolute left-7 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"
            style={{ top: `${12 + index * (sortedDateTimeSlots.length > 1 ? 96 / (sortedDateTimeSlots.length - 1) : 0)}px` }}
          ></div>
        ))}

        <div className="space-y-6">
          {sortedDateTimeSlots.map((dateTimeSlot) => (
            <div key={dateTimeSlot} className="relative">
              <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                <div className={`relative z-10 flex items-center justify-center w-full sm:w-16 h-8 bg-background border border-border rounded-md text-sm font-medium mb-3 sm:mb-0 ${dateTimeSlot === "No Time Set" ? "text-muted-foreground" : ""}`}>
                  {dateTimeSlot}
                </div>
                <div className="flex-1 space-y-2 pl-0 sm:pl-4">
                  {tasksByDateTime[dateTimeSlot].tasks.map((task: any) => {
                    const activeEntry = (timeEntries || []).find((entry: any) => entry.task_id === task.id);
                    const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");
                    const slot = task.slot_start_datetime || task.slot_start_time;
                    return (
                      <Card key={task.id} className="p-3 max-w-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowingActionsFor(showingActionsFor === task.id ? null : task.id)}>
                            <h3 className="font-medium text-sm break-words">{renderTaskName(task.name)}</h3>
                            {(task.project?.name || (task as any).projects?.name) && (
                              <p className="text-xs text-muted-foreground mt-1">{task.project?.name || (task as any).projects?.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground">Due: {task.deadline ? new Date(task.deadline).toLocaleDateString("en-GB") : "No deadline"}</p>
                            {slot && !activeEntry && (
                              <div className="mt-1">
                                <CountdownTimer targetTime={new Date(slot)} />
                              </div>
                            )}
                          </div>

                          {(showingActionsFor === task.id || activeEntry) && (
                            <div className="flex items-center gap-1 justify-end">
                              {activeEntry ? (
                                <>
                                  <div className="flex flex-col items-end gap-1">
                                    <LiveTimer startTime={activeEntry.start_time} isPaused={isPaused} timerMetadata={activeEntry.timer_metadata} />
                                    <span className="text-xs text-muted-foreground">{isPaused ? "Paused" : "Running"}</span>
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
                                <Button size="sm" onClick={() => handleStartTask(task.id)} className="h-7 px-2" type="button">
                                  <Play className="h-3 w-3" />
                                </Button>
                              )}

                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setMoveToProjectTask({ id: task.id, name: task.name, project_id: task.project_id ?? null }); }} className="h-7 px-2" title="Move to Project" type="button">
                                <FolderOpen className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingTask(task); }} className="h-7 px-2" type="button">
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/alltasks?highlight=${task.id}`); }} className="h-7 px-2" type="button">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setConvertToSubtaskSourceTask({ id: task.id, name: task.name }); }} className="h-7 px-2" title="Convert to Subtask" type="button">
                                <ArrowDownToLine className="h-3 w-3 text-blue-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteTaskMutation.mutate(task.id); }} className="h-7 px-2 text-destructive hover:text-destructive" type="button">
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

  if (!hotProjects || hotProjects.length === 0) return null;

  return (
    <>
      <Card className="w-full">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="px-6 py-4">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <h2 className="text-lg font-semibold">HotProj</h2>
                  <div className="flex items-center gap-1.5 ml-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      id="show-completed-hotproj"
                      checked={showCompleted}
                      onCheckedChange={(checked) => setShowCompleted(checked === true)}
                      className="h-3.5 w-3.5"
                    />
                    <Label htmlFor="show-completed-hotproj" className="text-xs text-muted-foreground cursor-pointer">
                      Show completed
                    </Label>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")} type="button">
                      <List className="h-4 w-4" />
                    </Button>
                    <Button variant={viewMode === "timeline" ? "default" : "outline"} size="sm" onClick={() => setViewMode("timeline")} type="button">
                      <Clock className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-wrap">
                    <Button variant={timeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("all")} type="button">
                      <span className="hidden sm:inline">All</span>
                      <span className="sm:hidden">All</span>
                      <Badge variant="secondary" className="ml-1 sm:ml-2">
                        {filterCounts.all}
                      </Badge>
                    </Button>
                    <Button variant={timeFilter === "yesterday" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("yesterday")} type="button">
                      <span className="hidden sm:inline">Yesterday</span>
                      <span className="sm:hidden">Yest</span>
                      <Badge variant="secondary" className="ml-1 sm:ml-2">
                        {filterCounts.yesterday}
                      </Badge>
                    </Button>
                    <Button variant={timeFilter === "today" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("today")} type="button">
                      <span className="hidden sm:inline">Today</span>
                      <span className="sm:hidden">Tod</span>
                      <Badge variant="secondary" className="ml-1 sm:ml-2">
                        {filterCounts.today}
                      </Badge>
                    </Button>
                    <Button variant={timeFilter === "tomorrow" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("tomorrow")} type="button">
                      <span className="hidden sm:inline">Tomorrow</span>
                      <span className="sm:hidden">Tom</span>
                      <Badge variant="secondary" className="ml-1 sm:ml-2">
                        {filterCounts.tomorrow}
                      </Badge>
                    </Button>
                    <Button variant={timeFilter === "laterThisWeek" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("laterThisWeek")} type="button">
                      <span className="hidden sm:inline">Later This Week</span>
                      <span className="sm:hidden">LTW</span>
                      <Badge variant="secondary" className="ml-1 sm:ml-2">
                        {filterCounts.laterThisWeek}
                      </Badge>
                    </Button>
                    <Button variant={timeFilter === "nextWeek" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("nextWeek")} type="button">
                      <span className="hidden sm:inline">Next Week</span>
                      <span className="sm:hidden">NW</span>
                      <Badge variant="secondary" className="ml-1 sm:ml-2">
                        {filterCounts.nextWeek}
                      </Badge>
                    </Button>
                    <Button
                      variant={assignmentFilter === "assigned" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAssignmentFilter("assigned")}
                      className={assignmentFilter === "assigned" ? "bg-teal-600 hover:bg-teal-700 text-white" : "border-teal-500 text-teal-600 hover:bg-teal-50"}
                      type="button"
                    >
                      <span className="hidden sm:inline">Assigned</span>
                      <span className="sm:hidden">Asgn</span>
                      <Badge variant="secondary" className="ml-1 sm:ml-2">
                        {filterCounts.assigned}
                      </Badge>
                    </Button>
                    <Button
                      variant={assignmentFilter === "unassigned" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAssignmentFilter("unassigned")}
                      className={assignmentFilter === "unassigned" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border-cyan-500 text-cyan-600 hover:bg-cyan-50"}
                      type="button"
                    >
                      <span className="hidden sm:inline">Unassigned</span>
                      <span className="sm:hidden">Unasgn</span>
                      <Badge variant="secondary" className="ml-1 sm:ml-2">
                        {filterCounts.unassigned}
                      </Badge>
                    </Button>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="px-0 sm:px-6 py-6">
              {hotprojProjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button size="sm" variant={selectedProject === "all" ? "default" : "outline"} onClick={() => setSelectedProject("all")} type="button">
                    All Projects
                  </Button>
                  {hotprojProjects.map((projectName) => (
                    <Button
                      key={projectName}
                      size="sm"
                      variant={selectedProject === projectName ? "default" : "outline"}
                      onClick={() => setSelectedProject(projectName)}
                      type="button"
                    >
                      {projectName}
                    </Button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input placeholder="Search tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1" />
                {searchTerm && (
                  <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} type="button">
                    Clear
                  </Button>
                )}
              </div>

              <div className="space-y-4 mt-4">
                {displayedTasks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No HotProj tasks found</div>
                ) : viewMode === "timeline" ? (
                  <TimelineView />
                ) : (
                  <div className="space-y-3">
                    {displayedTasks.map((task: any) => {
                      const activeEntry = (timeEntries || []).find((entry: any) => entry.task_id === task.id);
                      const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");
                      return <SortableTask key={task.id} task={task} activeEntry={activeEntry} isPaused={isPaused} />;
                    })}
                  </div>
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
            queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] });
          }}
          task={editingTask}
          mode="full"
        />
      )}

      <MoveToProjectDialog
        open={!!moveToProjectTask}
        onOpenChange={(open) => {
          if (!open) setMoveToProjectTask(null);
        }}
        taskId={moveToProjectTask?.id || ""}
        taskName={moveToProjectTask?.name}
        currentProjectId={moveToProjectTask?.project_id || null}
        onMoved={() => {
          queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] });
        }}
      />

      <AssignToSlotDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        selectedItems={selectedItemsForWorkload}
        onAssigned={() => {
          setIsAssignDialogOpen(false);
          setSelectedItemsForWorkload([]);
          toast.success("Added to workload");
          queryClient.invalidateQueries({ queryKey: ["workload-assignments"] });
        }}
      />

      <MoveSubtasksDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        selectedSubtasks={selectedSubtasks}
        onSuccess={() => {
          setSelectedSubtasks([]);
          queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] });
        }}
      />

      <ConvertToSubtaskDialog
        open={!!convertToSubtaskSourceTask}
        onOpenChange={(open) => {
          if (!open) setConvertToSubtaskSourceTask(null);
        }}
        sourceTask={convertToSubtaskSourceTask}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["hotproj-tasks"] });
          queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
          queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
          queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
        }}
      />
    </>
  );
};

