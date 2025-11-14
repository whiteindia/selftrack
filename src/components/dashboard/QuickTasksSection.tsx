import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Eye, Pencil, Trash2, ArrowUp, ArrowDown, Clock, List, Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import LiveTimer from "./LiveTimer";
import CompactTimerControls from "./CompactTimerControls";
import TaskEditDialog from "@/components/TaskEditDialog";
import EnhancedTaskTimeline from "./EnhancedTaskTimeline";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "date-fns";

type TimeFilter = "all" | "today" | "tomorrow" | "laterThisWeek" | "nextWeek";

export const QuickTasksSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [newTaskName, setNewTaskName] = useState("");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>("timeline");

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

  // Fetch tasks from the project
  const { data: tasks, refetch } = useQuery({
    queryKey: ["quick-tasks", project?.id],
    queryFn: async () => {
      if (!project?.id) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          name,
          deadline,
          status,
          project_id,
          reminder_datetime,
          slot_start_time,
          sort_order
        `)
        .eq("project_id", project.id)
        .neq("status", "Completed")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("deadline", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!project?.id,
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

    // Sort logic
    // 1. Custom sort_order takes priority
    // 2. For "all" filter: sort by date (most recent first), then by nearest reminder/slot time
    const sorted = [...filtered].sort((a, b) => {
      // Priority 1: Custom sort order (lower numbers first, nulls last)
      if (a.sort_order !== null && b.sort_order !== null) {
        return a.sort_order - b.sort_order;
      }
      if (a.sort_order !== null) return -1;
      if (b.sort_order !== null) return 1;

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
          const times = [];
          if (task.reminder_datetime) {
            times.push(new Date(task.reminder_datetime).getTime());
          }
          if (task.slot_start_time) {
            times.push(new Date(task.slot_start_time).getTime());
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
  }, [tasks, timeFilter]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskName: string) => {
      if (!project?.id) throw new Error("Project not found");
      
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();

      // Calculate deadline based on time filter
      let deadline = null;
      const now = new Date();
      
      switch (timeFilter) {
        case "today":
          deadline = endOfDay(now).toISOString();
          break;
        case "tomorrow":
          deadline = endOfDay(addDays(now, 1)).toISOString();
          break;
        case "laterThisWeek":
          // Set deadline for end of this week
          deadline = endOfWeek(now).toISOString();
          break;
        case "nextWeek":
          // Set deadline for end of next week
          deadline = endOfWeek(addDays(now, 7)).toISOString();
          break;
        default:
          // For "all" filter, set deadline to today
          deadline = endOfDay(now).toISOString();
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          name: taskName,
          project_id: project.id,
          status: "Not Started",
          assigner_id: employee?.id,
          deadline: deadline,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Task created successfully");
      setNewTaskName("");
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
    },
    onError: (error) => {
      toast.error("Failed to create task");
      console.error(error);
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
    },
    onError: (error) => {
      toast.error("Failed to delete task");
      console.error(error);
    },
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
    },
    onError: (error) => {
      toast.error("Failed to reorder task");
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

    // Update task status to In Progress
    await supabase
      .from("tasks")
      .update({ status: "In Progress" })
      .eq("id", taskId);

    // Create time entry
    await supabase.from("time_entries").insert({
      task_id: taskId,
      employee_id: employee.id,
      entry_type: "task",
      start_time: new Date().toISOString(),
    });

    refetch();
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim()) {
      createTaskMutation.mutate(newTaskName.trim());
    }
  };

  // Function to render task name with clickable links
  const renderTaskName = (name: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = name.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
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

  if (!project || !tasks || tasks.length === 0) return null;

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quick Tasks</h2>
            <div className="flex gap-2 items-center">
              {/* View mode toggle */}
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none border-r"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "timeline" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("timeline")}
                  className="rounded-none"
                >
                  <Clock3 className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Time filter buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={timeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={timeFilter === "today" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("today")}
                >
                  Today
                </Button>
                <Button
                  variant={timeFilter === "tomorrow" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("tomorrow")}
                >
                  Tomorrow
                </Button>
                <Button
                  variant={timeFilter === "laterThisWeek" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("laterThisWeek")}
                >
                  Later This Week
                </Button>
                <Button
                  variant={timeFilter === "nextWeek" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("nextWeek")}
                >
                  Next Week
                </Button>
              </div>
            </div>
          </div>

          {/* Quick add task input */}
          <form onSubmit={handleCreateTask} className="flex gap-2">
            <Input
              placeholder="Add a quick task..."
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!newTaskName.trim() || createTaskMutation.isPending}>
              Add
            </Button>
          </form>

          {filteredTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks for this time period</p>
          ) : viewMode === 'timeline' ? (
            <EnhancedTaskTimeline
              tasks={filteredTasks}
              timeFilter={timeFilter}
              timeEntries={timeEntries}
              onTaskClick={(taskId) => {
                window.location.href = `/alltasks?highlight=${taskId}`;
              }}
              onDragEnd={async (event) => {
                const { active, over } = event;
                if (!active || !over || active.id === over.id) return;

                // Get the current task and the task it's being dropped over
                const activeTask = filteredTasks.find(t => t.id === active.id);
                const overTask = filteredTasks.find(t => t.id === over.id);
                
                if (!activeTask || !overTask) return;

                // Calculate new sort order based on the over task
                const activeIndex = filteredTasks.findIndex(t => t.id === active.id);
                const overIndex = filteredTasks.findIndex(t => t.id === over.id);
                
                // Determine the new sort order
                let newSortOrder;
                if (activeIndex < overIndex) {
                  // Moving down: place after the over task
                  newSortOrder = (overTask.sort_order ?? overIndex) + 1;
                } else {
                  // Moving up: place before the over task
                  newSortOrder = (overTask.sort_order ?? overIndex);
                }

                try {
                  // Update the task's sort order
                  const { error } = await supabase
                    .from("tasks")
                    .update({ sort_order: newSortOrder })
                    .eq("id", active.id);

                  if (error) throw error;
                  
                  // Refresh the tasks
                  queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
                  toast.success("Task reordered successfully");
                } catch (error) {
                  console.error("Failed to reorder task:", error);
                  toast.error("Failed to reorder task");
                }
              }}
            />
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const activeEntry = timeEntries?.find((entry) => entry.task_id === task.id);
                const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");

                return (
                  <Card key={task.id} className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveTaskMutation.mutate({ taskId: task.id, direction: "up" })}
                            disabled={filteredTasks.indexOf(task) === 0 || moveTaskMutation.isPending}
                            title="Move up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveTaskMutation.mutate({ taskId: task.id, direction: "down" })}
                            disabled={filteredTasks.indexOf(task) === filteredTasks.length - 1 || moveTaskMutation.isPending}
                            title="Move down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h3 className="font-medium text-sm sm:text-base break-words">{renderTaskName(task.name)}</h3>
                          <p className="text-sm text-muted-foreground">
                            Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}
                          </p>
                          {(task.reminder_datetime || task.slot_start_time) && (
                            <p className="text-xs text-muted-foreground break-words">
                              {task.reminder_datetime && `Reminder: ${new Date(task.reminder_datetime).toLocaleString()}`}
                              {task.reminder_datetime && task.slot_start_time && " | "}
                              {task.slot_start_time && `Slot: ${new Date(task.slot_start_time).toLocaleString()}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 ml-10 md:ml-0 flex-wrap">
                        {!activeEntry && (
                          <Button
                            size="sm"
                            onClick={() => handleStartTask(task.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTask(task)}
                          title="Edit task"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = `/alltasks?highlight=${task.id}`;
                          }}
                          title="View task details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          disabled={deleteTaskMutation.isPending}
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </>
  );
};
