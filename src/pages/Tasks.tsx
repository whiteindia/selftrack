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
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Clock, User, Building, Plus, MessageSquare, Play, Square, Trash2, Edit, Filter, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import TaskHistory from '@/components/TaskHistory';
import TimeTrackerWithComment from '@/components/TimeTrackerWithComment';
import TasksHeader from '@/components/TasksHeader';
import SubtaskCard from '@/components/SubtaskCard';
import SubtaskDialog from '@/components/SubtaskDialog';
import { useSubtasks } from '@/hooks/useSubtasks';

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
  const [statusFilters, setStatusFilters] = useState<string[]>(['On-Head','Targeted','Imp']);
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [globalServiceFilter, setGlobalServiceFilter] = useState('all');
  const [globalClientFilter, setGlobalClientFilter] = useState('all');
  
  // Subtask states
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [editingSubtask, setEditingSubtask] = useState<any>(null);
  
  const [newTask, setNewTask] = useState({
    name: '',
    project_id: '',
    assignee_id: '',
    deadline: '',
    estimated_duration: ''
  });

  // Define all available status options
  const statusOptions = [
    'Not Started',
    'In Progress', 
    'Completed',
    'On Hold',
    'On-Head',
    'Targeted',
    'Imp'
  ];

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

  // Filter tasks based on filters - updated to handle multi-select status
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (task.project_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilters.includes('all') || statusFilters.includes(task.status);
      const matchesAssignee = assigneeFilter === 'all' || task.assignee_id === assigneeFilter;
      const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
      const matchesService = globalServiceFilter === 'all' || task.project_service === globalServiceFilter;
      
      // Find the client ID for this task through its project
      const taskProject = projects.find(p => p.id === task.project_id);
      const matchesClient = globalClientFilter === 'all' || taskProject?.clients?.name === clients.find(c => c.id === globalClientFilter)?.name;
      
      return matchesSearch && matchesStatus && matchesAssignee && matchesProject && matchesService && matchesClient;
    });
  }, [tasks, searchTerm, statusFilters, assigneeFilter, projectFilter, globalServiceFilter, globalClientFilter, projects, clients]);

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
      case 'On-Head': return 'bg-purple-500';
      case 'Targeted': return 'bg-orange-500';
      case 'Imp': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleTimeUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilters(['On-Head','Targeted','Imp']);
    setAssigneeFilter('all');
    setProjectFilter('all');
    setGlobalServiceFilter('all');
    setGlobalClientFilter('all');
  };

  const handleStatusFilterChange = (status: string, checked: boolean) => {
    if (status === 'all') {
      setStatusFilters(checked ? ['all'] : []);
    } else {
      setStatusFilters(prev => {
        const newFilters = prev.filter(f => f !== 'all');
        if (checked) {
          return [...newFilters, status];
        } else {
          const filtered = newFilters.filter(f => f !== status);
          return filtered.length === 0 ? ['all'] : filtered;
        }
      });
    }
  };

  const handleCreateSubtask = (taskId: string) => {
    setCurrentTaskId(taskId);
    setEditingSubtask(null);
    setSubtaskDialogOpen(true);
  };

  const handleEditSubtask = (taskId: string, subtask: any) => {
    setCurrentTaskId(taskId);
    setEditingSubtask(subtask);
    setSubtaskDialogOpen(true);
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
          projectFilter={projectFilter}
          setProjectFilter={setProjectFilter}
          services={services}
          clients={clients}
          projects={projects}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {statusFilters.includes('all') 
                        ? 'All Statuses' 
                        : statusFilters.length === 1 
                          ? statusFilters[0]
                          : `${statusFilters.length} selected`
                      }
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-3 bg-white border shadow-lg z-50">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="status-all"
                          checked={statusFilters.includes('all')}
                          onCheckedChange={(checked) => handleStatusFilterChange('all', !!checked)}
                        />
                        <Label htmlFor="status-all" className="text-sm font-medium">
                          All Statuses
                        </Label>
                      </div>
                      {statusOptions.map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={statusFilters.includes(status)}
                            onCheckedChange={(checked) => handleStatusFilterChange(status, !!checked)}
                          />
                          <Label htmlFor={`status-${status}`} className="text-sm">
                            {status}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
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
              <TaskWithSubtasks
                key={task.id}
                task={task}
                expandedTask={expandedTask}
                setExpandedTask={setExpandedTask}
                hasOperationAccess={hasOperationAccess}
                handleStatusChange={handleStatusChange}
                handleTimeUpdate={handleTimeUpdate}
                deleteTaskMutation={deleteTaskMutation}
                setEditingTask={setEditingTask}
                onCreateSubtask={handleCreateSubtask}
                onEditSubtask={handleEditSubtask}
                employees={employees}
              />
            ))}
          </div>
        )}

        {/* Create Task Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-name">Task Name</Label>
                <Input
                  id="task-name"
                  placeholder="Enter task name"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select 
                  value={newTask.project_id} 
                  onValueChange={(value) => setNewTask({ ...newTask, project_id: value })}
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
                <Label htmlFor="assignee">Assignee</Label>
                <Select 
                  value={newTask.assignee_id} 
                  onValueChange={(value) => setNewTask({ ...newTask, assignee_id: value })}
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
                <Button 
                  onClick={handleCreateTask}
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
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

      {/* Subtask Dialog */}
      <SubtaskDialog
        isOpen={subtaskDialogOpen}
        onClose={() => {
          setSubtaskDialogOpen(false);
          setEditingSubtask(null);
          setCurrentTaskId('');
        }}
        onSave={(subtaskData) => {
          if (editingSubtask) {
            // Handle update
            console.log('Update subtask:', subtaskData);
          } else {
            // Handle create
            console.log('Create subtask:', subtaskData);
          }
          setSubtaskDialogOpen(false);
          setEditingSubtask(null);
          setCurrentTaskId('');
        }}
        taskId={currentTaskId}
        editingSubtask={editingSubtask}
        employees={employees}
      />
    </Navigation>
  );
};

// New component to handle task with its subtasks
const TaskWithSubtasks: React.FC<{
  task: Task;
  expandedTask: string | null;
  setExpandedTask: (id: string | null) => void;
  hasOperationAccess: (resource: string, operation: string) => boolean;
  handleStatusChange: (taskId: string, newStatus: string) => void;
  handleTimeUpdate: () => void;
  deleteTaskMutation: any;
  setEditingTask: (task: Task) => void;
  onCreateSubtask: (taskId: string) => void;
  onEditSubtask: (taskId: string, subtask: any) => void;
  employees: any[];
}> = ({
  task,
  expandedTask,
  setExpandedTask,
  hasOperationAccess,
  handleStatusChange,
  handleTimeUpdate,
  deleteTaskMutation,
  setEditingTask,
  onCreateSubtask,
  onEditSubtask,
  employees
}) => {
  const { subtasks, createSubtaskMutation, updateSubtaskMutation, deleteSubtaskMutation } = useSubtasks(task.id);
  const [showSubtasks, setShowSubtasks] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Completed': return 'bg-green-500';
      case 'On Hold': return 'bg-yellow-500';
      case 'On-Head': return 'bg-purple-500';
      case 'Targeted': return 'bg-orange-500';
      case 'Imp': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleSubtaskStatusChange = (subtaskId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'Completed') {
      updates.completion_date = new Date().toISOString();
    } else if (newStatus !== 'Completed') {
      updates.completion_date = null;
    }
    updateSubtaskMutation.mutate({ id: subtaskId, updates });
  };

  return (
    <div className="space-y-2">
      <Card className="hover:shadow-md transition-shadow">
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
            
            {/*  Status Badge and Action Buttons */}
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
                  onClick={() => onCreateSubtask(task.id)}
                  className="flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                {subtasks.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSubtasks(!showSubtasks)}
                    className="flex-shrink-0"
                  >
                    {showSubtasks ? 'Hide' : 'Show'} Subtasks ({subtasks.length})
                  </Button>
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

      {/* Subtasks - Only show when showSubtasks is true */}
      {showSubtasks && subtasks.length > 0 && (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <SubtaskCard
              key={subtask.id}
              subtask={subtask}
              onEdit={(subtask) => onEditSubtask(task.id, subtask)}
              onDelete={(id) => deleteSubtaskMutation.mutate(id)}
              onStatusChange={handleSubtaskStatusChange}
              onTimeUpdate={handleTimeUpdate}
              canUpdate={hasOperationAccess('tasks', 'update')}
              canDelete={hasOperationAccess('tasks', 'delete')}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Tasks;
