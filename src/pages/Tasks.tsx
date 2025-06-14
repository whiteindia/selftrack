
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Building, Plus, MessageSquare, Play, Square, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import TaskHistory from '@/components/TaskHistory';
import TimeTrackerWithComment from '@/components/TimeTrackerWithComment';

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
  projects: {
    name: string;
    service: string;
    client_id: string;
    clients: {
      name: string;
    } | null;
  };
  assignee: {
    name: string;
  } | null;
  assigner: {
    name: string;
  } | null;
  total_logged_hours?: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  service: string;
  clients: {
    name: string;
  } | null;
}

const Tasks = () => {
  const { user, userRole } = useAuth();
  const { hasOperationAccess } = usePrivileges();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    name: '',
    project_id: '',
    assignee_id: '',
    deadline: '',
    estimated_duration: ''
  });

  // Fetch tasks with calculated logged hours
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (
            name,
            service,
            client_id,
            clients (
              name
            )
          ),
          assignee:employees!assignee_id (
            name
          ),
          assigner:employees!assigner_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Calculate total logged hours for each task
      const tasksWithLoggedHours = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: timeEntries, error: timeError } = await supabase
            .from('time_entries')
            .select('duration_minutes')
            .eq('task_id', task.id)
            .not('end_time', 'is', null);

          if (timeError) {
            console.error('Error fetching time entries:', timeError);
            return { ...task, total_logged_hours: 0 };
          }

          const totalMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
          const totalHours = Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places

          return {
            ...task,
            total_logged_hours: totalHours
          };
        })
      );

      return tasksWithLoggedHours as Task[];
    }
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
    }
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          service,
          clients (
            name
          )
        `)
        .order('name');
      if (error) throw error;
      return data as Project[];
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();
      
      if (empError || !employee) {
        throw new Error('Employee record not found');
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...taskData,
          assigner_id: employee.id,
          deadline: taskData.deadline || null,
          estimated_duration: taskData.estimated_duration ? parseFloat(taskData.estimated_duration) : null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTask({ name: '', project_id: '', assignee_id: '', deadline: '', estimated_duration: '' });
      setIsCreateDialogOpen(false);
      toast.success('Task created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create task: ' + error.message);
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
      toast.success('Task updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update task: ' + error.message);
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete task: ' + error.message);
    }
  });

  const handleCreateTask = () => {
    if (!newTask.name || !newTask.project_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    createTaskMutation.mutate(newTask);
  };

  const handleUpdateTask = (updates: any) => {
    if (!editingTask) return;
    updateTaskMutation.mutate({ id: editingTask.id, updates });
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'Completed') {
      updates.completion_date = new Date().toISOString();
    } else if (newStatus !== 'Completed') {
      updates.completion_date = null;
    }
    updateTaskMutation.mutate({ id: taskId, updates });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Completed': return 'bg-green-500';
      case 'On Hold': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const handleTimeUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  if (tasksLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading tasks...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Tasks</h1>
          {hasOperationAccess('tasks', 'create') && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Create a new task and assign it to a team member.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-name">Task Name</Label>
                    <Input
                      id="task-name"
                      value={newTask.name}
                      onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                      placeholder="Enter task name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={newTask.project_id} onValueChange={(value) => setNewTask({ ...newTask, project_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} - {project.service}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assignee</Label>
                    <Select value={newTask.assignee_id} onValueChange={(value) => setNewTask({ ...newTask, assignee_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deadline">Deadline</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={newTask.deadline}
                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimated-duration">Estimated Hours</Label>
                      <Input
                        id="estimated-duration"
                        type="number"
                        step="0.5"
                        value={newTask.estimated_duration}
                        onChange={(e) => setNewTask({ ...newTask, estimated_duration: e.target.value })}
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
                      {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{task.name}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-1" />
                        {task.projects.name}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {task.assignee?.name || 'Unassigned'}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {task.total_logged_hours?.toFixed(2) || '0.00'}h logged
                        {task.estimated_duration && ` / ${task.estimated_duration}h estimated`}
                      </div>
                      {task.deadline && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Due: {format(new Date(task.deadline), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    <TimeTrackerWithComment 
                      taskId={task.id} 
                      onUpdate={handleTimeUpdate}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    {hasOperationAccess('tasks', 'update') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTask(task)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {hasOperationAccess('tasks', 'delete') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {expandedTask === task.id && (
                <CardContent className="border-t">
                  <div className="space-y-4">
                    {hasOperationAccess('tasks', 'update') && (
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="status">Status:</Label>
                        <Select value={task.status} onValueChange={(value) => handleStatusChange(task.id, value)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <TaskHistory taskId={task.id} onUpdate={handleTimeUpdate} />
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Edit Task Dialog */}
        {editingTask && (
          <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>
                  Update task details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-name">Task Name</Label>
                  <Input
                    id="edit-task-name"
                    value={editingTask.name}
                    onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-assignee">Assignee</Label>
                  <Select 
                    value={editingTask.assignee_id || ''} 
                    onValueChange={(value) => setEditingTask({ ...editingTask, assignee_id: value || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-deadline">Deadline</Label>
                    <Input
                      id="edit-deadline"
                      type="date"
                      value={editingTask.deadline || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-estimated-duration">Estimated Hours</Label>
                    <Input
                      id="edit-estimated-duration"
                      type="number"
                      step="0.5"
                      value={editingTask.estimated_duration || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, estimated_duration: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="0.0"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditingTask(null)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleUpdateTask({
                      name: editingTask.name,
                      assignee_id: editingTask.assignee_id,
                      deadline: editingTask.deadline,
                      estimated_duration: editingTask.estimated_duration
                    })}
                    disabled={updateTaskMutation.isPending}
                  >
                    {updateTaskMutation.isPending ? 'Updating...' : 'Update Task'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Navigation>
  );
};

export default Tasks;
