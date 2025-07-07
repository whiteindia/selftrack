import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Clock, User, Building, Plus, MessageSquare, Trash2, Edit, Filter, ChevronDown, LayoutList, Kanban, Play, Bell, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { formatToIST, formatUTCToISTInput, convertISTToUTC } from '@/utils/timezoneUtils';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import TaskHistory from '@/components/TaskHistory';
import TimeTrackerWithComment from '@/components/TimeTrackerWithComment';
import TasksHeader from '@/components/TasksHeader';
import SubtaskCard from '@/components/SubtaskCard';
import SubtaskDialog from '@/components/SubtaskDialog';
import TaskKanban from '@/components/TaskKanban';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useTimeEntryCount } from '@/hooks/useTimeEntryCount';
import { Toggle } from '@/components/ui/toggle';
import TaskTimer from '@/components/TaskTimer';

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
  const [statusFilters, setStatusFilters] = useState<string[]>(['In Progress','On-Head','Targeted','Imp']);
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [globalServiceFilter, setGlobalServiceFilter] = useState('all');
  const [globalClientFilter, setGlobalClientFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'kanban'>('cards');
  
  // Subtask states
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [editingSubtask, setEditingSubtask] = useState<any>(null);
  
  const [newTask, setNewTask] = useState({
    name: '',
    project_id: '',
    assignee_id: '',
    deadline: '',
    estimated_duration: '',
    status: 'Not Started',
    reminder_datetime: '',
    slot_start_datetime: '',
    slot_end_datetime: ''
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

  // Always allow access for admin users and yugandhar@whiteindia.in
  const hasTasksAccess = userRole === 'admin' || 
                        user?.email === 'yugandhar@whiteindia.in' || 
                        hasPageAccess('tasks');

  // Fetch tasks with project information using the secure view
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
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
        throw tasksError;
      }

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

  // Fetch running tasks (tasks with active timers)
  const { data: runningTasks = [] } = useQuery({
    queryKey: ['running-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('task_id')
        .is('end_time', null);
      
      if (error) throw error;
      return data.map(entry => entry.task_id);
    },
    enabled: hasTasksAccess
  });

  // Filter tasks based on filters - updated to handle multi-select status
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
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

    // Sort tasks: running timers first, then overdue, then by deadline
    return filtered.sort((a, b) => {
      const aHasRunningTimer = runningTasks.includes(a.id);
      const bHasRunningTimer = runningTasks.includes(b.id);
      
      // If one has running timer and the other doesn't, running timer comes first
      if (aHasRunningTimer && !bHasRunningTimer) return -1;
      if (!aHasRunningTimer && bHasRunningTimer) return 1;
      
      const now = new Date();
      const aOverdue = a.deadline && new Date(a.deadline).getTime() < now.getTime();
      const bOverdue = b.deadline && new Date(b.deadline).getTime() < now.getTime();
      
      // If one is overdue and the other isn't, overdue comes first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // If both have same overdue status, sort by deadline
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      
      // Tasks without deadlines go to the end
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      
      return 0;
    });
  }, [tasks, searchTerm, statusFilters, assigneeFilter, projectFilter, globalServiceFilter, globalClientFilter, projects, clients, runningTasks]);

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

      // Convert IST datetime inputs to UTC for storage
      const processedTaskData = { ...taskData };
      if (taskData.reminder_datetime) {
        processedTaskData.reminder_datetime = convertISTToUTC(taskData.reminder_datetime);
      }
      if (taskData.slot_start_datetime) {
        processedTaskData.slot_start_datetime = convertISTToUTC(taskData.slot_start_datetime);
      }
      if (taskData.slot_end_datetime) {
        processedTaskData.slot_end_datetime = convertISTToUTC(taskData.slot_end_datetime);
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...processedTaskData,
          assigner_id: employee.id,
          deadline: taskData.deadline || null,
          estimated_duration: taskData.estimated_duration ? parseFloat(taskData.estimated_duration) : null,
          reminder_datetime: processedTaskData.reminder_datetime || null,
          slot_start_datetime: processedTaskData.slot_start_datetime || null,
          slot_end_datetime: processedTaskData.slot_end_datetime || null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTask({ 
        name: '', 
        project_id: '', 
        assignee_id: '', 
        deadline: '', 
        estimated_duration: '', 
        status: 'Not Started',
        reminder_datetime: '',
        slot_start_datetime: '',
        slot_end_datetime: ''
      });
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
      // Convert IST datetime inputs to UTC for storage
      const processedUpdates = { ...updates };
      if (updates.reminder_datetime !== undefined) {
        processedUpdates.reminder_datetime = updates.reminder_datetime ? convertISTToUTC(updates.reminder_datetime) : null;
      }
      if (updates.slot_start_datetime !== undefined) {
        processedUpdates.slot_start_datetime = updates.slot_start_datetime ? convertISTToUTC(updates.slot_start_datetime) : null;
      }
      if (updates.slot_end_datetime !== undefined) {
        processedUpdates.slot_end_datetime = updates.slot_end_datetime ? convertISTToUTC(updates.slot_end_datetime) : null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(processedUpdates)
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

  const handleStartTask = (taskId: string) => {
    const updates = { status: 'In Progress' };
    updateTaskMutation.mutate({ id: taskId, updates });
    toast.success('Task started!');
  };

  const handleTaskStatusChange = (taskId: string, newStatus: string) => {
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
    setStatusFilters(['In Progress','On-Head','Targeted','Imp']);
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
      <div className="space-y-4 p-2 sm:space-y-6 sm:p-4 lg:p-6">
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

        {/* View Toggle */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                View & Filters
              </CardTitle>
              <div className="flex items-center gap-2">
                <Toggle
                  pressed={viewMode === 'cards'}
                  onPressedChange={() => setViewMode('cards')}
                  variant="outline"
                  size="sm"
                >
                  <LayoutList className="h-4 w-4 mr-1" />
                  Cards
                </Toggle>
                <Toggle
                  pressed={viewMode === 'kanban'}
                  onPressedChange={() => setViewMode('kanban')}
                  variant="outline"
                  size="sm"
                >
                  <Kanban className="h-4 w-4 mr-1" />
                  Kanban
                </Toggle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm">Search</Label>
                <Input
                  id="search"
                  placeholder="Search tasks or projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-filter" className="text-sm">Status</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-9 text-sm">
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
                <Label htmlFor="assignee-filter" className="text-sm">Assignee</Label>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="h-9">
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
                <Button variant="outline" onClick={clearFilters} className="w-full h-9 text-sm">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600 px-1">
          <span>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600 text-sm">
                {tasks.length === 0 
                  ? "No tasks found. You can only see tasks where you are assigned or are the creator."
                  : "No tasks match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'kanban' ? (
          <TaskKanban
            tasks={filteredTasks.map(task => ({
              ...task,
              hours: task.total_logged_hours || 0
            }))}
            canCreate={hasOperationAccess('tasks', 'create')}
            canUpdate={hasOperationAccess('tasks', 'update')}
            canDelete={hasOperationAccess('tasks', 'delete')}
            onTaskStatusChange={handleTaskStatusChange}
            onAddTask={() => setIsCreateDialogOpen(true)}
          />
        ) : (
          <div className="grid gap-3">
            {filteredTasks.map((task) => (
              <TaskWithSubtasks
                key={task.id}
                task={task}
                expandedTask={expandedTask}
                setExpandedTask={setExpandedTask}
                hasOperationAccess={hasOperationAccess}
                handleStatusChange={handleStatusChange}
                handleStartTask={handleStartTask}
                handleTimeUpdate={handleTimeUpdate}
                deleteTaskMutation={deleteTaskMutation}
                setEditingTask={setEditingTask}
                onCreateSubtask={handleCreateSubtask}
                onEditSubtask={handleEditSubtask}
                employees={employees}
                calculateSlotDuration={calculateSlotDuration}
              />
            ))}
          </div>
        )}

        {/* Create Task Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={newTask.status} 
                  onValueChange={(value) => setNewTask({ ...newTask, status: value })}
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
              
              {/* New Reminder Field */}
              <div className="space-y-2">
                <Label htmlFor="reminder-datetime" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Reminder (Optional) - IST
                </Label>
                <Input
                  id="reminder-datetime"
                  type="datetime-local"
                  value={newTask.reminder_datetime}
                  onChange={(e) => setNewTask({ ...newTask, reminder_datetime: e.target.value })}
                />
                <p className="text-xs text-gray-500">Times will be stored and displayed in Indian Standard Time</p>
              </div>

              {/* New Slot Fields */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Slot Duration (Optional) - IST
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="slot-start">Start Time (IST)</Label>
                    <Input
                      id="slot-start"
                      type="datetime-local"
                      value={newTask.slot_start_datetime}
                      onChange={(e) => setNewTask({ ...newTask, slot_start_datetime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slot-end">End Time (IST)</Label>
                    <Input
                      id="slot-end"
                      type="datetime-local"
                      value={newTask.slot_end_datetime}
                      onChange={(e) => setNewTask({ ...newTask, slot_end_datetime: e.target.value })}
                    />
                  </div>
                </div>
                {newTask.slot_start_datetime && newTask.slot_end_datetime && (
                  <div className="text-sm text-green-600 font-medium">
                    Duration: {calculateSlotDuration(newTask.slot_start_datetime, newTask.slot_end_datetime) || 'Invalid duration'}
                  </div>
                )}
                <p className="text-xs text-gray-500">Times will be stored and displayed in Indian Standard Time</p>
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

                {/* Edit Reminder Field */}
                <div className="space-y-2">
                  <Label htmlFor="edit-reminder-datetime" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Reminder (Optional) - IST
                  </Label>
                  <Input
                    id="edit-reminder-datetime"
                    type="datetime-local"
                    value={editingTask.reminder_datetime ? formatUTCToISTInput(editingTask.reminder_datetime) : ''}
                    onChange={(e) => setEditingTask({ ...editingTask, reminder_datetime: e.target.value || null })}
                  />
                  <p className="text-xs text-gray-500">Times will be stored and displayed in Indian Standard Time</p>
                </div>

                {/* Edit Slot Fields */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    Slot Duration (Optional) - IST
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-slot-start">Start Time (IST)</Label>
                      <Input
                        id="edit-slot-start"
                        type="datetime-local"
                        value={editingTask.slot_start_datetime ? formatUTCToISTInput(editingTask.slot_start_datetime) : ''}
                        onChange={(e) => setEditingTask({ ...editingTask, slot_start_datetime: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-slot-end">End Time (IST)</Label>
                      <Input
                        id="edit-slot-end"
                        type="datetime-local"
                        value={editingTask.slot_end_datetime ? formatUTCToISTInput(editingTask.slot_end_datetime) : ''}
                        onChange={(e) => setEditingTask({ ...editingTask, slot_end_datetime: e.target.value || null })}
                      />
                    </div>
                  </div>
                  {editingTask.slot_start_datetime && editingTask.slot_end_datetime && (
                    <div className="text-sm text-green-600 font-medium">
                      Duration: {calculateSlotDuration(editingTask.slot_start_datetime, editingTask.slot_end_datetime) || 'Invalid duration'}
                  </div>
                  )}
                  <p className="text-xs text-gray-500">Times will be stored and displayed in Indian Standard Time</p>
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
                      estimated_duration: editingTask.estimated_duration,
                      reminder_datetime: editingTask.reminder_datetime,
                      slot_start_datetime: editingTask.slot_start_datetime,
                      slot_end_datetime: editingTask.slot_end_datetime
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

// New component to handle task with its subtasks - Updated to show reminder and slot info
const TaskWithSubtasks: React.FC<{
  task: Task;
  expandedTask: string | null;
  setExpandedTask: (id: string | null) => void;
  hasOperationAccess: (resource: string, operation: string) => boolean;
  handleStatusChange: (taskId: string, newStatus: string) => void;
  handleStartTask: (taskId: string) => void;
  handleTimeUpdate: () => void;
  deleteTaskMutation: any;
  setEditingTask: (task: Task) => void;
  onCreateSubtask: (taskId: string) => void;
  onEditSubtask: (taskId: string, subtask: any) => void;
  employees: any[];
  calculateSlotDuration: (start: string | null, end: string | null) => string | null;
}> = ({
  task,
  expandedTask,
  setExpandedTask,
  hasOperationAccess,
  handleStatusChange,
  handleStartTask,
  handleTimeUpdate,
  deleteTaskMutation,
  setEditingTask,
  onCreateSubtask,
  onEditSubtask,
  employees,
  calculateSlotDuration
}) => {
  const { subtasks, createSubtaskMutation, updateSubtaskMutation, deleteSubtaskMutation } = useSubtasks(task.id);
  const { data: timeEntryCount = 0 } = useTimeEntryCount(task.id);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<any>(null);

  // Check if task is overdue
  const isOverdue = task.deadline && new Date(task.deadline).getTime() < new Date().getTime();

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
      // Update existing subtask
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
      // Create new subtask
      createSubtaskMutation.mutate({
        name: subtaskData.name,
        status: subtaskData.status,
        assignee_id: subtaskData.assignee_id,
        deadline: subtaskData.deadline,
        estimated_duration: subtaskData.estimated_duration,
        task_id: task.id
      });
    }
    setSubtaskDialogOpen(false);
    setEditingSubtask(null);
  };

  const slotDuration = calculateSlotDuration(task.slot_start_datetime, task.slot_end_datetime);

  return (
    <>
      <div className="space-y-2">
        <Card className={`hover:shadow-md transition-shadow border-l-4 ${
          isOverdue 
            ? 'border-l-red-500 bg-red-50 ring-2 ring-red-200' 
            : 'border-l-blue-500'
        }`}>
          <CardContent className="p-3 space-y-2">
            {/* Task Name */}
            <h4 className={`font-medium text-sm mb-2 break-words line-clamp-2 ${
              isOverdue ? 'text-red-900' : ''
            }`}>
              {task.name}
              {isOverdue && (
                <Badge className="ml-2 bg-red-600 text-white font-bold animate-pulse">
                  OVERDUE
                </Badge>
              )}
              {task.reminder_datetime && (
                <Bell className="inline h-4 w-4 ml-2 text-orange-500" />
              )}
            </h4>
            
            {/* Project Info with Status */}
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                <Building className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{task.project_name || 'No Project'}</span>
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{task.assignee?.name || 'Unassigned'}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{task.total_logged_hours?.toFixed(2) || '0.00'}h logged</span>
              </span>
              {task.deadline && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                </span>
              )}
              <Badge variant="secondary" className={`${getStatusColor(task.status)} text-xs px-2 py-0 rounded-full`}>
                {task.status}
              </Badge>
            </div>

            {/* Reminder and Slot Info */}
            {(task.reminder_datetime || slotDuration) && (
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                {task.reminder_datetime && (
                  <span className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                    <Bell className="h-3 w-3 text-orange-500" />
                                            <span>Reminder: {formatToIST(task.reminder_datetime, 'MMM d, HH:mm')}</span>
                  </span>
                )}
                {slotDuration && (
                  <span className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                    <CalendarClock className="h-3 w-3 text-blue-500" />
                    <span>{slotDuration} Slot</span>
                  </span>
                )}
              </div>
            )}
            
            {/* Action Icons Row */}
            <div className="flex items-center gap-1">
              {/* Enhanced Timer Component */}
              <TaskTimer 
                taskId={task.id}
                taskName={task.name}
                onTimeUpdate={handleTimeUpdate}
              />
              
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-100" onClick={handleCreateSubtask}>
                <Plus className="h-3 w-3" />
              </Button>
              {subtasks.length > 0 && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 px-2 hover:bg-gray-100 text-xs"
                  onClick={() => setShowSubtasks(!showSubtasks)}
                >
                  <span>{showSubtasks ? 'Hide' : 'Show'} ({subtasks.length})</span>
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0 hover:bg-gray-100"
                onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
              {timeEntryCount > 0 && (
                <span className="text-xs text-gray-400 px-1">({timeEntryCount})</span>
              )}
              {hasOperationAccess('tasks', 'update') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={() => setEditingTask(task)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {hasOperationAccess('tasks', 'delete') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={() => deleteTaskMutation.mutate(task.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardContent>
          
          {expandedTask === task.id && (
            <CardContent className="border-t pt-4 px-3 sm:px-6">
              <div className="space-y-4">
                {hasOperationAccess('tasks', 'update') && (
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium">Status:</Label>
                    <Select value={task.status} onValueChange={(value) => handleStatusChange(task.id, value)}>
                      <SelectTrigger className="w-full sm:w-48 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Started">Not Started</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="On-Head">On-Head</SelectItem>
                        <SelectItem value="Targeted">Targeted</SelectItem>
                        <SelectItem value="Imp">Imp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <TaskHistory taskId={task.id} onUpdate={handleTimeUpdate} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Subtasks - Mobile optimized */}
        {showSubtasks && subtasks.length > 0 && (
          <div className="space-y-2 pl-2 sm:pl-4">
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
      </div>

      {/* Subtask Dialog for this specific task */}
      <SubtaskDialog
        isOpen={subtaskDialogOpen}
        onClose={() => {
          setSubtaskDialogOpen(false);
          setEditingSubtask(null);
        }}
        onSave={handleSubtaskSave}
        taskId={task.id}
        editingSubtask={editingSubtask}
        employees={employees}
        isLoading={createSubtaskMutation.isPending || updateSubtaskMutation.isPending}
      />
    </>
  );
};

export default Tasks;
