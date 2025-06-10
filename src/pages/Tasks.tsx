import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Play, Pause, Check, MessageCircle, Clock, Filter, History, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Navigation from '@/components/Navigation';
import TimeTrackerWithComment from '@/components/TimeTrackerWithComment';
import TaskHistory from '@/components/TaskHistory';
import { logActivity } from '@/utils/activityLogger';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, differenceInDays, isAfter, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type TaskStatus = Database['public']['Enums']['task_status'];

interface TaskData {
  id: string;
  name: string;
  project_id: string;
  assignee_id: string;
  assigner_id: string;
  status: TaskStatus;
  created_at: string;
  invoiced: boolean;
  hours: number;
  date: string;
  deadline: string | null;
  estimated_duration: number | null;
  completion_date: string | null;
  projects: {
    name: string;
    hourly_rate: number;
    clients: {
      name: string;
    };
  };
  employees: {
    name: string;
  };
  assigners?: {
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
}

interface EmployeeService {
  id: string;
  employee_id: string;
  service_id: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

const TASKS_PER_PAGE = 20;

const Tasks = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  // Helper function to get current user's employee ID
  const getCurrentUserEmployeeId = async () => {
    if (!user?.email) return null;
    
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .eq('email', user.email)
      .single();
    
    if (error) {
      console.error('Error fetching current user employee:', error);
      return null;
    }
    
    return data?.id || null;
  };

  const [newTask, setNewTask] = useState({
    name: '',
    project_id: '',
    assignee_id: '',
    assigner_id: '',
    status: 'Not Started' as TaskStatus,
    deadline: null as Date | null,
    estimated_duration: ''
  });
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [statusFilter, setStatusFilter] = useState('not-completed'); // Changed default to exclude completed
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [assignerFilter, setAssignerFilter] = useState('all');
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');
  const [expandedHistories, setExpandedHistories] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Helper functions for task status checking
  const isTaskOverdue = (deadline: string | null, status: TaskStatus, completionDate: string | null): boolean => {
    if (!deadline) return false;
    
    // If task is completed, check against completion date
    if (status === 'Completed' && completionDate) {
      const deadlineDate = parseISO(deadline);
      const completedDate = parseISO(completionDate);
      return isAfter(completedDate, deadlineDate);
    }
    
    // For ongoing tasks, check against current date
    if (status !== 'Completed') {
      const today = new Date();
      const deadlineDate = parseISO(deadline);
      return isAfter(today, deadlineDate);
    }
    
    return false;
  };

  const isTaskOverDuration = (hours: number, estimatedDuration: number | null): boolean => {
    if (!estimatedDuration) return false;
    return hours > estimatedDuration;
  };

  const getDaysBehind = (deadline: string | null, status: TaskStatus, completionDate: string | null): number => {
    if (!deadline) return 0;
    
    const deadlineDate = parseISO(deadline);
    
    // If task is completed, calculate days behind from completion date
    if (status === 'Completed' && completionDate) {
      const completedDate = parseISO(completionDate);
      return Math.max(0, differenceInDays(completedDate, deadlineDate));
    }
    
    // For ongoing tasks, calculate from current date
    if (status !== 'Completed') {
      const today = new Date();
      return Math.max(0, differenceInDays(today, deadlineDate));
    }
    
    return 0;
  };

  const getHoursBehind = (hours: number, estimatedDuration: number | null): number => {
    if (!estimatedDuration) return 0;
    return Math.max(0, hours - estimatedDuration);
  };

  // Fetch tasks with project and employee data including client data and assigner data
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects(
            name, 
            hourly_rate,
            clients(name)
          ),
          employees!tasks_assignee_id_fkey(name),
          assigners:employees!tasks_assigner_id_fkey(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TaskData[];
    }
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Project[];
    }
  });

  // Fetch employee services separately
  const { data: employeeServices = [] } = useQuery({
    queryKey: ['employee-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_services')
        .select('*');
      
      if (error) throw error;
      return data as EmployeeService[];
    }
  });

  // Fetch employees for dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Employee[];
    }
  });

  // Fetch services for the global filter
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Service[];
    }
  });

  // Mutation to create a new task
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      // Get current user's employee ID for assigner
      const currentUserEmployeeId = await getCurrentUserEmployeeId();
      
      const finalTaskData = {
        ...taskData,
        assigner_id: currentUserEmployeeId, // Auto-set to current user
        deadline: taskData.deadline ? format(taskData.deadline, 'yyyy-MM-dd') : null,
        estimated_duration: taskData.estimated_duration ? parseFloat(taskData.estimated_duration) : null
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([finalTaskData])
        .select()
        .single();
      
      if (error) throw error;

      // Log activity
      await logActivity({
        action_type: 'created',
        entity_type: 'task',
        entity_id: data.id,
        entity_name: data.name,
        description: `Created task ${data.name}`,
        comment: ''
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTask({
        name: '',
        project_id: '',
        assignee_id: '',
        assigner_id: '',
        status: 'Not Started',
        deadline: null,
        estimated_duration: ''
      });
      setIsDialogOpen(false);
      toast.success('Task created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create task: ' + error.message);
    }
  });

  // Mutation to update an existing task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & any) => {
      // Get current user's employee ID for assigner if not already set
      const currentUserEmployeeId = await getCurrentUserEmployeeId();
      
      const finalUpdates = {
        ...updates,
        assigner_id: updates.assigner_id || currentUserEmployeeId, // Auto-set if not provided
        deadline: updates.deadline ? format(new Date(updates.deadline), 'yyyy-MM-dd') : null,
        estimated_duration: updates.estimated_duration ? parseFloat(updates.estimated_duration) : null
      };

      // If status is being changed to 'Completed' and no completion_date exists, set it
      if (updates.status === 'Completed' && !updates.completion_date) {
        finalUpdates.completion_date = new Date().toISOString();
      }

      // If status is being changed from 'Completed' to something else, clear completion_date
      if (updates.status !== 'Completed') {
        finalUpdates.completion_date = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(finalUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Log activity
      await logActivity({
        action_type: 'updated',
        entity_type: 'task',
        entity_id: data.id,
        entity_name: data.name,
        description: `Updated task ${data.name}`,
        comment: ''
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
      setIsEditDialogOpen(false);
      toast.success('Task updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update task: ' + error.message);
    }
  });

  // Updated mutation to delete a task and its related time entries
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, delete all time entries associated with this task
      const { error: timeEntriesError } = await supabase
        .from('time_entries')
        .delete()
        .eq('task_id', id);
      
      if (timeEntriesError) throw timeEntriesError;

      // Then delete the task
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;

      // Log activity
      await logActivity({
        action_type: 'deleted',
        entity_type: 'task',
        entity_id: id,
        entity_name: id,
        description: `Deleted task ${id}`,
        comment: ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Task and all related time entries deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete task: ' + error.message);
    }
  });

  // Filter and sort tasks
  const filteredAndSortedTasks = React.useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesProject = selectedProject === 'all' || task.project_id === selectedProject;
      
      // Updated status filter logic
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'not-completed' && task.status !== 'Completed') ||
                           (statusFilter !== 'all' && statusFilter !== 'not-completed' && task.status === statusFilter);
      
      const matchesAssignee = assigneeFilter === 'all' || task.assignee_id === assigneeFilter;
      const matchesAssigner = assignerFilter === 'all' || task.assigner_id === assignerFilter;
      const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by service through employee services (check if the assignee has the service)
      const matchesService = globalServiceFilter === 'all' || 
        employeeServices.some(es => es.employee_id === task.assignee_id && es.service_id === globalServiceFilter);
      
      return matchesProject && matchesStatus && matchesAssignee && matchesAssigner && matchesSearch && matchesService;
    });

    // Sort tasks: overdue or over-duration tasks at the top
    return filtered.sort((a, b) => {
      const aIsOverdue = isTaskOverdue(a.deadline, a.status, a.completion_date);
      const aIsOverDuration = isTaskOverDuration(a.hours, a.estimated_duration);
      const bIsOverdue = isTaskOverdue(b.deadline, b.status, b.completion_date);
      const bIsOverDuration = isTaskOverDuration(b.hours, b.estimated_duration);
      
      const aIsPriority = aIsOverdue || aIsOverDuration;
      const bIsPriority = bIsOverdue || bIsOverDuration;
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      
      // If both are priority, sort by most overdue/over-duration first
      if (aIsPriority && bIsPriority) {
        const aDaysBehind = getDaysBehind(a.deadline, a.status, a.completion_date);
        const bDaysBehind = getDaysBehind(b.deadline, b.status, b.completion_date);
        const aHoursBehind = getHoursBehind(a.hours, a.estimated_duration);
        const bHoursBehind = getHoursBehind(b.hours, b.estimated_duration);
        
        const aTotalBehind = aDaysBehind + aHoursBehind;
        const bTotalBehind = bDaysBehind + bHoursBehind;
        
        return bTotalBehind - aTotalBehind;
      }
      
      // Default sort by creation date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, selectedProject, statusFilter, assigneeFilter, assignerFilter, searchTerm, globalServiceFilter, employeeServices]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedTasks.length / TASKS_PER_PAGE);
  const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
  const paginatedTasks = filteredAndSortedTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProject, statusFilter, assigneeFilter, assignerFilter, globalServiceFilter]);

  const handleCreateTask = () => {
    createTaskMutation.mutate(newTask);
  };

  const handleUpdateTask = () => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, ...editingTask });
    }
  };

  const handleDeleteTask = (id: string) => {
    deleteTaskMutation.mutate(id);
  };

  const toggleHistory = (taskId: string) => {
    const newExpanded = new Set(expandedHistories);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedHistories(newExpanded);
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading tasks...</div>
        </div>
      </Navigation>
    );
  }

  // Mobile view with cards
  if (isMobile) {
    return (
      <Navigation>
        <div className="px-4 py-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
              <p className="text-gray-600 text-sm mt-1">Track and manage your project tasks</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="mx-4 max-w-[calc(100vw-2rem)]">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to a project.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Task Name</Label>
                    <Input
                      id="name"
                      placeholder="Task name"
                      value={newTask.name}
                      onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={newTask.project_id} onValueChange={(value) => setNewTask({ ...newTask, project_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assignee</Label>
                    <Select value={newTask.assignee_id} onValueChange={(value) => setNewTask({ ...newTask, assignee_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an assignee" />
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
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newTask.deadline && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {newTask.deadline ? format(newTask.deadline, "PPP") : <span>Pick a deadline</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={newTask.deadline}
                          onSelect={(date) => setNewTask({ ...newTask, deadline: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated_duration">Estimated Duration (hours)</Label>
                    <Input
                      id="estimated_duration"
                      type="number"
                      placeholder="Estimated hours"
                      value={newTask.estimated_duration}
                      onChange={(e) => setNewTask({ ...newTask, estimated_duration: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateTask} className="w-full">
                    Create Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Mobile Filters */}
          <Card className="p-4">
            <div className="space-y-3">
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Project" />
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not-completed">Active Tasks</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Mobile Task Cards */}
          <div className="space-y-3">
            {paginatedTasks.map((task) => {
              const isOverdue = isTaskOverdue(task.deadline, task.status, task.completion_date);
              const isOverDuration = isTaskOverDuration(task.hours, task.estimated_duration);
              const daysBehind = getDaysBehind(task.deadline, task.status, task.completion_date);
              const hoursBehind = getHoursBehind(task.hours, task.estimated_duration);

              return (
                <Card key={task.id} className={cn("p-4", (isOverdue || isOverDuration) && "border-red-500 bg-red-50")}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{task.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{task.projects?.name}</p>
                        <p className="text-xs text-gray-500">{task.employees?.name}</p>
                        
                        {/* Deadline and Duration Info */}
                        {task.deadline && (
                          <div className={cn("text-xs", isOverdue ? "text-red-600 font-semibold" : "text-gray-600")}>
                            <Calendar className="inline h-3 w-3 mr-1" />
                            Deadline: {format(parseISO(task.deadline), "MMM dd, yyyy")}
                            {isOverdue && ` (${daysBehind} days overdue${task.status === 'Completed' ? ' when completed' : ''})`}
                          </div>
                        )}
                        
                        {task.estimated_duration && (
                          <div className={cn("text-xs", isOverDuration ? "text-red-600 font-semibold" : "text-gray-600")}>
                            <Clock className="inline h-3 w-3 mr-1" />
                            Est: {task.estimated_duration}h | Logged: {task.hours}h
                            {isOverDuration && ` (+${hoursBehind.toFixed(1)}h over)`}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end space-y-1">
                        <Badge className={
                          task.status === 'Not Started' ? 'bg-gray-100 text-gray-800 text-xs' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800 text-xs' :
                          'bg-green-100 text-green-800 text-xs'
                        }>
                          {task.status}
                        </Badge>
                        
                        {(isOverdue || isOverDuration) && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {task.status === 'Completed' ? 'Was Urgent' : 'Urgent'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Time Tracker and Hours */}
                    <div className="flex items-center justify-between">
                      {task.status !== 'Completed' && task.status !== 'Not Started' && (
                        <TimeTrackerWithComment
                          task={{ id: task.id, name: task.name }}
                          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
                        />
                      )}
                      <span className="text-xs text-gray-500">{task.hours}h logged</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTask(task);
                          setIsEditDialogOpen(true);
                        }}
                        className="text-xs"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleHistory(task.id)}
                        className="text-xs"
                      >
                        <History className="h-3 w-3 mr-1" />
                        History
                      </Button>
                    </div>

                    {/* Collapsible History */}
                    <Collapsible open={expandedHistories.has(task.id)}>
                      <CollapsibleContent className="pt-3 border-t">
                        <TaskHistory
                          taskId={task.id}
                          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {filteredAndSortedTasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tasks found matching your filters.
            </div>
          )}
        </div>
      </Navigation>
    );
  }

  // Desktop view with table
  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-2">Track and manage your project tasks</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Global Service Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to a project.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Task Name</Label>
                    <Input
                      id="name"
                      placeholder="Task name"
                      value={newTask.name}
                      onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={newTask.project_id} onValueChange={(value) => setNewTask({ ...newTask, project_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assignee</Label>
                    <Select value={newTask.assignee_id} onValueChange={(value) => setNewTask({ ...newTask, assignee_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an assignee" />
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
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newTask.deadline && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {newTask.deadline ? format(newTask.deadline, "PPP") : <span>Pick a deadline</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={newTask.deadline}
                          onSelect={(date) => setNewTask({ ...newTask, deadline: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated_duration">Estimated Duration (hours)</Label>
                    <Input
                      id="estimated_duration"
                      type="number"
                      placeholder="Estimated hours"
                      value={newTask.estimated_duration}
                      onChange={(e) => setNewTask({ ...newTask, estimated_duration: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateTask} className="w-full">
                    Create Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters - Organized in two rows */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* First Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Tasks</Label>
                  <Input
                    id="search"
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project-filter">Filter by Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
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
                  <Label htmlFor="status-filter">Filter by Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="not-completed">Active Tasks</SelectItem>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignee-filter">Filter by Assignee</Label>
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
                  <Label htmlFor="assigner-filter">Filter by Assigner</Label>
                  <Select value={assignerFilter} onValueChange={setAssignerFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Assigners" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assigners</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedProject('all');
                      setStatusFilter('not-completed');
                      setAssigneeFilter('all');
                      setAssignerFilter('all');
                      setGlobalServiceFilter('all');
                    }}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks ({filteredAndSortedTasks.length})</CardTitle>
            <CardDescription>
              {filteredAndSortedTasks.length} task{filteredAndSortedTasks.length !== 1 ? 's' : ''} found
              {globalServiceFilter !== 'all' && ` filtered by ${services.find(s => s.id === globalServiceFilter)?.name}`}
              {statusFilter === 'not-completed' && ' (completed tasks hidden by default)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAndSortedTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tasks found matching your filters.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Name</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Assigner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Timer</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTasks.map((task) => {
                      const isOverdue = isTaskOverdue(task.deadline, task.status, task.completion_date);
                      const isOverDuration = isTaskOverDuration(task.hours, task.estimated_duration);
                      const daysBehind = getDaysBehind(task.deadline, task.status, task.completion_date);
                      const hoursBehind = getHoursBehind(task.hours, task.estimated_duration);

                      return (
                        <React.Fragment key={task.id}>
                          <TableRow className={cn((isOverdue || isOverDuration) && "bg-red-50 border-red-200")}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{task.name}</span>
                                {(isOverdue || isOverDuration) && (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{task.projects?.name}</TableCell>
                            <TableCell>{task.employees?.name}</TableCell>
                            <TableCell>{task.assigners?.name || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge className={
                                task.status === 'Not Started' ? 'bg-gray-100 text-gray-800' :
                                task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {task.deadline ? (
                                <div className={cn("text-sm", isOverdue && "text-red-600 font-semibold")}>
                                  <div>{format(parseISO(task.deadline), "MMM dd, yyyy")}</div>
                                  {isOverdue && (
                                    <div className="text-xs text-red-500">
                                      {daysBehind} days overdue{task.status === 'Completed' ? ' when completed' : ''}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">No deadline</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className={cn(isOverDuration && "text-red-600 font-semibold")}>
                                  {task.hours || 0}h logged
                                </div>
                                {task.estimated_duration && (
                                  <div className="text-xs text-gray-500">
                                    Est: {task.estimated_duration}h
                                    {isOverDuration && (
                                      <span className="text-red-500 font-semibold">
                                        {' '}(+{hoursBehind.toFixed(1)}h over)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {task.status !== 'Completed' && task.status !== 'Not Started' && (
                                <TimeTrackerWithComment
                                  task={{ id: task.id, name: task.name }}
                                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleHistory(task.id)}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this task? This will also delete all time entries associated with this task. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete Task
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Collapsible History Row */}
                          {expandedHistories.has(task.id) && (
                            <TableRow>
                              <TableCell colSpan={9} className="p-0">
                                <div className="bg-gray-50 p-4 border-t">
                                  <TaskHistory
                                    taskId={task.id}
                                    onUpdate={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Desktop Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 7) {
                            pageNum = i + 1;
                          } else if (currentPage <= 4) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 3) {
                            pageNum = totalPages - 6 + i;
                          } else {
                            pageNum = currentPage - 3 + i;
                          }
                          
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        {totalPages > 7 && currentPage < totalPages - 3 && (
                          <>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => setCurrentPage(totalPages)}
                                className="cursor-pointer"
                              >
                                {totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          </>
                        )}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Edit task details.
              </DialogDescription>
            </DialogHeader>
            {editingTask && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Task Name</Label>
                  <Input
                    id="name"
                    placeholder="Task name"
                    value={editingTask.name}
                    onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select value={editingTask.project_id} onValueChange={(value) => setEditingTask({ ...editingTask, project_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select value={editingTask.assignee_id} onValueChange={(value) => setEditingTask({ ...editingTask, assignee_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an assignee" />
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
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={editingTask.status} onValueChange={(value) => setEditingTask({ ...editingTask, status: value as TaskStatus })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editingTask.deadline && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {editingTask.deadline ? format(parseISO(editingTask.deadline), "PPP") : <span>Pick a deadline</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editingTask.deadline ? parseISO(editingTask.deadline) : undefined}
                        onSelect={(date) => setEditingTask({ ...editingTask, deadline: date ? format(date, 'yyyy-MM-dd') : null })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_duration">Estimated Duration (hours)</Label>
                  <Input
                    id="estimated_duration"
                    type="number"
                    placeholder="Estimated hours"
                    value={editingTask.estimated_duration || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, estimated_duration: parseFloat(e.target.value) || null })}
                  />
                </div>
                <Button onClick={handleUpdateTask} className="w-full">
                  Update Task
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Navigation>
  );
};

export default Tasks;