import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, Eye, Pencil, Trash2, GripVertical, List, Clock, Plus, CalendarPlus, ChevronDown, ChevronUp, ChevronRight, ArrowRight, Square, CheckSquare, FolderOpen, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
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
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, format } from "date-fns";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type TimeFilter = "all" | "yesterday" | "today" | "tomorrow" | "laterThisWeek" | "nextWeek";
type AssignmentFilter = "all" | "assigned" | "unassigned";

export const HostlistSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("timeline");
  const [searchTerm, setSearchTerm] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [moveToProjectTask, setMoveToProjectTask] = useState<{ id: string; name: string; project_id: string | null } | null>(null);
  const [convertToSubtaskSourceTask, setConvertToSubtaskSourceTask] = useState<{ id: string; name: string } | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedItemsForWorkload, setSelectedItemsForWorkload] = useState<any[]>([]);
  const [showingActionsFor, setShowingActionsFor] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [selectedSubtasks, setSelectedSubtasks] = useState<{ id: string; name: string; task_id: string }[]>([]);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  

  // Render task name with clickable hyperlinks (same behavior as QuickTasksSection)
  const renderTaskName = (name: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = (name || '').split(urlRegex);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8, delay: 200, tolerance: 5 } }),
  );

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

  const { data: tasks } = useQuery({
    queryKey: ["hostlist-tasks", showCompleted],
    queryFn: async () => {
      const statuses: ("On-Head" | "Targeted" | "Imp" | "Completed")[] = showCompleted 
        ? ["On-Head", "Targeted", "Imp", "Completed"] 
        : ["On-Head", "Targeted", "Imp"];
      
      const { data: baseTasks, error } = await supabase
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
        .in("status", statuses)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("deadline", { ascending: true })
        .limit(200);

      if (error) throw error;
      const tasks = baseTasks || [];
      if (tasks.length === 0) return [];

      const taskIds = tasks.map(t => t.id);

      const { data: subtasks } = await supabase
        .from('subtasks')
        .select('id, name, status, deadline, estimated_duration, task_id')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });

      const subtaskIds = (subtasks || []).map(st => st.id);

      const { data: subtaskEntries } = subtaskIds.length > 0 ? await supabase
        .from('time_entries')
        .select('id, duration_minutes, start_time, end_time, comment, entry_type, task_id')
        .in('task_id', subtaskIds)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false }) : { data: [] } as any;

      const { data: taskEntries } = await supabase
        .from('time_entries')
        .select('id, duration_minutes, start_time, end_time, comment, entry_type, task_id')
        .in('task_id', taskIds)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false });

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

      const enhanced = tasks.map(task => {
        const tEntries = taskEntriesByTask[task.id] || [];
        const totalLoggedMinutes = tEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
        const taskSubtasks = (subtasks || []).filter(st => st.task_id === task.id && st.status !== 'Completed');
        const subLoggedMinutes = taskSubtasks.reduce((sum, st) => sum + (subtaskTimeMap[st.id] || 0), 0);
        const totalLoggedHours = Math.round(((totalLoggedMinutes + subLoggedMinutes) / 60) * 100) / 100;
        return {
          ...task,
          time_entries: tEntries,
          subtasks: taskSubtasks.map(st => ({
            ...st,
            logged_minutes: subtaskTimeMap[st.id] || 0,
            logged_hours: Math.round(((subtaskTimeMap[st.id] || 0) / 60) * 100) / 100,
            time_entries: subtaskDetailedEntries[st.id] || []
          })),
          total_logged_hours: totalLoggedHours,
          subtask_count: taskSubtasks.length
        };
      });

      return enhanced;
    },
  });

  // Fetch all tasks for autocomplete suggestions (excluding hostlist statuses)
  const { data: allTasksForSuggestions } = useQuery({
    queryKey: ["all-tasks-for-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`id, name, status, project:projects(name)`)
        .not("status", "in", '("On-Head","Imp","Targeted")')
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!newTaskName.trim() || newTaskName.length < 2 || !allTasksForSuggestions) return [];
    const searchLower = newTaskName.toLowerCase();
    return allTasksForSuggestions
      .filter(task => task.name.toLowerCase().includes(searchLower))
      .slice(0, 10);
  }, [newTaskName, allTasksForSuggestions]);

  // Mutation to add existing task to hostlist
  const addToHostlistMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "On-Head" })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task added to hostlist");
      setNewTaskName("");
      setShowSuggestions(false);
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks-for-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
    },
    onError: () => {
      toast.error("Failed to add task to hostlist");
    },
  });

  const { data: activeEntries } = useQuery({
    queryKey: ["hostlist-task-time-entries"],
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

  const hostlistProjects = useMemo(() => {
    return Array.from(
      new Set(
        (filteredTasks || [])
          .map(task => task.project?.name || (task as any).projects?.name || '')
          .filter(Boolean)
      )
    );
  }, [filteredTasks]);

  const [selectedProject, setSelectedProject] = useState<"all" | string>("all");

  const displayedTasks = useMemo(() => {
    let tasks = filteredTasks;

    // Apply project filter
    if (selectedProject !== "all") {
      tasks = tasks.filter(
        task => (task.project?.name || (task as any).projects?.name) === selectedProject
      );
    }

    // Apply assignment filter
    if (assignmentFilter === "assigned") {
      tasks = tasks.filter(task => task.status === 'Assigned' || !!task.slot_start_datetime || !!task.slot_start_time || !!task.scheduled_time);
    } else if (assignmentFilter === "unassigned") {
      tasks = tasks.filter(task => task.status !== 'Assigned' && !task.slot_start_datetime && !task.slot_start_time && !task.scheduled_time);
    }

    // Apply search filter (including subtasks)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      tasks = tasks.filter(task =>
        task.name.toLowerCase().includes(searchLower) ||
        (task.subtasks || []).some((subtask: any) => subtask.name.toLowerCase().includes(searchLower))
      );
    }

    return tasks;
  }, [filteredTasks, selectedProject, assignmentFilter, searchTerm]);

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
    // Count tasks + their subtasks
    const countWithSubtasks = (taskList: any[]) => {
      return taskList.reduce((count, t) => count + 1 + (t.subtask_count || 0), 0);
    };
    
    const all = countWithSubtasks(tasks);
    const yesterdayTasks = withDeadline.filter(t => inRange(new Date(t.deadline), yesterdayStart, yesterdayEnd));
    const yesterday = countWithSubtasks(yesterdayTasks);
    const todayTasks = withDeadline.filter(t => inRange(new Date(t.deadline), todayStart, todayEnd));
    const today = countWithSubtasks(todayTasks);
    const tomorrowTasks = withDeadline.filter(t => inRange(new Date(t.deadline), tomorrowStart, tomorrowEnd));
    const tomorrow = countWithSubtasks(tomorrowTasks);
    const laterThisWeekTasks = withDeadline.filter(t => {
      const d = new Date(t.deadline);
      return d > tomorrowEnd && d <= thisWeekEnd;
    });
    const laterThisWeek = countWithSubtasks(laterThisWeekTasks);
    const nextWeekTasks = withDeadline.filter(t => inRange(new Date(t.deadline), nextWeekStart, nextWeekEnd));
    const nextWeek = countWithSubtasks(nextWeekTasks);

    // Assignment counts
    const assignedTasks = tasks.filter(t => t.status === 'Assigned' || !!t.slot_start_datetime || !!t.slot_start_time || !!t.scheduled_time);
    const assigned = countWithSubtasks(assignedTasks);
    const unassignedTasks = tasks.filter(t => t.status !== 'Assigned' && !t.slot_start_datetime && !t.slot_start_time && !t.scheduled_time);
    const unassigned = countWithSubtasks(unassignedTasks);

    return { all, yesterday, today, tomorrow, laterThisWeek, nextWeek, assigned, unassigned };
  }, [tasks]);

  const createTaskMutation = useMutation({
    mutationFn: async (taskName: string) => {
      if (!project?.id) throw new Error("Project not found");
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();

      // Choose project: use currently selected filter if set, else default hostlist project
      const projectIdToUse =
        selectedProject === "all"
          ? project.id
          : tasks?.find(
              (t) =>
                (t.project?.name || (t as any).projects?.name) === selectedProject
            )?.project_id || project.id;

      let deadline = null;
      const now = new Date();
      switch (timeFilter) {
        case "yesterday":
          deadline = endOfDay(addDays(now, -1)).toISOString();
          break;
        case "today":
          deadline = endOfDay(now).toISOString();
          break;
        case "tomorrow":
          deadline = endOfDay(addDays(now, 1)).toISOString();
          break;
        case "laterThisWeek":
          deadline = endOfWeek(now).toISOString();
          break;
        case "nextWeek":
          deadline = endOfWeek(addDays(now, 7)).toISOString();
          break;
        default:
          deadline = endOfDay(now).toISOString();
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          name: taskName,
          project_id: projectIdToUse,
          status: "On-Head",
          assigner_id: employee?.id,
          deadline,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Task created successfully");
      setNewTaskName("");
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
    },
    onError: () => {
      toast.error("Failed to create task");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    if (!over || active.id === over.id) return;
    const oldIndex = filteredTasks.findIndex((task) => task.id === active.id);
    const newIndex = filteredTasks.findIndex((task) => task.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reorderedTasks = arrayMove(filteredTasks, oldIndex, newIndex);
    const updatePromises = reorderedTasks.map((task, index) =>
      supabase.from("tasks").update({ sort_order: index }).eq("id", task.id)
    );
    Promise.all(updatePromises).then(() => {
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.target instanceof Element && e.target.closest('.drag-handle')) {
      e.preventDefault();
    }
  };

  // Create subtask mutation at parent level to avoid re-creation on every render
  const createSubtaskMutation = useMutation({
    mutationFn: async ({ taskId, name }: { taskId: string; name: string }) => {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();
      if (!employee) throw new Error("Employee not found");
      const { data, error } = await supabase
        .from("subtasks")
        .insert({ name, task_id: taskId, status: "Not Started", assigner_id: employee.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Subtask created successfully");
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
    },
    onError: () => {
      toast.error("Failed to create subtask");
    },
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
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
    },
    onError: () => {
      toast.error("Failed to update subtask");
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await supabase.from("subtasks").delete().eq("id", subtaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subtask deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
    },
    onError: () => {
      toast.error("Failed to delete subtask");
    },
  });

  const convertSubtaskToTaskMutation = useMutation({
    mutationFn: async ({ subtaskId, subtaskName }: { subtaskId: string; subtaskName: string }) => {
      const { data: subtask, error: subtaskError } = await supabase
        .from("subtasks")
        .select("deadline, status, estimated_duration, assignee_id, task_id")
        .eq("id", subtaskId)
        .single();
      
      if (subtaskError) throw subtaskError;
      
      const { data: parentTask, error: parentError } = await supabase
        .from("tasks")
        .select("project_id")
        .eq("id", subtask.task_id)
        .single();
      
      if (parentError) throw parentError;
      
      const { error: taskError } = await supabase
        .from("tasks")
        .insert({
          name: subtaskName,
          project_id: parentTask.project_id,
          status: subtask?.status === 'Completed' ? 'Completed' : 'On-Head',
          deadline: subtask?.deadline,
          estimated_duration: subtask?.estimated_duration,
          assignee_id: subtask?.assignee_id,
        });
      
      if (taskError) throw taskError;
      
      const { error: deleteError } = await supabase
        .from("subtasks")
        .delete()
        .eq("id", subtaskId);
      
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast.success("Subtask converted to task");
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
    },
    onError: (error) => {
      toast.error("Failed to convert subtask to task");
      console.error(error);
    },
  });

  const SortableTask: React.FC<{ task: any; activeEntry?: any; isPaused?: boolean }> = ({ task, activeEntry, isPaused }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, active } = useSortable({ id: task.id });
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
    const [showSubtasks, setShowSubtasks] = useState<boolean>(() => {
      try {
        const raw = sessionStorage.getItem('hostlist.expandedSubtasks') || '[]';
        const arr = JSON.parse(raw);
        return arr.includes(task.id);
      } catch {
        return false;
      }
    });
    const [newSubtaskName, setNewSubtaskName] = useState("");
    const [showTimeControls, setShowTimeControls] = useState(false);
    const [showTimeHistory, setShowTimeHistory] = useState(false);
    const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
    const [editSubtaskName, setEditSubtaskName] = useState("");

    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 } as any;

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

    const openAssignForTask = (task: any) => {
      const item = { id: task.id, originalId: task.id, type: 'task', itemType: 'task', title: task.name, date: new Date().toISOString().slice(0, 10), client: '', project: '', assigneeId: null, projectId: task.project_id };
      setSelectedItemsForWorkload([item]);
      setIsAssignDialogOpen(true);
    };

    return (
      <div ref={setNodeRef} style={style} className={`select-none ${active?.id === task.id ? 'drag-active' : ''}`}>
        <Card className="p-4 w-full">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div
                key={`drag-handle-${task.id}`}
                {...attributes}
                {...listeners}
                className="drag-handle cursor-grab active:cursor-grabbing p-2 rounded hover:bg-muted/50 transition-all duration-200 select-none"
                role="button"
                aria-label="Drag task"
                style={{ touchAction: 'none' }}
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onTouchEnd={(e) => { e.stopPropagation(); }}
              >
                <GripVertical className="h-5 w-5 text-muted-foreground pointer-events-none transition-transform duration-200" />
              </div>
              <div
                className="flex-1 task-content-area cursor-pointer"
                onClick={() => setShowingActionsFor(showingActionsFor === task.id ? null : task.id)}
              >
                <h3 className="font-medium text-sm sm:text-base break-words">{renderTaskName(task.name)}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                  {(task.project?.name || (task as any).projects?.name) && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      {task.project?.name || (task as any).projects?.name}
                    </span>
                  )}
                  <span 
                    className={`px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-80 ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      task.status === 'Assigned' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {task.status}
                  </span>
                  <span>Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</span>
                  {(task.slot_start_datetime || task.slot_start_time) && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(task.slot_start_datetime || task.slot_start_time).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  )}
                  {task.total_logged_hours > 0 && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {task.total_logged_hours}h logged
                    </span>
                  )}
                  {visibleSubtasks.length > 0 && (
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      {visibleSubtasks.length} subtasks
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(showingActionsFor === task.id || activeEntry) && (
            <div className="mt-2 flex flex-wrap gap-2 justify-start task-content-area">
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowTimeControls(!showTimeControls); }} className="h-8 px-3">
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
                      const raw = sessionStorage.getItem('hostlist.expandedSubtasks') || '[]';
                      const arr = JSON.parse(raw);
                      if (next) {
                        if (!arr.includes(task.id)) arr.push(task.id);
                      } else {
                        const idx = arr.indexOf(task.id);
                        if (idx >= 0) arr.splice(idx, 1);
                      }
                      sessionStorage.setItem('hostlist.expandedSubtasks', JSON.stringify(arr));
                    } catch {}
                    return next;
                  });
                }}
                className="h-8 px-3"
              >
                <List className="h-4 w-4" />
                {visibleSubtasks.length > 0 && (<span className="ml-1 text-xs">{visibleSubtasks.length}</span>)}
              </Button>
              {activeEntry ? (
                <>
                  <div className="flex flex-col items-start gap-1">
                    <LiveTimer startTime={activeEntry.start_time} isPaused={isPaused} timerMetadata={activeEntry.timer_metadata} />
                    <span className="text-xs text-muted-foreground">{isPaused ? "Paused" : "Running"}</span>
                  </div>
                  <CompactTimerControls taskId={task.id} taskName={task.name} entryId={activeEntry.id} timerMetadata={activeEntry.timer_metadata} onTimerUpdate={() => {}} />
                </>
              ) : (
                <Button size="sm" onClick={() => handleStartTask(task.id)} className="h-8 px-3">
                  <Play className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openAssignForTask(task); }} className="h-8 px-3" title="Add to Workload">
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
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingTask(task); }} className="h-8 px-3">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/alltasks?highlight=${task.id}`); }} className="h-8 px-3">
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
              >
                <ArrowDownToLine className="h-4 w-4 text-blue-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteTaskMutation.mutate(task.id); }} className="h-8 px-3 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            )}

            {showTimeControls && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex flex-wrap gap-2">
                  <TimeTrackerWithComment task={{ id: task.id, name: task.name }} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] })} isSubtask={false} />
                  <ManualTimeLog taskId={task.id} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] })} isSubtask={false} />
                </div>
              </div>
            )}

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
                                <Button size="sm" onClick={() => handleSaveSubtask(subtask.id)} disabled={!editSubtaskName.trim()}>Save</Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                              </div>
                            ) : (
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
                                  <p className="text-sm font-medium break-words">{subtask.name}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
                                  <span 
                                    className={`px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-80 ${
                                      subtask.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                      subtask.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                      subtask.status === 'Assigned' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                    onClick={() => handleToggleSubtaskStatus(subtask.id, subtask.status)}
                                  >
                                    {subtask.status}
                                  </span>
                                  {subtask.logged_hours > 0 && (
                                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">{subtask.logged_hours}h</span>
                                  )}
                                  {/* Inline action icons */}
                                  <div className="flex items-center gap-0.5 ml-1">
                                    <TimeTrackerWithComment task={{ id: subtask.id, name: subtask.name }} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] })} isSubtask={true} iconOnly={true} />
                                    <ManualTimeLog taskId={subtask.id} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] })} isSubtask={true} iconOnly={true} />
                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); const item = { id: subtask.id, originalId: task.id, type: 'subtask', itemType: 'subtask', title: subtask.name, date: new Date().toISOString().slice(0, 10), }; setSelectedItemsForWorkload([item]); setIsAssignDialogOpen(true); }} className="h-6 w-6" title="Add to Workload">
                                      <CalendarPlus className="h-3 w-3 text-blue-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditSubtask(subtask.id, subtask.name); }} className="h-6 w-6" title="Edit">
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/alltasks?highlight=${subtask.id}&subtask=true`); }} className="h-6 w-6" title="View">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if (confirm("Convert this subtask to a task?")) {
                                        convertSubtaskToTaskMutation.mutate({ subtaskId: subtask.id, subtaskName: subtask.name });
                                      }
                                    }} className="h-6 w-6" title="Convert to Task">
                                      <ArrowUpFromLine className="h-3 w-3 text-green-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(subtask.id); }} className="h-6 w-6 text-destructive hover:text-destructive" title="Delete">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {subtask.deadline && (
                                    <span className="text-muted-foreground">Due: {new Date(subtask.deadline).toLocaleDateString()}</span>
                                  )}
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

  const { data: timeEntries } = useQuery({
    queryKey: ["hostlist-task-time-entries"],
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

    queryClient.invalidateQueries({ queryKey: ["hostlist-task-time-entries"] });
  };

  // Timeline view component - shows tasks grouped by time (slots or deadlines)
  const TimelineView = () => {
    // Check if any tasks have slot_start_datetime (priority) or slot_start_time
    const tasksWithSlots = displayedTasks.filter(task => task.slot_start_datetime || task.slot_start_time);
    const hasSlotTasks = tasksWithSlots.length > 0;

    // Use slot times if available, otherwise group by deadline time
    const tasksToDisplay = hasSlotTasks ? tasksWithSlots : displayedTasks;

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
        const date = new Date(task.slot_start_datetime).toLocaleDateString('en-GB'); // DD/MM/YYYY format
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time}`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else if (task.slot_start_time) {
        // Fallback: Use slot_start_time if available
        timeValue = new Date(task.slot_start_time);
        const date = new Date(task.slot_start_time).toLocaleDateString('en-GB'); // DD/MM/YYYY format
        const time = formatTimeDisplay(timeValue);
        dateTimeKey = `${date} ${time}`;
        sortableTime = timeValue.getHours() * 60 + timeValue.getMinutes();
      } else if (task.deadline) {
        // Fallback: Use deadline time
        timeValue = new Date(task.deadline);
        const date = new Date(task.deadline).toLocaleDateString('en-GB'); // DD/MM/YYYY format
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
                            Due: {task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB') : "No deadline"}
                          </p>
                          {(task.slot_start_datetime || task.slot_start_time) && (
                            <p className="text-xs text-muted-foreground">
                              Slot: {new Date(task.slot_start_datetime || task.slot_start_time).toLocaleDateString('en-GB')} {new Date(task.slot_start_datetime || task.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                              deleteTaskMutation.mutate(task.id);
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

  return (
    <>
      <Card className="w-full">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="px-6 py-4">
            <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <h2 className="text-lg font-semibold">Hostlist</h2>
                  <div className="flex items-center gap-1.5 ml-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      id="show-completed-hostlist" 
                      checked={showCompleted} 
                      onCheckedChange={(checked) => setShowCompleted(checked === true)}
                      className="h-3.5 w-3.5"
                    />
                    <Label htmlFor="show-completed-hostlist" className="text-xs text-muted-foreground cursor-pointer">
                      Show completed
                    </Label>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
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
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
        <CollapsibleContent>
          <CardContent className="px-0 sm:px-6 py-6">
            {hostlistProjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  size="sm"
                  variant={selectedProject === "all" ? "default" : "outline"}
                  onClick={() => setSelectedProject("all")}
                >
                  All Projects
                </Button>
                {hostlistProjects.map(projectName => (
                  <Button
                    key={projectName}
                    size="sm"
                    variant={selectedProject === projectName ? "default" : "outline"}
                    onClick={() => setSelectedProject(projectName)}
                  >
                    {projectName}
                  </Button>
                ))}
              </div>
            )}

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

            <div className="space-y-4">
              <div className="relative">
                <form onSubmit={(e) => { e.preventDefault(); if (newTaskName.trim()) createTaskMutation.mutate(newTaskName.trim()); }} className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      placeholder="Add or search task..." 
                      value={newTaskName} 
                      onChange={(e) => {
                        setNewTaskName(e.target.value);
                        setShowSuggestions(true);
                        setSelectedSuggestionIndex(-1);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (filteredSuggestions.length > 0 && showSuggestions) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setSelectedSuggestionIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setSelectedSuggestionIndex(prev => Math.max(prev - 1, -1));
                          } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                            e.preventDefault();
                            addToHostlistMutation.mutate(filteredSuggestions[selectedSuggestionIndex].id);
                          }
                        }
                      }}
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredSuggestions.map((task, index) => (
                          <div
                            key={task.id}
                            className={`px-3 py-2 cursor-pointer hover:bg-muted text-sm ${
                              index === selectedSuggestionIndex ? 'bg-muted' : ''
                            }`}
                            onMouseDown={() => addToHostlistMutation.mutate(task.id)}
                          >
                            <div className="font-medium truncate">{task.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {(task.project as any)?.name || 'No project'} • {task.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button type="submit" disabled={!newTaskName.trim()}>Add</Button>
                </form>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hostlist tasks found</div>
              ) : viewMode === "timeline" ? (
                <TimelineView />
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filteredTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {displayedTasks.map((task) => {
                        const activeEntry = timeEntries?.find((entry) => entry.task_id === task.id);
                        const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");
                        return (
                          <SortableTask key={task.id} task={task} activeEntry={activeEntry} isPaused={isPaused} />
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
          onClose={() => { setEditingTask(null); queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] }); }}
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
          queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
        }}
      />
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
          queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
        }}
      />

      <ConvertToSubtaskDialog
        open={!!convertToSubtaskSourceTask}
        onOpenChange={(open) => {
          if (!open) setConvertToSubtaskSourceTask(null);
        }}
        sourceTask={convertToSubtaskSourceTask}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
          queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
          queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
        }}
      />
    </>
  );
}
