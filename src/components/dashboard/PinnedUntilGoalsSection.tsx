import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pin, Search, ChevronDown, ChevronRight, Play, Eye, Pencil, Trash2, Clock, List, CalendarPlus, FolderOpen, X, Check, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import LiveTimer from "./LiveTimer";
import CompactTimerControls from "./CompactTimerControls";
import TaskEditDialog from "@/components/TaskEditDialog";
import SubtaskDialog from "@/components/SubtaskDialog";
import AssignToSlotDialog from "@/components/AssignToSlotDialog";
import { MoveToProjectDialog } from "@/components/MoveToProjectDialog";
import type { Database } from "@/integrations/supabase/types";
import { useUserPins } from "@/hooks/useUserPins";

type TaskStatus = Database["public"]["Enums"]["task_status"];

export const PinnedUntilGoalsSection = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
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

  // Use database-backed pins instead of localStorage
  const { pinnedIds: pinnedProjectIds, togglePin: togglePinProject, isToggling: isTogglingProject } = useUserPins('project');
  const { pinnedIds: pinnedTaskIds, togglePin: togglePinTask, removePin: unpinTask, isToggling: isTogglingTask } = useUserPins('task');

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

  // Fetch pinned tasks with full details
  const { data: pinnedTasks = [] } = useQuery({
    queryKey: ["pinned-goals-tasks", pinnedTaskIds],
    queryFn: async () => {
      if (pinnedTaskIds.length === 0) return [];
      
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
          slot_start_datetime,
          scheduled_time
        `)
        .in("id", pinnedTaskIds);

      if (error) throw error;

      // Enhance tasks with subtasks and project info
      const enhancedTasks = await Promise.all(
        (data || []).map(async (task) => {
          const { data: subtasks } = await supabase
            .from('subtasks')
            .select('id, name, status, deadline, estimated_duration, assignee_id')
            .eq('task_id', task.id)
            .neq('status', 'Completed')
            .order('created_at', { ascending: true });

          const { data: projectData } = await supabase
            .from('projects')
            .select('id, name, service, client_id, clients(name)')
            .eq('id', task.project_id)
            .single();

          // Fetch logged time
          const { data: timeEntries } = await supabase
            .from('time_entries')
            .select('duration_minutes')
            .eq('task_id', task.id)
            .not('end_time', 'is', null);

          const totalLoggedMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;

          return {
            ...task,
            subtasks: subtasks || [],
            project: projectData,
            total_logged_hours: Math.round((totalLoggedMinutes / 60) * 100) / 100,
            subtask_count: (subtasks || []).length
          };
        })
      );

      return enhancedTasks;
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
    return projects.filter(p => projectIds.has(p.id) || pinnedProjectIds.includes(p.id));
  }, [pinnedTasks, projects, pinnedProjectIds]);

  // Filter displayed tasks by selected project
  const displayedTasks = useMemo(() => {
    if (!selectedProjectFilter) return pinnedTasks;
    return pinnedTasks.filter(t => t.project_id === selectedProjectFilter);
  }, [pinnedTasks, selectedProjectFilter]);

  // Note: togglePinProject and togglePinTask are now provided by useUserPins hook

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
    }
  });

  // Quick add task mutation
  const quickAddTaskMutation = useMutation({
    mutationFn: async ({ name, projectId }: { name: string; projectId: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          name,
          project_id: projectId,
          status: "Not Started",
          date: new Date().toISOString().split("T")[0]
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Task added");
      togglePinTask(data.id); // Auto-pin the new task
      setQuickAddTaskName("");
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
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
      queryClient.invalidateQueries({ queryKey: ["runningTasks"] });
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
      queryClient.invalidateQueries({ queryKey: ["runningTasks"] });
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
                  Pinned for Next UntilGoals
                </CardTitle>
                {pinnedTaskIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{pinnedTaskIds.length}</Badge>
                )}
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
                            onCheckedChange={(e) => {
                              // Checkbox handles its own toggle via parent onClick
                            }}
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
                              onCheckedChange={(e) => {
                                // Checkbox handles its own toggle via parent onClick
                              }}
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
                    onClick={() => setSelectedProjectFilter(null)}
                    className="text-xs"
                  >
                    All ({pinnedTasks.length})
                  </Button>
                  {pinnedProjectsFromTasks.map((project: any) => {
                    const count = pinnedTasks.filter(t => t.project_id === project.id).length;
                    return (
                      <Button
                        key={project.id}
                        size="sm"
                        variant={selectedProjectFilter === project.id ? "default" : "outline"}
                        onClick={() => setSelectedProjectFilter(project.id)}
                        className="flex items-center gap-2 text-xs"
                      >
                        {selectedProjectFilter === project.id && <Check className="h-3 w-3" />}
                        {project.name} ({count})
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
                
                {/* Quick Add Task Input - shows when a project is selected */}
                {selectedProjectFilter && (
                  <div className="flex items-center gap-2 mt-3">
                    <Input
                      placeholder="Quick add task to selected project..."
                      value={quickAddTaskName}
                      onChange={(e) => setQuickAddTaskName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && quickAddTaskName.trim() && selectedProjectFilter) {
                          quickAddTaskMutation.mutate({ name: quickAddTaskName.trim(), projectId: selectedProjectFilter });
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (quickAddTaskName.trim() && selectedProjectFilter) {
                          quickAddTaskMutation.mutate({ name: quickAddTaskName.trim(), projectId: selectedProjectFilter });
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

            {/* Pinned Tasks List */}
            {displayedTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Pin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p>No pinned tasks yet</p>
                <p className="text-sm">Search and pin projects or tasks above</p>
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
                            title="Unpin"
                          >
                            <Pin className="h-3 w-3 fill-amber-600" />
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
                        {isShowingSubtasks && task.subtasks && task.subtasks.length > 0 && (
                          <div className="ml-8 mt-2 space-y-1">
                            {task.subtasks.map((subtask: any) => {
                              const subtaskActiveEntry = timeEntries.find(e => e.task_id === subtask.id && e.entry_type === 'subtask');
                              const subtaskIsPaused = subtaskActiveEntry ? parsePauseInfo(subtaskActiveEntry.timer_metadata).isPaused : false;
                              
                              return (
                                <div key={subtask.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                                  <span
                                    className={`w-2 h-2 rounded-full cursor-pointer shrink-0 ${
                                      subtask.status === 'Completed' ? 'bg-green-500' :
                                      subtask.status === 'In Progress' ? 'bg-yellow-500' : 'bg-gray-400'
                                    }`}
                                    onClick={() => handleToggleSubtaskStatus(subtask)}
                                  />
                                  <span className="flex-1 truncate">{subtask.name}</span>
                                  
                                  {/* Subtask Action Buttons */}
                                  <div className="flex items-center gap-1 shrink-0">
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
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleStartSubtask(subtask.id, task.id)}
                                        className="h-6 px-2"
                                        title="Start Timer"
                                      >
                                        <Play className="h-3 w-3" />
                                      </Button>
                                    )}
                                    
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openAssignForSubtask(subtask, task.id)}
                                      className="h-6 px-2"
                                      title="Add to Workload"
                                    >
                                      <CalendarPlus className="h-3 w-3 text-blue-600" />
                                    </Button>
                                    
                                    <Button
                                      size="sm"
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
                                      className="h-6 px-2"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        if (confirm("Delete this subtask?")) {
                                          deleteSubtaskMutation.mutate(subtask.id);
                                        }
                                      }}
                                      className="h-6 px-2 text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
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
            }
          }}
          taskId={moveToProjectTask.id}
          taskName={moveToProjectTask.name}
          currentProjectId={moveToProjectTask.project_id}
          onMoved={() => {
            setMoveToProjectTask(null);
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
          }}
        />
      )}

      <AssignToSlotDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        selectedItems={selectedItemsForWorkload}
        onAssigned={() => {
          setIsAssignDialogOpen(false);
          setSelectedItemsForWorkload([]);
          queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
        }}
      />

      {isSubtaskDialogOpen && editingSubtaskForDialog && (
        <SubtaskDialog
          isOpen={isSubtaskDialogOpen}
          onClose={() => {
            setIsSubtaskDialogOpen(false);
            setEditingSubtaskForDialog(null);
          }}
          taskId={editingSubtaskForDialog.task_id}
          editingSubtask={editingSubtaskForDialog}
          employees={employees}
          onSave={async (data) => {
            // Update subtask via supabase
            const { error } = await supabase
              .from("subtasks")
              .update({
                name: data.name,
                status: data.status,
                deadline: data.deadline || null,
                estimated_duration: data.estimated_duration ? parseInt(data.estimated_duration) : null,
                assignee_id: data.assignee_id || null
              })
              .eq("id", editingSubtaskForDialog.id);
            
            if (error) {
              toast.error("Failed to update subtask");
              return;
            }
            
            toast.success("Subtask updated");
            setIsSubtaskDialogOpen(false);
            setEditingSubtaskForDialog(null);
            queryClient.invalidateQueries({ queryKey: ["pinned-goals-tasks"] });
          }}
        />
      )}
    </Card>
  );
};

export default PinnedUntilGoalsSection;
