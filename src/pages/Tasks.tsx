import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, Clock, User, Trash2, Edit, Plus, Eye, Filter } from 'lucide-react';
import { format } from 'date-fns';
import TaskKanban from '@/components/TaskKanban';
import TaskCommentDialog from '@/components/TaskCommentDialog';
import { usePrivileges } from '@/hooks/usePrivileges';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Database } from '@/integrations/supabase/types';

type TaskStatus = Database['public']['Enums']['task_status'];

interface Task {
  id: string;
  name: string;
  project_id: string;
  assignee_id: string;
  assigner_id: string;
  status: TaskStatus;
  deadline: string;
  estimated_duration: number;
  hours: number;
  date: string;
  invoiced: boolean;
  completion_date: string;
  created_at: string;
  updated_at: string;
  wage_status: string;
  projects: {
    name: string;
    clients: {
      name: string;
    };
  };
  assignee: {
    name: string;
    email: string;
  };
  assigner: {
    name: string;
    email: string;
  };
}

interface Project {
  id: string;
  name: string;
  clients: {
    name: string;
  };
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

const Tasks = () => {
  const [selectedView, setSelectedView] = useState<'list' | 'kanban' | 'table'>('table');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const queryClient = useQueryClient();
  
  // Privilege checks
  const { hasOperationAccess, loading: privilegesLoading } = usePrivileges();
  const canCreate = hasOperationAccess('tasks', 'create');
  const canRead = hasOperationAccess('tasks', 'read');
  const canUpdate = hasOperationAccess('tasks', 'update');
  const canDelete = hasOperationAccess('tasks', 'delete');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    project_id: '',
    assignee_id: '',
    deadline: '',
    estimated_duration: '',
  });

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      console.log('Fetching tasks...');
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects!inner (
            name,
            clients!inner (
              name
            )
          ),
          assignee:employees!assignee_id (
            name,
            email
          ),
          assigner:employees!assigner_id (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }

      console.log('Tasks fetched:', data?.length);
      return data || [];
    },
    enabled: canRead, // Only fetch if user can read
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          clients (
            name
          )
        `)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: canCreate || canUpdate, // Only fetch if user can create or update
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: canCreate || canUpdate, // Only fetch if user can create or update
  });

  // Filter tasks based on current filters
  const filteredTasks = tasks?.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
    const matchesAssignee = assigneeFilter === 'all' || task.assignee_id === assigneeFilter;
    const matchesSearch = searchQuery === '' || 
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.projects?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignee?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesProject && matchesAssignee && matchesSearch;
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreate && !editingTask) {
      toast.error('You do not have permission to create tasks');
      return;
    }
    
    if (!canUpdate && editingTask) {
      toast.error('You do not have permission to update tasks');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const taskData = {
        name: formData.name,
        project_id: formData.project_id,
        assignee_id: formData.assignee_id,
        assigner_id: user.id,
        deadline: formData.deadline || null,
        estimated_duration: formData.estimated_duration ? parseFloat(formData.estimated_duration) : null,
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        toast.success('Task updated successfully');
        setIsEditDialogOpen(false);
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);

        if (error) throw error;
        toast.success('Task created successfully');
        setIsCreateDialogOpen(false);
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetForm();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete tasks');
      return;
    }

    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleEdit = (task: Task) => {
    if (!canUpdate) {
      toast.error('You do not have permission to edit tasks');
      return;
    }

    setEditingTask(task);
    setFormData({
      name: task.name,
      project_id: task.project_id,
      assignee_id: task.assignee_id,
      deadline: task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : '',
      estimated_duration: task.estimated_duration?.toString() || '',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      project_id: '',
      assignee_id: '',
      deadline: '',
      estimated_duration: '',
    });
    setEditingTask(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500';
      case 'In Progress': return 'bg-blue-500';
      case 'On Hold': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const openCommentDialog = (task: Task) => {
    setSelectedTask(task);
    setIsCommentDialogOpen(true);
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!canUpdate) {
      toast.error('You do not have permission to update tasks');
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  if (privilegesLoading || tasksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
              <p className="text-gray-600">You don't have permission to view tasks.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute pageName="tasks">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
              <p className="text-gray-600 mt-2">Manage project tasks and assignments</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <div className="flex rounded-lg border border-gray-200 bg-white p-1">
                <button
                  onClick={() => setSelectedView('table')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedView === 'table' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setSelectedView('list')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedView === 'list' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setSelectedView('kanban')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedView === 'kanban' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Kanban
                </button>
              </div>
              {canCreate && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Task</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Task Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="project">Project</Label>
                        <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects?.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name} - {project.clients?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="assignee">Assignee</Label>
                        <Select value={formData.assignee_id} onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees?.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="deadline">Deadline</Label>
                        <Input
                          id="deadline"
                          type="date"
                          value={formData.deadline}
                          onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="estimated_duration">Estimated Duration (hours)</Label>
                        <Input
                          id="estimated_duration"
                          type="number"
                          step="0.5"
                          value={formData.estimated_duration}
                          onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Create Task</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search">Search</Label>
                    <Input
                      id="search"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Not Started">Not Started</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="project-filter">Project</Label>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="assignee-filter">Assignee</Label>
                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All assignees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignees</SelectItem>
                        {employees?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedView === 'kanban' ? (
            <TaskKanban 
              tasks={filteredTasks} 
              onTaskStatusChange={handleTaskStatusChange}
            />
          ) : selectedView === 'table' ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Name</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Est. Duration</TableHead>
                      <TableHead>Hours Logged</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.name}</TableCell>
                        <TableCell>{task.projects?.name}</TableCell>
                        <TableCell>{task.projects?.clients?.name}</TableCell>
                        <TableCell>{task.assignee?.name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(task.status)} text-white`}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.deadline ? format(new Date(task.deadline), 'MMM d, yyyy') : 'No deadline'}
                        </TableCell>
                        <TableCell>{task.estimated_duration ? `${task.estimated_duration}h` : 'N/A'}</TableCell>
                        <TableCell>{task.hours}h</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCommentDialog(task)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canUpdate && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(task)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(task.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No tasks found matching your filters.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{task.name}</CardTitle>
                      <Badge className={`${getStatusColor(task.status)} text-white`}>
                        {task.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium">Project:</span> {task.projects?.name}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium">Client:</span> {task.projects?.clients?.name}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium">Assignee:</span> {task.assignee?.name || 'Unassigned'}
                      </div>
                      {task.deadline && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="font-medium">Deadline:</span> {format(new Date(task.deadline), 'MMM d, yyyy')}
                        </div>
                      )}
                      {task.estimated_duration && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="font-medium">Estimated:</span> {task.estimated_duration}h
                        </div>
                      )}
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium">Logged:</span> {task.hours}h
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCommentDialog(task)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(task)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(task.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredTasks.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No tasks found matching your filters.
                </div>
              )}
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Task Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-project">Project</Label>
                  <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} - {project.clients?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-assignee">Assignee</Label>
                  <Select value={formData.assignee_id} onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-estimated_duration">Estimated Duration (hours)</Label>
                  <Input
                    id="edit-estimated_duration"
                    type="number"
                    step="0.5"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Task</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Comment Dialog */}
          {selectedTask && (
            <TaskCommentDialog
              open={isCommentDialogOpen}
              onClose={() => setIsCommentDialogOpen(false)}
              task={selectedTask}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Tasks;

</edits_to_apply>
