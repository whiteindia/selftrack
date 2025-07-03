import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Building, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import LiveTimer from '@/components/dashboard/LiveTimer';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Task {
  id: string;
  name: string;
  status: string;
  deadline?: string;
  estimated_duration?: number;
  hours: number;
  assignee?: {
    name: string;
  };
  assigner?: {
    name: string;
  };
  project_name?: string;
  project_id?: string;
}

interface TaskKanbanProps {
  tasks: Task[];
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onTaskStatusChange: (taskId: string, newStatus: string) => void;
  onAddTask?: () => void;
  showTaskSelection?: boolean;
  onCreateSprint?: (selectedTaskIds: string[], projectId?: string) => void;
  collapsibleColumns?: boolean;
  statusOrder?: string[];
}

const TaskKanban: React.FC<TaskKanbanProps> = ({ 
  tasks, 
  canCreate = false,
  canUpdate = false,
  canDelete = false,
  onTaskStatusChange,
  onAddTask,
  showTaskSelection = false,
  onCreateSprint,
  collapsibleColumns = false,
  statusOrder
}) => {
  const isMobile = useIsMobile();
  const [runningTasks, setRunningTasks] = useState<Record<string, any>>({});
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  
  const defaultStatuses = [
    'Not Started',
    'In Progress', 
    'Completed',
    'Won',
    'Lost',
    'On Hold',
    'On-Head',
    'Targeted',
    'Imp',
    'Overdue'
  ];

  const statuses = statusOrder || defaultStatuses;

  // Fetch running tasks for timer display
  useEffect(() => {
    const fetchRunningTasks = async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, start_time, task_id, comment')
        .is('end_time', null);
      
      if (data) {
        const runningTasksMap = data.reduce((acc, entry) => {
          acc[entry.task_id] = entry;
          return acc;
        }, {} as Record<string, any>);
        setRunningTasks(runningTasksMap);
      }
    };

    fetchRunningTasks();

    // Set up real-time subscription
    const channel = supabase
      .channel('kanban_time_entries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries'
        },
        () => {
          fetchRunningTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check if timer is paused based on comment
  const isPaused = (entry: any) => {
    if (!entry.comment) return false;
    
    const hasPause = entry.comment.includes('Timer paused at');
    const hasResume = entry.comment.includes('Timer resumed at');
    
    if (!hasPause) return false;
    
    if (hasPause && hasResume) {
      const pauseMatches = entry.comment.match(/Timer paused at ([^,\n]+)/g);
      const resumeMatches = entry.comment.match(/Timer resumed at ([^,\n]+)/g);
      
      if (pauseMatches && resumeMatches) {
        const latestPause = pauseMatches[pauseMatches.length - 1];
        const latestResume = resumeMatches[resumeMatches.length - 1];
        
        const pauseTimeMatch = latestPause.match(/at ([^,\n]+)/);
        const resumeTimeMatch = latestResume.match(/at ([^,\n]+)/);
        
        if (pauseTimeMatch && resumeTimeMatch) {
          const pauseTime = new Date(pauseTimeMatch[1]);
          const resumeTime = new Date(resumeTimeMatch[1]);
          return pauseTime > resumeTime;
        }
      }
    }
    
    return hasPause && !hasResume;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Won':
        return 'bg-emerald-100 text-emerald-800';
      case 'Lost':
        return 'bg-red-100 text-red-800';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'On-Head':
        return 'bg-purple-100 text-purple-800';
      case 'Targeted':
        return 'bg-orange-100 text-orange-800';
      case 'Imp':
        return 'bg-red-100 text-red-800';
      case 'Overdue':
        return 'bg-red-600 text-white font-bold animate-pulse';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks(prev => [...prev, taskId]);
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleCreateSprintClick = () => {
    if (selectedTasks.length === 0) return;
    
    // Get the project ID from the first selected task
    const firstSelectedTask = tasks.find(task => selectedTasks.includes(task.id));
    const projectId = firstSelectedTask?.project_id;
    
    if (onCreateSprint) {
      onCreateSprint(selectedTasks, projectId);
    }
  };

  const toggleColumnCollapse = (status: string) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  // Filter tasks that can be added to sprint (Not Started, On-Head, Targeted, Imp)
  const sprintEligibleTasks = tasks.filter(task => 
    ['Not Started', 'On-Head', 'Targeted', 'Imp'].includes(task.status)
  );

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!canUpdate) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canUpdate) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    if (!canUpdate) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    onTaskStatusChange(taskId, status);
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="space-y-6">
      {/* Task Selection Actions */}
      {showTaskSelection && (
        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              Select tasks for sprint creation ({selectedTasks.length} selected)
            </span>
            {selectedTasks.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTasks([])}
              >
                Clear Selection
              </Button>
            )}
          </div>
          {selectedTasks.length > 0 && (
            <Button onClick={handleCreateSprintClick}>
              Create Sprint ({selectedTasks.length} tasks)
            </Button>
          )}
        </div>
      )}

      {/* Add Task Button */}
      {canCreate && onAddTask && (
        <div className="flex justify-end">
          <Button onClick={onAddTask}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        {statuses.map((status) => (
          <div
            key={status}
            className="space-y-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            {collapsibleColumns ? (
              <Collapsible 
                open={!collapsedColumns[status]} 
                onOpenChange={() => toggleColumnCollapse(status)}
              >
                <Card className="min-h-[200px]">
                  <CardHeader className="pb-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="flex items-center justify-between w-full p-0 h-auto">
                        <CardTitle className="flex items-center justify-between text-sm w-full">
                          <span className="truncate">{status}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={`${getStatusColor(status)} text-xs`}>
                              {getTasksByStatus(status).length}
                            </Badge>
                            {collapsedColumns[status] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </div>
                        </CardTitle>
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                      {getTasksByStatus(status).map((task) => {
                        const runningEntry = runningTasks[task.id];
                        const isRunning = !!runningEntry;
                        const paused = isRunning && isPaused(runningEntry);
                        const canSelectForSprint = showTaskSelection && ['Not Started', 'On-Head', 'Targeted', 'Imp'].includes(task.status);
                        
                        return (
                          <Card
                            key={task.id}
                            className={`${canUpdate ? 'cursor-move' : 'cursor-default'} hover:shadow-md transition-shadow border-l-4 ${
                              isRunning ? (paused ? 'border-l-yellow-500' : 'border-l-green-500') : 'border-l-blue-500'
                            }`}
                            draggable={canUpdate}
                            onDragStart={(e) => handleDragStart(e, task.id)}
                          >
                            <CardContent className="p-3 space-y-2">
                              {/* Task Selection Checkbox */}
                              {canSelectForSprint && (
                                <div className="flex items-center space-x-2 mb-2">
                                  <Checkbox
                                    id={`task-${task.id}`}
                                    checked={selectedTasks.includes(task.id)}
                                    onCheckedChange={(checked) => handleTaskSelection(task.id, checked as boolean)}
                                  />
                                  <label
                                    htmlFor={`task-${task.id}`}
                                    className="text-xs text-gray-600 cursor-pointer"
                                  >
                                    Select for sprint
                                  </label>
                                </div>
                              )}
                              
                              {/* Task Name */}
                              <h4 className="font-medium text-sm break-words line-clamp-2">{task.name}</h4>
                              
                              {/* Project Info */}
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Building className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{task.project_name || 'No Project'}</span>
                              </div>

                              {/* Timer Display */}
                              {isRunning && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                  <LiveTimer 
                                    startTime={runningEntry.start_time}
                                    isPaused={paused}
                                  />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      {getTasksByStatus(status).length === 0 && (
                        <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                          <p className="text-xs">No tasks</p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ) : (
              <Card className="min-h-[200px]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="truncate">{status}</span>
                    <Badge variant="secondary" className={`${getStatusColor(status)} text-xs`}>
                      {getTasksByStatus(status).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getTasksByStatus(status).map((task) => {
                    const runningEntry = runningTasks[task.id];
                    const isRunning = !!runningEntry;
                    const paused = isRunning && isPaused(runningEntry);
                    const canSelectForSprint = showTaskSelection && ['Not Started', 'On-Head', 'Targeted', 'Imp'].includes(task.status);
                    
                    return (
                      <Card
                        key={task.id}
                        className={`${canUpdate ? 'cursor-move' : 'cursor-default'} hover:shadow-md transition-shadow border-l-4 ${
                          isRunning ? (paused ? 'border-l-yellow-500' : 'border-l-green-500') : 'border-l-blue-500'
                        }`}
                        draggable={canUpdate}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                      >
                        <CardContent className="p-3 space-y-2">
                          {/* Task Selection Checkbox */}
                          {canSelectForSprint && (
                            <div className="flex items-center space-x-2 mb-2">
                              <Checkbox
                                id={`task-${task.id}`}
                                checked={selectedTasks.includes(task.id)}
                                onCheckedChange={(checked) => handleTaskSelection(task.id, checked as boolean)}
                              />
                              <label
                                htmlFor={`task-${task.id}`}
                                className="text-xs text-gray-600 cursor-pointer"
                              >
                                Select for sprint
                              </label>
                            </div>
                          )}
                          
                          {/* Task Name */}
                          <h4 className="font-medium text-sm break-words line-clamp-2">{task.name}</h4>
                          
                          {/* Project Info */}
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Building className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{task.project_name || 'No Project'}</span>
                          </div>

                          {/* Timer Display */}
                          {isRunning && (
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <LiveTimer 
                                startTime={runningEntry.start_time}
                                isPaused={paused}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {getTasksByStatus(status).length === 0 && (
                    <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-xs">No tasks</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>

      {/* No Permission Message */}
      {!canCreate && !canUpdate && !canDelete && (
        <div className="text-center py-8">
          <p className="text-gray-600">You don't have permission to create tasks.</p>
        </div>
      )}
    </div>
  );
};

export default TaskKanban;
