import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import Navigation from '@/components/Navigation';
import TaskTimer from '@/components/TaskTimer';
import { toast } from 'sonner';

interface Task {
  id: string;
  name: string;
  assignee_name?: string;
  sprint_name?: string;
  project_name: string;
  client_name: string;
  status: string;
  scheduled_time?: string;
}

interface TaskAssignment {
  id: string;
  task_id: string;
  scheduled_date: string;
  scheduled_time: string;
  task: Task;
}

const WorkloadCal = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [assignDialogClient, setAssignDialogClient] = useState<string>('');
  const [assignDialogProject, setAssignDialogProject] = useState<string>('');
  
  const queryClient = useQueryClient();

  // Generate time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  // Fetch task assignments for the selected date
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['workload-assignments', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('Fetching assignments for date:', dateStr);
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          scheduled_time,
          assignee:employees!tasks_assignee_id_fkey(name),
          project:projects!tasks_project_id_fkey(
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `)
        .eq('date', dateStr)
        .not('scheduled_time', 'is', null);

      if (error) {
        console.error('Error fetching assignments:', error);
        throw error;
      }

      console.log('Raw assignments data:', data);

      // Get sprint information separately
      const taskIds = data?.map(task => task.id) || [];
      let sprintData: any[] = [];
      
      if (taskIds.length > 0) {
        const { data: sprints, error: sprintError } = await supabase
          .from('sprint_tasks')
          .select(`
            task_id,
            sprint:sprints!sprint_tasks_sprint_id_fkey(name)
          `)
          .in('task_id', taskIds);

        if (sprintError) {
          console.error('Error fetching sprints:', sprintError);
        } else {
          sprintData = sprints || [];
        }
      }

      console.log('Sprint data:', sprintData);

      const result = data?.map(task => {
        const sprintInfo = sprintData.find(s => s.task_id === task.id);
        
        return {
          id: task.id,
          task_id: task.id,
          scheduled_date: dateStr,
          scheduled_time: task.scheduled_time || '09:00',
          task: {
            id: task.id,
            name: task.name,
            assignee_name: task.assignee?.name || 'Unassigned',
            sprint_name: sprintInfo?.sprint?.name || null,
            project_name: task.project?.name || '',
            client_name: task.project?.client?.name || '',
            status: task.status,
            scheduled_time: task.scheduled_time
          }
        };
      }) || [];

      console.log('Processed assignments:', result);
      return result;
    }
  });

  // Fetch available tasks for assignment (non-completed and not already assigned for this date)
  const { data: availableTasks = [] } = useQuery({
    queryKey: ['available-tasks', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          date,
          scheduled_time,
          project:projects!tasks_project_id_fkey(
            name,
            client:clients!projects_client_id_fkey(name)
          )
        `)
        .neq('status', 'Completed')
        .or(`date.is.null,date.neq.${dateStr},scheduled_time.is.null`);

      if (error) {
        console.error('Error fetching available tasks:', error);
        throw error;
      }

      return data?.map(task => ({
        id: task.id,
        name: task.name,
        project_name: task.project?.name || '',
        client_name: task.project?.client?.name || '',
        status: task.status
      })) || [];
    }
  });

  // Get unique clients and projects from assignments for top filters
  const clients = [...new Set(assignments.map(a => a.task.client_name))].filter(Boolean);
  
  // Filter projects based on selected client
  const projects = selectedClient === 'all' 
    ? [...new Set(assignments.map(a => a.task.project_name))].filter(Boolean)
    : [...new Set(assignments.filter(a => a.task.client_name === selectedClient).map(a => a.task.project_name))].filter(Boolean);

  // Get unique clients and projects from available tasks for assignment dialog
  const assignClients = [...new Set(availableTasks.map(t => t.client_name))].filter(Boolean);
  const assignProjects = assignDialogClient === 'all' || !assignDialogClient
    ? [...new Set(availableTasks.map(t => t.project_name))].filter(Boolean)
    : [...new Set(availableTasks.filter(t => t.client_name === assignDialogClient).map(t => t.project_name))].filter(Boolean);

  // Reset project selection when client changes
  useEffect(() => {
    if (selectedClient !== 'all') {
      setSelectedProject('all');
    }
  }, [selectedClient]);

  // Filter assignments based on selected filters
  const filteredAssignments = assignments.filter(assignment => {
    if (selectedClient !== 'all' && assignment.task.client_name !== selectedClient) return false;
    if (selectedProject !== 'all' && assignment.task.project_name !== selectedProject) return false;
    return true;
  });

  // Filter available tasks for assignment dialog
  const filteredAvailableTasks = availableTasks.filter(task => {
    if (assignDialogClient && assignDialogClient !== 'all' && task.client_name !== assignDialogClient) return false;
    if (assignDialogProject && assignDialogProject !== 'all' && task.project_name !== assignDialogProject) return false;
    return true;
  });

  // Filter assignments for clear dialog - only show In Progress tasks
  const inProgressAssignments = assignments.filter(assignment => 
    assignment.task.status === 'In Progress'
  );

  // Group assignments by time slot
  const assignmentsByTime = filteredAssignments.reduce((acc, assignment) => {
    const time = assignment.scheduled_time;
    if (!acc[time]) acc[time] = [];
    acc[time].push(assignment);
    return acc;
  }, {} as Record<string, TaskAssignment[]>);

  // Assign task mutation
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, timeSlot }: { taskId: string; timeSlot: string }) => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      console.log('Assigning task:', { taskId, timeSlot, dateStr });
      
      const { error } = await supabase
        .from('tasks')
        .update({
          date: dateStr,
          scheduled_time: timeSlot
        })
        .eq('id', taskId);

      if (error) {
        console.error('Assignment error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      setIsAssignDialogOpen(false);
      setSelectedTimeSlot('');
      setAssignDialogClient('');
      setAssignDialogProject('');
      toast.success('Task assigned successfully');
    },
    onError: (error) => {
      console.error('Assignment mutation error:', error);
      toast.error('Failed to assign task');
    }
  });

  // Clear assignment mutation
  const clearAssignmentMutation = useMutation({
    mutationFn: async (taskId: string) => {
      console.log('Clearing assignment for task:', taskId);
      
      const { data, error } = await supabase
        .from('tasks')
        .update({
          scheduled_time: null
        })
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Clear assignment error:', error);
        throw error;
      }

      console.log('Assignment cleared successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      toast.success('Assignment cleared successfully');
    },
    onError: (error) => {
      console.error('Clear assignment mutation error:', error);
      toast.error('Failed to clear assignment');
    }
  });

  const handleAssignTask = (taskId: string) => {
    if (!selectedTimeSlot) {
      toast.error('Please select a time slot');
      return;
    }
    assignTaskMutation.mutate({ taskId, timeSlot: selectedTimeSlot });
  };

  const handleOpenAssignDialog = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setIsAssignDialogOpen(true);
  };

  const handleClearAssignment = (taskId: string) => {
    console.log('Handle clear assignment called for task:', taskId);
    clearAssignmentMutation.mutate(taskId);
  };

  const formatTimeSlot = (time: string) => {
    const [hour] = time.split(':');
    const hourNum = parseInt(hour);
    const nextHour = hourNum + 1;
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const nextAmpm = nextHour >= 24 ? 'AM' : nextHour >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    const displayNextHour = nextHour === 0 ? 12 : nextHour > 12 ? nextHour - 12 : nextHour === 24 ? 12 : nextHour;
    
    return `${displayHour}:00 ${ampm} – ${displayNextHour}:00 ${nextAmpm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTimeUpdate = () => {
    // Refresh the assignments data when timer is updated
    queryClient.invalidateQueries({ queryKey: ['workload-assignments'] });
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Workload Calendar</h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Navigation */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="shrink-0"
            >
              Previous Day
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0 justify-start text-left min-w-[180px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">{format(selectedDate, 'PPP')}</span>
                  <span className="sm:hidden">{format(selectedDate, 'PP')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="shrink-0"
            >
              Next Day
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Client Filters */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Clients</h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              <Button
                size="sm"
                variant={selectedClient === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedClient('all')}
              >
                All Clients
              </Button>
              {clients.map(client => (
                <Button
                  key={client}
                  size="sm"
                  variant={selectedClient === client ? 'default' : 'outline'}
                  onClick={() => setSelectedClient(client)}
                >
                  {client}
                </Button>
              ))}
            </div>
          </div>

          {/* Project Filters */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Projects</h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              <Button
                size="sm"
                variant={selectedProject === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedProject('all')}
              >
                All Projects
              </Button>
              {projects.map(project => (
                <Button
                  key={project}
                  size="sm"
                  variant={selectedProject === project ? 'default' : 'outline'}
                  onClick={() => setSelectedProject(project)}
                >
                  {project}
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
            <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Clear Assignments
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Clear Task Assignments (In Progress Only)</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {inProgressAssignments.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        No in-progress tasks assigned for this day
                      </div>
                    ) : (
                      inProgressAssignments.map(assignment => (
                        <Card key={assignment.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleClearAssignment(assignment.task_id)}>
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="font-medium">{assignment.task.name}</div>
                              <Badge className={getStatusColor(assignment.task.status)}>
                                {assignment.task.status}
                              </Badge>
                              <div className="text-sm text-gray-600">
                                {assignment.task.client_name} - {assignment.task.project_name}
                              </div>
                              <div className="text-sm text-blue-600">
                                Scheduled: {formatTimeSlot(assignment.scheduled_time)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Assign Task Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Task to {formatTimeSlot(selectedTimeSlot)}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Client</h4>
                <Select onValueChange={setAssignDialogClient}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {assignClients.map(client => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Project</h4>
                <Select onValueChange={setAssignDialogProject}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {assignProjects.map(project => (
                      <SelectItem key={project} value={project}>{project}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredAvailableTasks.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No available tasks for this day
                  </div>
                ) : (
                  filteredAvailableTasks.map(task => (
                    <Card key={task.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleAssignTask(task.id)}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="font-medium">{task.name}</div>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {task.client_name} - {task.project_name}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Calendar Grid */}
        <div className="grid gap-4">
          {timeSlots.map(timeSlot => {
            const slotAssignments = assignmentsByTime[timeSlot] || [];
            
            return (
              <Card key={timeSlot}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{formatTimeSlot(timeSlot)}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAssignDialog(timeSlot)}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Task
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {slotAssignments.length === 0 ? (
                    <div className="text-gray-500 text-sm">No tasks assigned</div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {slotAssignments.map(assignment => (
                        <Card key={assignment.id} className="border border-gray-200 relative">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Clear button clicked for task:', assignment.task_id);
                              handleClearAssignment(assignment.task_id);
                            }}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 hover:text-red-700 transition-colors z-10"
                            title="Clear assignment"
                            disabled={clearAssignmentMutation.isPending}
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <CardContent className="p-3 pr-8">
                            <div className="space-y-2">
                              {/* Assignee name */}
                              <div className="text-xs text-gray-600">
                                👤 {assignment.task.assignee_name}
                              </div>
                              
                              {/* Task description */}
                              <div className="font-medium text-sm">{assignment.task.name}</div>
                              
                              {/* Sprint badge */}
                              {assignment.task.sprint_name && (
                                <Badge variant="outline" className="text-xs">
                                  🏃 {assignment.task.sprint_name}
                                </Badge>
                              )}
                              
                              {/* Timer section */}
                              <div className="pt-2 border-t border-gray-100">
                                <TaskTimer
                                  taskId={assignment.task.id}
                                  taskName={assignment.task.name}
                                  onTimeUpdate={handleTimeUpdate}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Navigation>
  );
};

export default WorkloadCal;
