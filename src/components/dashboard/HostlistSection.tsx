import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Pencil, Trash2, GripVertical, List, Clock, Plus, CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import LiveTimer from "./LiveTimer";
import CompactTimerControls from "./CompactTimerControls";
import TaskEditDialog from "@/components/TaskEditDialog";
import TimeTrackerWithComment from "@/components/TimeTrackerWithComment";
import ManualTimeLog from "@/components/ManualTimeLog";
import AssignToSlotDialog from "@/components/AssignToSlotDialog";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "date-fns";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type TimeFilter = "all" | "yesterday" | "today" | "tomorrow" | "laterThisWeek" | "nextWeek";

export const HostlistSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [newTaskName, setNewTaskName] = useState("");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedItemsForWorkload, setSelectedItemsForWorkload] = useState<any[]>([]);
  

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
    queryKey: ["hostlist-tasks"],
    queryFn: async () => {
      const { data: baseTasks, error } = await supabase
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
          sort_order
        `)
        .or(
          [
            "status.eq.On-Head",
            "status.eq.Targeted",
            "status.eq.Imp",
            "status.eq.on-head",
            "status.eq.targeted",
            "status.eq.imp",
            "status.eq.On Head",
            "status.eq.Important"
          ].join(",")
        )
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("deadline", { ascending: true })
        .limit(100);

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
        const taskSubtasks = (subtasks || []).filter(st => st.task_id === task.id);
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
      if (a.sort_order !== null && b.sort_order !== null) return a.sort_order - b.sort_order;
      if (a.sort_order !== null) return -1;
      if (b.sort_order !== null) return 1;
      const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return dateA - dateB;
    });

    return sorted;
  }, [tasks, timeFilter]);

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

    return { all, yesterday, today, tomorrow, laterThisWeek, nextWeek };
  }, [tasks]);

  const createTaskMutation = useMutation({
    mutationFn: async (taskName: string) => {
      if (!project?.id) throw new Error("Project not found");
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();

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
          project_id: project.id,
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

  const SortableTask: React.FC<{ task: any; activeEntry?: any; isPaused?: boolean }> = ({ task, activeEntry, isPaused }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, active } = useSortable({ id: task.id });
    const [showSubtasks, setShowSubtasks] = useState(false);
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

    const handleStartTask = async (taskId: string) => {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();
      if (!employee) return;
      await supabase.from("time_entries").insert({ task_id: taskId, employee_id: employee.id, entry_type: "task", start_time: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ["hostlist-task-time-entries"] });
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
              <div className="flex-1 task-content-area">
                <h3 className="font-medium text-sm sm:text-base break-words">{task.name}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span 
                    className={`px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-80 ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {task.status}
                  </span>
                  <span>Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</span>
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

            <div className="mt-2 flex flex-wrap gap-2 justify-start task-content-area">
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowTimeControls(!showTimeControls); }} className="h-8 px-3">
                <Clock className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }} className="h-8 px-3">
                <List className="h-4 w-4" />
                {task.subtask_count > 0 && (<span className="ml-1 text-xs">{task.subtask_count}</span>)}
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
                <CalendarPlus className="h-4 w-4 text-blue-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingTask(task); }} className="h-8 px-3">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/alltasks?highlight=${task.id}`); }} className="h-8 px-3">
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteTaskMutation.mutate(task.id); }} className="h-8 px-3 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

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
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <Input placeholder="Add subtask..." value={newSubtaskName} onChange={(e) => setNewSubtaskName(e.target.value)} className="flex-1 text-sm h-8" />
                  <Button type="submit" size="sm" disabled={!newSubtaskName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>

                {task.subtasks && task.subtasks.length > 0 ? (
                  <div className="space-y-3">
                    {task.subtasks.map((subtask: any) => (
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
                                <p className="text-sm font-medium break-words">{subtask.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <span 
                                    className={`px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-80 ${
                                      subtask.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                      subtask.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                    onClick={() => handleToggleSubtaskStatus(subtask.id, subtask.status)}
                                  >
                                    {subtask.status}
                                  </span>
                                  {subtask.logged_hours > 0 && (
                                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">{subtask.logged_hours}h logged</span>
                                  )}
                                  {subtask.deadline && (
                                    <span>Due: {new Date(subtask.deadline).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="mt-2 sm:mt-0 flex flex-wrap gap-2 justify-start sm:justify-end">
                            <TimeTrackerWithComment task={{ id: subtask.id, name: subtask.name }} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] })} isSubtask={true} />
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); const item = { id: subtask.id, originalId: task.id, type: 'subtask', itemType: 'subtask', title: subtask.name, date: new Date().toISOString().slice(0, 10), }; setSelectedItemsForWorkload([item]); setIsAssignDialogOpen(true); }} className="h-8 px-3" title="Add subtask to Workload">
                              <CalendarPlus className="h-3 w-3 text-blue-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditSubtask(subtask.id, subtask.name); }} className="h-8 px-3">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/alltasks?highlight=${subtask.id}&subtask=true`); }} className="h-8 px-3">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(subtask.id); }} className="h-8 px-3 text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
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

  if (!tasks || tasks.length === 0) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Hostlist</h2>
          </div>
          <div className="text-sm text-muted-foreground">No hostlist tasks found</div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Hostlist</h2>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex gap-1">
                <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
                  <List className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === "timeline" ? "default" : "outline"} size="sm" onClick={() => setViewMode("timeline")}>
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant={timeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("all")}>All<Badge variant="secondary" className="ml-2">{filterCounts.all}</Badge></Button>
                <Button variant={timeFilter === "yesterday" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("yesterday")}>Yesterday<Badge variant="secondary" className="ml-2">{filterCounts.yesterday}</Badge></Button>
                <Button variant={timeFilter === "today" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("today")}>Today<Badge variant="secondary" className="ml-2">{filterCounts.today}</Badge></Button>
                <Button variant={timeFilter === "tomorrow" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("tomorrow")}>Tomorrow<Badge variant="secondary" className="ml-2">{filterCounts.tomorrow}</Badge></Button>
                <Button variant={timeFilter === "laterThisWeek" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("laterThisWeek")}>Later This Week<Badge variant="secondary" className="ml-2">{filterCounts.laterThisWeek}</Badge></Button>
                <Button variant={timeFilter === "nextWeek" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("nextWeek")}>Next Week<Badge variant="secondary" className="ml-2">{filterCounts.nextWeek}</Badge></Button>
              </div>
            </div>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); if (newTaskName.trim()) createTaskMutation.mutate(newTaskName.trim()); }} className="flex gap-2">
            <Input placeholder="Add a host task..." value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} className="flex-1" />
            <Button type="submit" disabled={!newTaskName.trim()}>Add</Button>
          </form>

          {viewMode === "timeline" ? (
            <div className="text-sm text-muted-foreground">Timeline view coming soon</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {filteredTasks.map((task) => {
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
      </Card>

      {editingTask && (
        <TaskEditDialog
          isOpen={!!editingTask}
          onClose={() => { setEditingTask(null); queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] }); }}
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
    </>
  );
}
