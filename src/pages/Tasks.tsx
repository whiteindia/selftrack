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
import { Calendar, Clock, User, Building, Plus, MessageSquare, Play, Square, Trash2, Edit, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import TaskHistory from '@/components/TaskHistory';
import TimeTrackerWithComment from '@/components/TimeTrackerWithComment';
import TasksHeader from '@/components/TasksHeader';

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
  const { hasPageAccess, hasOperationAccess, loading: privilegesLoading } = usePrivileges();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [globalServiceFilter, setGlobalServiceFilter] = useState('all');
  const [globalClientFilter, setGlobalClientFilter] = useState('all');
  const [newTask, setNewTask] = useState({
    name: '',
    project_id: '',
    assignee_id: '',
    deadline: '',
    estimated_duration: ''
  });

  // Check if user has access to tasks page
  console.log('=== Tasks Page Access Check ===');
  console.log('User:', user?.email);
  console.log('UserRole:', userRole);
  console.log('PrivilegesLoading:', privilegesLoading);
  
  // Always allow access for admin users and yugandhar@whiteindia.in
  const hasTasksAccess = userRole === 'admin' || 
                        user?.email === 'yugandhar@whiteindia.in' || 
                        hasPageAccess('tasks');
  
  console.log('HasTasksAccess:', hasTasksAccess);
  console.log('HasPageAccess result:', hasPageAccess('tasks'));

  // Fetch tasks with project information using the secure view
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      console.log('Fetching tasks with project info using secure view');
      
      // First, get tasks that the user has access to
      const { data: tasksData, error: tasksError } = await supabase
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
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }

      console.log(`Fetched ${tasksData?.length || 0} tasks after RLS filtering`);

      // For each task, fetch project information using the secure view
      const tasksWithProjectInfo = await Promise.all(
        (tasksData || []).map(async (task) => {
          // Use the secure function to get project info
          const { data: projectData } = await supabase
            .rpc('get_project_info_for_task', { 
              project_uuid: task.project_id 
            });

          // Calculate total logged hours
          const { data: timeEntries, error: timeError } = await supabase
            .from('time_entries')
            .select('duration_minutes')
            .eq('task_id', task.id)
            .not('end_time', 'is', null);

          if (timeError) {
            console.error('Error fetching time entries:', timeError);
          }

          const totalMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
          const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

          // Get the first project info record (should only be one)
          const projectInfo = projectData?.[0];

          return {
            ...task,
            project_name: projectInfo?.name || null,
            project_service: projectInfo?.service || null,
            client_name: projectInfo?.client_name || null,
            total_logged_hours: totalHours
          };
        })
      );

      return tasksWithProjectInfo as Task[];
    },
    enabled: hasTasksAccess && !privilegesLoading
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
    enabled: hasTasksAccess
  });

  // Fetch projects - use the secure view for projects list in create/edit dialogs
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_project_info')
        .select('*')
        .order('name');
      if (error) throw error;
      
      // Transform the data to match the Project interface
      return data.map(p => ({
        id: p.id,
        name: p.name,
        service: p.service,
        clients: p.client_name ? { name: p.client_name } : null
      })) as Project[];
    },
    enabled: hasTasksAccess
  });

  // Fetch services for global filter
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: hasTasksAccess
  });

  // Fetch clients for global filter
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: hasTasksAccess
  });

  // Filter tasks based on filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (task.project_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesAssignee = assigneeFilter === 'all' || task.assignee_id === assigneeFilter;
      const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
      const matchesService = globalServiceFilter === 'all' || task.project_service === globalServiceFilter;
      
      // Find the client ID for this task through its project
      const taskProject = projects.find(p => p.id === task.project_id);
      const matchesClient = globalClientFilter === 'all' || taskProject?.clients?.name === clients.find(c => c.id === globalClientFilter)?.name;
      
      return matchesSearch && matchesStatus && matchesAssignee && matchesProject && matchesService && matchesClient;
    });
  }, [tasks, searchTerm, statusFilter, assigneeFilter, projectFilter, globalServiceFilter, globalClientFilter, projects, clients]);

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

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setAssigneeFilter('all');
    setProjectFilter('all');
    setGlobalServiceFilter('all');
    setGlobalClientFilter('all');
  };

  if (privilegesLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading...</div>
        </div>
      </Navigation>
    );
  }

  if (!hasTasksAccess) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access the tasks page.</p>
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <p>User: {user?.email}</p>
              <p>Role: {userRole || 'No role assigned'}</p>
              <p>Page Access Check: {String(hasPageAccess('tasks'))}</p>
              <p>Admin Check: {String(userRole === 'admin')}</p>
              <p>Superuser Check: {String(user?.email === 'yugandhar@whiteindia.in')}</p>
            </div>
          </div>
        </div>
      </Navigation>
    );
  }

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
      <div className="space-y-6 p-4 sm:p-6">
        <TasksHeader
          globalServiceFilter={globalServiceFilter}
          setGlobalServiceFilter={setGlobalServiceFilter}
          globalClientFilter={globalClientFilter}
          setGlobalClientFilter={setGlobalClientFilter}
          services={services}
          clients={clients}
          canCreate={hasOperationAccess('tasks', 'create')}
          onCreateTask={() => setIsCreateDialogOpen(true)}
        />

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search tasks or projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignee-filter">Assignee</Label>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-filter">Project</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-filter">Client</Label>
                <Select value={globalClientFilter} onValueChange={setGlobalClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600">
                {tasks.length === 0 
                  ? "No tasks found. You can only see tasks where you are assigned or are the creator."
                  : "No tasks match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-4">
                    {/* Task Title and Basic Info - Always on top */}
                    <div className="flex flex-col gap-2">
                      <CardTitle className="text-lg leading-tight">{task.name}</CardTitle>
                      
                      {/* Task Details - Stack on mobile, wrap on larger screens */}
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{task.project_name || 'No Project'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{task.assignee?.name || 'Unassigned'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>{task.total_logged_hours?.toFixed(2) || '0.00'}h logged</span>
                          {task.estimated_duration && <span> / {task.estimated_duration}h estimated</span>}
                        </div>
                        {task.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>Due: {format(new Date(task.deadline), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status Badge and Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      {/* Status Badge - Full width on mobile */}
                      <div className="flex items-start">
                        <Badge className={`${getStatusColor(task.status)} w-full sm:w-auto justify-center sm:justify-start`}>
                          {task.status}
                        </Badge>
                      </div>
                      
                      {/* Action Buttons - Stack on mobile, align right on larger screens */}
                      <div className="flex flex-wrap gap-2 justify-start sm:justify-end items-start">
                        {task.status === 'In Progress' && (
                          <TimeTrackerWithComment 
                            task={{ id: task.id, name: task.name }}
                            onSuccess={handleTimeUpdate}
                          />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                          className="flex-shrink-0"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        {hasOperationAccess('tasks', 'update') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTask(task)}
                            className="flex-shrink-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasOperationAccess('tasks', 'delete') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                            className="flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {expandedTask === task.id && (
                  <CardContent className="border-t pt-4">
                    <div className="space-y-4">
                      {hasOperationAccess('tasks', 'update') && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <Label htmlFor="status" className="text-sm font-medium">Status:</Label>
                          <Select value={task.status} onValueChange={(value) => handleStatusChange(task.id, value)}>
                            <SelectTrigger className="w-full sm:w-40">
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
        )}

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
                  <Label htmlFor="edit-project">Project</Label>
                  <Select 
                    value={editingTask.project_id} 
                    onValueChange={(value) => setEditingTask({ ...editingTask, project_id: value })}
                  >
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
                  <Label htmlFor="edit-status">Status</Label>
                  <Select 
                    value={editingTask.status} 
                    onValueChange={(value) => setEditingTask({ ...editingTask, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
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
                      project_id: editingTask.project_id,
                      status: editingTask.status,
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
