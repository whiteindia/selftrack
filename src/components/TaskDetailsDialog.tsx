import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  User, 
  Building, 
  MessageSquare, 
  Play, 
  Bell, 
  CalendarClock,
  Edit,
  Trash2,
  Plus,
  Filter,
  ChevronDown,
  LayoutList,
  Kanban,
  Check,
  X,
  Eye,
  Timer
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { formatToIST } from '@/utils/timezoneUtils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useTimeEntryCount } from '@/hooks/useTimeEntryCount';
import TaskTimer from '@/components/TaskTimer';
import TimeTrackerWithComment from '@/components/TimeTrackerWithComment';
import ManualTimeLog from '@/components/ManualTimeLog';
import TaskHistory from '@/components/TaskHistory';
import SubtaskCard from '@/components/SubtaskCard';
import SubtaskDialog from '@/components/SubtaskDialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface TaskDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onTimeUpdate?: () => void;
}

interface Task {
  id: string;
  name: string;
  status: string;
  hours: number;
  date: string;
  deadline: string | null;
  estimated_duration: number | null;
  completion_date: string | null;
  assignee_id: string | null;
  assigner_id: string | null;
  project_id: string;
  project_name: string | null;
  project_service: string | null;
  client_name: string | null;
  reminder_datetime: string | null;
  slot_start_datetime: string | null;
  slot_end_datetime: string | null;
  assignee: {
    name: string;
  } | null;
  assigner: {
    name: string;
  } | null;
  total_logged_hours?: number;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

const TaskDetailsDialog: React.FC<TaskDetailsDialogProps> = ({ 
  isOpen, 
  onClose, 
  taskId, 
  onTimeUpdate 
}) => {
  const { user, userRole } = useAuth();
  const { hasOperationAccess } = usePrivileges();
  const queryClient = useQueryClient();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<any>(null);
  const [showTimeEntries, setShowTimeEntries] = useState(false);

  // Fetch task details
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['task-details', taskId],
    queryFn: async () => {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:employees!assignee_id (
            name
          ),
          assigner:employees!assigner_id (
            name
          )
        `)
        .eq('id', taskId)
        .single();

      if (taskError) {
        throw taskError;
      }

      // Get project information
      const { data: projectData } = await supabase
        .rpc('get_project_info_for_task', { 
          project_uuid: taskData.project_id 
        });

      // Calculate total logged hours
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('task_id', taskId)
        .not('end_time', 'is', null);

      if (timeError) {
        console.error('Error fetching time entries:', timeError);
      }

      const totalMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

      const projectInfo = projectData?.[0];

      return {
        ...taskData,
        project_name: projectInfo?.name || null,
        project_service: projectInfo?.service || null,
        client_name: projectInfo?.client_name || null,
        total_logged_hours: totalHours
      } as Task;
    },
    enabled: !!taskId && isOpen
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email')
        .order('name');
      if (error) throw error;
      return data as Employee[];
    },
    enabled: isOpen
  });

  // Fetch time entries for detailed view
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['task-time-entries', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          employee:employees!employee_id (
            name
          )
        `)
        .eq('task_id', taskId)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!taskId && isOpen && showTimeEntries
  });

  // Use subtasks hook
  const { subtasks, createSubtaskMutation, updateSubtaskMutation, deleteSubtaskMutation } = useSubtasks(taskId);

  const handleSubtaskStatusChange = (subtaskId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'Completed') {
      updates.completion_date = new Date().toISOString();
    } else if (newStatus !== 'Completed') {
      updates.completion_date = null;
    }
    updateSubtaskMutation.mutate({ id: subtaskId, updates });
  };

  const handleCreateSubtask = () => {
    setEditingSubtask(null);
    setSubtaskDialogOpen(true);
  };

  const handleEditSubtask = (subtask: any) => {
    setEditingSubtask(subtask);
    setSubtaskDialogOpen(true);
  };

  const handleSubtaskSave = (subtaskData: any) => {
    if (editingSubtask) {
      updateSubtaskMutation.mutate({ 
        id: editingSubtask.id, 
        updates: {
          name: subtaskData.name,
          status: subtaskData.status,
          assignee_id: subtaskData.assignee_id,
          deadline: subtaskData.deadline,
          estimated_duration: subtaskData.estimated_duration
        }
      });
    } else {
      createSubtaskMutation.mutate({
        name: subtaskData.name,
        status: subtaskData.status,
        assignee_id: subtaskData.assignee_id,
        deadline: subtaskData.deadline,
        estimated_duration: subtaskData.estimated_duration,
        task_id: taskId
      });
    }
    setSubtaskDialogOpen(false);
    setEditingSubtask(null);
  };

  const handleTimeUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['task-details', taskId] });
    queryClient.invalidateQueries({ queryKey: ['task-time-entries', taskId] });
    onTimeUpdate?.();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'On-Head': return 'bg-purple-100 text-purple-800';
      case 'Targeted': return 'bg-orange-100 text-orange-800';
      case 'Imp': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isTaskOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    const now = new Date();
    const taskDeadline = new Date(deadline);
    return taskDeadline.getTime() < now.getTime();
  };

  const calculateSlotDuration = (startDateTime: string | null, endDateTime: string | null) => {
    if (!startDateTime || !endDateTime) return null;
    
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const diffMs = end.getTime() - start.getTime();
    
    if (diffMs <= 0) return null;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  if (taskLoading || !task) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="text-lg">Loading task details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isOverdue = isTaskOverdue(task.deadline);
  const slotDuration = calculateSlotDuration(task.slot_start_datetime, task.slot_end_datetime);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold break-words">
                  {task.name}
                  {isOverdue && (
                    <Badge className="ml-2 bg-red-600 text-white font-bold animate-pulse">
                      OVERDUE
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Task details and management
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Task Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LayoutList className="h-4 w-4" />
                  Task Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Project:</span>
                      <span>{task.project_name || 'No Project'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Assignee:</span>
                      <span>{task.assignee?.name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Assigner:</span>
                      <span>{task.assigner?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Status:</span>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Created:</span>
                      <span>{format(new Date(task.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Logged Time:</span>
                      <span>{task.total_logged_hours?.toFixed(2) || '0.00'} hours</span>
                    </div>
                  </div>
                </div>

                {/* Deadline and Duration */}
                {task.deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Deadline:</span>
                    <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                      {format(new Date(task.deadline), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}

                {task.estimated_duration && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Estimated Duration:</span>
                    <span>{task.estimated_duration} hours</span>
                  </div>
                )}

                {/* Reminder and Slot Info */}
                {(task.reminder_datetime || slotDuration) && (
                  <div className="flex flex-wrap gap-4">
                    {task.reminder_datetime && (
                      <div className="flex items-center gap-2 text-sm bg-orange-50 px-3 py-2 rounded">
                        <Bell className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Reminder:</span>
                        <span>{formatToIST(task.reminder_datetime, 'MMM d, yyyy HH:mm')}</span>
                      </div>
                    )}
                    {slotDuration && (
                      <div className="flex items-center gap-2 text-sm bg-blue-50 px-3 py-2 rounded">
                        <CalendarClock className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Slot Duration:</span>
                        <span>{slotDuration}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time Tracking Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Timer className="h-4 w-4" />
                  Time Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Timer Controls */}
                <div className="flex items-center gap-2">
                  <TaskTimer 
                    taskId={task.id}
                    taskName={task.name}
                    onTimeUpdate={handleTimeUpdate}
                  />
                  <TimeTrackerWithComment 
                    taskId={task.id} 
                    onTimeUpdate={handleTimeUpdate}
                  />
                  <ManualTimeLog 
                    taskId={task.id} 
                    onTimeUpdate={handleTimeUpdate}
                  />
                </div>

                {/* Time Entries Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTimeEntries(!showTimeEntries)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {showTimeEntries ? 'Hide' : 'Show'} Time Entries ({timeEntries.length})
                  <ChevronDown className={`h-4 w-4 transition-transform ${showTimeEntries ? 'rotate-180' : ''}`} />
                </Button>

                {/* Time Entries */}
                {showTimeEntries && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {timeEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No time entries logged yet
                      </p>
                    ) : (
                      timeEntries.map((entry: any) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {entry.duration_minutes} minutes
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({((entry.duration_minutes || 0) / 60).toFixed(2)}h)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{entry.employee?.name || 'Unknown'}</span>
                              <span>•</span>
                              <span>{formatToIST(entry.start_time, 'MMM d, HH:mm')}</span>
                            </div>
                            {entry.comment && (
                              <p className="text-xs text-gray-600 italic">
                                "{entry.comment}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subtasks Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LayoutList className="h-4 w-4" />
                    Subtasks ({subtasks.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateSubtask}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    Add Subtask
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {subtasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No subtasks created yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <SubtaskCard
                        key={subtask.id}
                        subtask={subtask}
                        onEdit={handleEditSubtask}
                        onDelete={(id) => deleteSubtaskMutation.mutate(id)}
                        onStatusChange={handleSubtaskStatusChange}
                        onTimeUpdate={handleTimeUpdate}
                        canUpdate={hasOperationAccess('tasks', 'update')}
                        canDelete={hasOperationAccess('tasks', 'delete')}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  Task History & Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskHistory taskId={taskId} onUpdate={handleTimeUpdate} />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {hasOperationAccess('tasks', 'update') && (
                <Button
                  onClick={() => {
                    // Could add edit functionality here if needed
                    toast.info('Edit functionality can be added here');
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Task
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subtask Dialog */}
      <SubtaskDialog
        isOpen={subtaskDialogOpen}
        onClose={() => {
          setSubtaskDialogOpen(false);
          setEditingSubtask(null);
        }}
        onSave={handleSubtaskSave}
        taskId={taskId}
        editingSubtask={editingSubtask}
        employees={employees}
        isLoading={createSubtaskMutation.isPending || updateSubtaskMutation.isPending}
      />
    </>
  );
};

export default TaskDetailsDialog;