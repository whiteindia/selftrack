
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import TaskCommentDialog from '@/components/TaskCommentDialog';
import TimeTrackerWithComment from '@/components/TimeTrackerWithComment';
import { format } from 'date-fns';

interface Task {
  id: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  hours: number;
  date: string;
  deadline?: string;
  estimated_duration?: number;
  completion_date?: string;
  project_id: string;
  assignee_id?: string;
  assigner_id?: string;
  projects?: {
    name: string;
    clients: {
      name: string;
    };
  };
  employees?: {
    name: string;
  };
  assigners?: {
    name: string;
  };
}

const ITEMS_PER_PAGE = 20;

const Tasks = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCompleted, setShowCompleted] = useState(false);
  const queryClient = useQueryClient();

  // Fetch tasks with filters and pagination
  const { data: tasksResponse, isLoading, error } = useQuery({
    queryKey: ['tasks', searchTerm, statusFilter, projectFilter, currentPage, showCompleted],
    queryFn: async () => {
      console.log('Fetching tasks with filters:', { searchTerm, statusFilter, projectFilter, currentPage, showCompleted });
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects (
            name,
            clients (
              name
            )
          ),
          employees!tasks_assignee_id_fkey (
            name
          )
        `);

      // Apply status filter based on showCompleted toggle
      if (!showCompleted) {
        query = query.neq('status', 'Completed');
      }

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (projectFilter) {
        query = query.eq('project_id', projectFilter);
      }

      // Get total count for pagination
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .apply((builder) => {
          if (!showCompleted) {
            builder = builder.neq('status', 'Completed');
          }
          if (searchTerm) {
            builder = builder.ilike('name', `%${searchTerm}%`);
          }
          if (statusFilter) {
            builder = builder.eq('status', statusFilter);
          }
          if (projectFilter) {
            builder = builder.eq('project_id', projectFilter);
          }
          return builder;
        });

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE)
      };
    },
  });

  // Fetch projects for filter dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('Failed to delete task:', error);
      toast({
        title: "Error", 
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, completionDate }: { taskId: string; status: string; completionDate?: string }) => {
      console.log('Updating task:', { taskId, status, completionDate });
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (completionDate) {
        updateData.completion_date = completionDate;
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Task updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('Failed to update task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  });

  const handleStatusChange = (taskId: string, newStatus: string) => {
    const completionDate = newStatus === 'Completed' ? new Date().toISOString() : undefined;
    updateTaskMutation.mutate({ taskId, status: newStatus, completionDate });
  };

  const handleCommentClick = (task: Task) => {
    setSelectedTask(task);
    setCommentDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-500';
      case 'In Progress':
        return 'bg-blue-500';
      case 'Completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setProjectFilter('');
    setCurrentPage(1);
  };

  if (isLoading) {
    return <div className="p-6">Loading tasks...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error loading tasks: {error.message}</div>;
  }

  const { data: tasks = [], count = 0, totalPages = 0 } = tasksResponse || {};

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <Button>
            Add New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          
          <div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="Not Started">Not Started</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={projectFilter} onValueChange={(value) => {
              setProjectFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCompleted(!showCompleted);
                setCurrentPage(1);
              }}
              className="whitespace-nowrap"
            >
              {showCompleted ? 'Hide Completed' : 'Show Completed'}
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Results summary */}
        <div className="text-sm text-gray-600">
          Showing {tasks.length} of {count} tasks
          {!showCompleted && ' (excluding completed tasks)'}
        </div>

        {/* Tasks Grid */}
        <div className="grid gap-4">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No tasks found. Try adjusting your filters.
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{task.name}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Project: {task.projects?.name}</span>
                        <span>Client: {task.projects?.clients?.name}</span>
                        {task.employees?.name && (
                          <span>Assignee: {task.employees.name}</span>
                        )}
                      </div>
                    </div>
                    <Badge className={`${getStatusBadgeColor(task.status)} text-white`}>
                      {task.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Hours: {task.hours}</span>
                      <span>Date: {format(new Date(task.date), 'MMM dd, yyyy')}</span>
                      {task.deadline && (
                        <span>Deadline: {format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                      )}
                      {task.estimated_duration && (
                        <span>Estimated: {task.estimated_duration}h</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCommentClick(task)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      
                      {task.status !== 'Not Started' && task.status !== 'Completed' && (
                        <TimeTrackerWithComment taskId={task.id} />
                      )}
                      
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleStatusChange(task.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Not Started">Not Started</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
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
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskCommentDialog
          open={commentDialogOpen}
          onOpenChange={setCommentDialogOpen}
          task={selectedTask}
        />
      )}
    </>
  );
};

export default Tasks;
