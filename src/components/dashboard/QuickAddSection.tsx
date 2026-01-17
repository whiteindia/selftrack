import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Filter, Check, ChevronDown, ChevronRight, Zap, ListTodo, Play, CalendarPlus, Trash2, ArrowDownToLine, Eye, Pencil, ArrowUpFromLine } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { ConvertToSubtaskDialog } from './ConvertToSubtaskDialog';
import { useNavigate } from 'react-router-dom';

const QuickAddSection: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<"services" | "clients" | "projects">("services");
  const [convertToSubtaskTask, setConvertToSubtaskTask] = useState<{ id: string; name: string } | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Selected filters
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  
  // Task form fields
  const [taskName, setTaskName] = useState('');
  const [taskStatus, setTaskStatus] = useState('Not Started');
  const [newSubtaskNames, setNewSubtaskNames] = useState<Record<string, string>>({});

  // Fetch all services
  const { data: services = [] } = useQuery({
    queryKey: ['all-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Get selected service IDs for client filtering
  const selectedServiceIds = useMemo(() => {
    return services
      .filter(s => selectedServices.includes(s.name))
      .map(s => s.id);
  }, [services, selectedServices]);

  // Fetch clients based on selected services
  // clients.services contains service IDs (UUIDs)
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-by-services', selectedServiceIds],
    queryFn: async () => {
      if (selectedServiceIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, services')
        .order('name');
      
      if (error) throw error;
      
      // Filter clients that have any of the selected service IDs
      return (data || []).filter(client => 
        client.services?.some((serviceId: string) => selectedServiceIds.includes(serviceId))
      );
    },
    enabled: selectedServiceIds.length > 0
  });

  // Fetch projects based on selected clients and services
  // projects.service contains service NAME, not ID
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-by-clients', selectedClients, selectedServices],
    queryFn: async () => {
      if (selectedClients.length === 0) return [];
      
      let query = supabase
        .from('projects')
        .select('id, name, service')
        .in('client_id', selectedClients)
        .order('name');
      
      // Also filter by selected service names (projects.service stores service name)
      if (selectedServices.length > 0) {
        query = query.in('service', selectedServices);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: selectedClients.length > 0
  });

  // Fetch tasks for selected project with subtask counts
  const { data: projectTasks = [] } = useQuery({
    queryKey: ['project-tasks-quick-add', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return [];
      
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, name, status, date, hours, deadline')
        .eq('project_id', selectedProject)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Fetch subtasks for all tasks
      const taskIds = (tasks || []).map(t => t.id);
      const { data: subtasks } = await supabase
        .from('subtasks')
        .select('id, name, status, deadline, task_id, estimated_duration, assignee_id')
        .in('task_id', taskIds);
      
      // Group subtasks by task_id
      const subtasksByTask: Record<string, typeof subtasks> = {};
      (subtasks || []).forEach(st => {
        if (!subtasksByTask[st.task_id]) subtasksByTask[st.task_id] = [];
        subtasksByTask[st.task_id].push(st);
      });
      
      return (tasks || []).map(task => ({
        ...task,
        subtasks: subtasksByTask[task.id] || [],
        subtask_count: (subtasksByTask[task.id] || []).filter(st => st.status !== 'Completed').length
      }));
    },
    enabled: !!selectedProject
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProject || !taskName.trim()) {
        throw new Error('Project and task name are required');
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          name: taskName.trim(),
          project_id: selectedProject,
          status: taskStatus as 'Not Started' | 'In Progress' | 'Assigned' | 'Completed',
          date: new Date().toISOString().split('T')[0],
          hours: 0,
          invoiced: false
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Task created successfully');
      setTaskName('');
      queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['runningTasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks-quick-add', selectedProject] });
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  });

  // Start task mutation
  const startTaskMutation = useMutation({
    mutationFn: async ({ taskId, taskName }: { taskId: string; taskName: string }) => {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();

      if (empError || !employee) {
        throw new Error('Employee record not found');
      }

      const startTime = new Date().toISOString();

      const { data: timeEntry, error: timeError } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          employee_id: employee.id,
          start_time: startTime,
          entry_type: 'running'
        })
        .select()
        .single();

      if (timeError) throw timeError;

      // Update task status to In Progress
      await supabase
        .from('tasks')
        .update({ status: 'In Progress' })
        .eq('id', taskId);

      return { timeEntry, taskName };
    },
    onSuccess: ({ taskName }) => {
      toast.success(`Timer started for "${taskName}"`);
      queryClient.invalidateQueries({ queryKey: ['runningTasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks-quick-add', selectedProject] });
    },
    onError: (error) => {
      console.error('Error starting task:', error);
      toast.error('Failed to start task');
    }
  });

  // Add to workload mutation
  const addToWorkloadMutation = useMutation({
    mutationFn: async (task: any) => {
      const now = new Date();
      const slotDate = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      const startHour = currentHour.toString().padStart(2, '0') + ':00';
      const endHour = (currentHour + 1).toString().padStart(2, '0') + ':00';

      const slotStartDatetime = `${slotDate}T${startHour}:00`;
      const slotEndDatetime = `${slotDate}T${endHour}:00`;

      const { error } = await supabase
        .from('tasks')
        .update({
          slot_start_datetime: slotStartDatetime,
          slot_end_datetime: slotEndDatetime
        })
        .eq('id', task.id);

      if (error) throw error;
      return task;
    },
    onSuccess: (task) => {
      toast.success(`"${task.name}" added to current workload slot`);
      queryClient.invalidateQueries({ queryKey: ['project-tasks-quick-add', selectedProject] });
    },
    onError: (error) => {
      console.error('Error adding to workload:', error);
      toast.error('Failed to add to workload');
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
    onSuccess: async () => {
      toast.success('Task deleted successfully');
      // Use refetchQueries for immediate UI update (works better on mobile)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['project-tasks-quick-add', selectedProject] }),
        queryClient.refetchQueries({ queryKey: ['quick-tasks'] }),
        queryClient.refetchQueries({ queryKey: ['tasks'] }),
        queryClient.refetchQueries({ queryKey: ['current-shift-workload'] }),
        queryClient.refetchQueries({ queryKey: ['activity-feed'] }),
      ]);
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  });

  // Delete subtask mutation
  const deleteSubtaskMutation = useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Subtask deleted successfully');
      // Use refetchQueries for immediate UI update (works better on mobile)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['project-tasks-quick-add', selectedProject] }),
        queryClient.refetchQueries({ queryKey: ['subtasks'] }),
        queryClient.refetchQueries({ queryKey: ['quick-tasks'] }),
        queryClient.refetchQueries({ queryKey: ['tasks'] }),
        queryClient.refetchQueries({ queryKey: ['current-shift-workload'] }),
        queryClient.refetchQueries({ queryKey: ['activity-feed'] }),
      ]);
    },
    onError: (error) => {
      console.error('Error deleting subtask:', error);
      toast.error('Failed to delete subtask');
    }
  });

  // Convert subtask to task mutation
  const convertSubtaskToTaskMutation = useMutation({
    mutationFn: async ({ subtaskId, subtaskName }: { subtaskId: string; subtaskName: string }) => {
      // First get subtask details
      const { data: subtask, error: fetchError } = await supabase
        .from('subtasks')
        .select('*')
        .eq('id', subtaskId)
        .single();

      if (fetchError) throw fetchError;

      // Create new task
      const { error: createError } = await supabase
        .from('tasks')
        .insert({
          name: subtaskName,
          project_id: selectedProject,
          status: subtask.status as any,
          deadline: subtask.deadline,
          date: new Date().toISOString().split('T')[0],
          hours: 0,
          invoiced: false
        });

      if (createError) throw createError;

      // Delete subtask
      const { error: deleteError } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);

      if (deleteError) throw deleteError;
    },
    onSuccess: async () => {
      toast.success('Subtask converted to task');
      // Use refetchQueries for immediate UI update (works better on mobile)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['project-tasks-quick-add', selectedProject] }),
        queryClient.refetchQueries({ queryKey: ['subtasks'] }),
        queryClient.refetchQueries({ queryKey: ['quick-tasks'] }),
        queryClient.refetchQueries({ queryKey: ['tasks'] }),
        queryClient.refetchQueries({ queryKey: ['current-shift-workload'] }),
        queryClient.refetchQueries({ queryKey: ['activity-feed'] }),
      ]);
    },
    onError: (error) => {
      console.error('Error converting subtask:', error);
      toast.error('Failed to convert subtask');
    }
  });

  // Add subtask to workload mutation
  const addSubtaskToWorkloadMutation = useMutation({
    mutationFn: async (subtask: { id: string; name: string }) => {
      const now = new Date();
      const slotDate = now.toISOString().split('T')[0];
      const currentHour = now.getHours();
      const startHour = currentHour.toString().padStart(2, '0') + ':00';
      const endHour = (currentHour + 1).toString().padStart(2, '0') + ':00';

      const slotStartDatetime = `${slotDate}T${startHour}:00`;
      const slotEndDatetime = `${slotDate}T${endHour}:00`;

      // Get parent task to update its slot
      const { data: subtaskData } = await supabase
        .from('subtasks')
        .select('task_id')
        .eq('id', subtask.id)
        .single();

      if (subtaskData) {
        const { error } = await supabase
          .from('tasks')
          .update({
            slot_start_datetime: slotStartDatetime,
            slot_end_datetime: slotEndDatetime
          })
          .eq('id', subtaskData.task_id);

        if (error) throw error;
      }
      return subtask;
    },
    onSuccess: (subtask) => {
      toast.success(`"${subtask.name}" added to current workload slot`);
      queryClient.invalidateQueries({ queryKey: ['project-tasks-quick-add', selectedProject] });
    },
    onError: (error) => {
      console.error('Error adding subtask to workload:', error);
      toast.error('Failed to add to workload');
    }
  });

  // Create subtask mutation
  const createSubtaskMutation = useMutation({
    mutationFn: async ({ taskId, names }: { taskId: string; names: string[] }) => {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();

      if (empError || !employee) {
        throw new Error('Employee record not found');
      }

      const rows = names.map(name => ({
        name,
        task_id: taskId,
        status: 'Not Started',
        assigner_id: employee.id
      }));

      const { error } = await supabase
        .from('subtasks')
        .insert(rows);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success('Subtask created successfully');
      setNewSubtaskNames(prev => ({ ...prev, [variables.taskId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['project-tasks-quick-add', selectedProject] });
    },
    onError: (error) => {
      console.error('Error creating subtask:', error);
      toast.error('Failed to create subtask');
    }
  });

  const handleAddSubtask = (taskId: string) => (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newSubtaskNames[taskId] || '';
    const names = raw
      .split(/\r?\n/)
      .flatMap(line => line.split(','))
      .map(name => name.trim())
      .filter(Boolean);

    if (names.length === 0) return;
    createSubtaskMutation.mutate({ taskId, names });
  };

  const toggleService = (serviceName: string) => {
    setSelectedServices(prev => {
      const newServices = prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName];
      
      // Clear dependent filters when services change
      setSelectedClients([]);
      setSelectedProject('');
      setActiveFilterTab(newServices.length > 0 ? "clients" : "services");
      
      return newServices;
    });
  };

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const newClients = prev.includes(clientId)
        ? prev.filter(c => c !== clientId)
        : [...prev, clientId];
      
      // Clear dependent filters when clients change
      setSelectedProject('');
      setActiveFilterTab(newClients.length > 0 ? "projects" : "clients");
      
      return newClients;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate();
  };

  const canAddTask = selectedProject && taskName.trim();

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="px-6 py-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-amber-600" />
                  Quick Add Task
                </CardTitle>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-2 py-4 sm:px-6 sm:py-6">
            {/* Global Filter (Cascade) with tab-style buttons: Services → Clients → Projects */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Select Filters:</span>
              </div>

              <Tabs value={activeFilterTab} onValueChange={(v) => setActiveFilterTab(v as any)}>
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="services">Services</TabsTrigger>
                  {selectedServices.length > 0 && <TabsTrigger value="clients">Clients</TabsTrigger>}
                  {selectedClients.length > 0 && <TabsTrigger value="projects">Projects</TabsTrigger>}
                </TabsList>

                <TabsContent value="services" className="mt-3">
                  {services.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {services.map((service) => (
                        <Button
                          key={service.id}
                          variant={selectedServices.includes(service.name) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleService(service.name)}
                          className="flex items-center gap-2 text-xs"
                        >
                          {selectedServices.includes(service.name) && <Check className="h-3 w-3" />}
                          {service.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No services found</div>
                  )}
                </TabsContent>

                <TabsContent value="clients" className="mt-3">
                  {selectedServices.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Select a service to see clients.</div>
                  ) : clients.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {clients.map((client) => (
                        <Button
                          key={client.id}
                          variant={selectedClients.includes(client.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleClient(client.id)}
                          className="flex items-center gap-2 text-xs"
                        >
                          {selectedClients.includes(client.id) && <Check className="h-3 w-3" />}
                          {client.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No clients found for selected services</div>
                  )}
                </TabsContent>

                <TabsContent value="projects" className="mt-3">
                  {selectedClients.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Select a client to see projects.</div>
                  ) : projects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {projects.map((project) => (
                        <Button
                          key={project.id}
                          variant={selectedProject === project.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedProject(project.id)}
                          className="flex items-center gap-2 text-xs"
                        >
                          {selectedProject === project.id && <Check className="h-3 w-3" />}
                          {project.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No projects found for selected clients</div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Selection Summary */}
              {(selectedServices.length > 0 || selectedClients.length > 0 || selectedProject) && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  {selectedServices.length > 0 && <span>Services: {selectedServices.join(', ')}</span>}
                  {selectedClients.length > 0 && (
                    <span className="ml-2">| Clients: {clients.filter(c => selectedClients.includes(c.id)).map(c => c.name).join(', ')}</span>
                  )}
                  {selectedProject && (
                    <span className="ml-2">| Project: {projects.find(p => p.id === selectedProject)?.name}</span>
                  )}
                </div>
              )}
            </div>

            {/* Quick Add Form */}
            {selectedProject ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Task name..."
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={taskStatus} onValueChange={setTaskStatus}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Won">Won</SelectItem>
                      <SelectItem value="Lost">Lost</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                      <SelectItem value="On-Head">On-Head</SelectItem>
                      <SelectItem value="Targeted">Targeted</SelectItem>
                      <SelectItem value="Imp">Imp</SelectItem>
                      <SelectItem value="Assigned">Assigned</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    type="submit" 
                    disabled={!canAddTask || createTaskMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Select a project above to add tasks quickly
              </div>
            )}

            {/* Collapsible Task List for Selected Project */}
            {selectedProject && projectTasks.length > 0 && (
              <Collapsible open={isTaskListOpen} onOpenChange={setIsTaskListOpen} className="mt-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between px-2 py-2 h-auto">
                    <div className="flex items-center gap-2">
                      <ListTodo className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Project Tasks ({projectTasks.length})
                      </span>
                    </div>
                    {isTaskListOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="border rounded-md max-h-[400px] overflow-y-auto">
                    {projectTasks.map((task: any) => (
                      <div key={task.id} className="border-b last:border-b-0">
                        {/* Task Row */}
                        <div className="p-2 flex items-center justify-between gap-2 hover:bg-muted/50">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">Task</Badge>
                              <p className="text-sm font-medium truncate">{task.name}</p>
                              {task.subtask_count > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0 bg-green-100 text-green-800">
                                  {task.subtask_count} subtasks
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {task.deadline && (
                                <span>Due: {format(new Date(task.deadline), 'MMM d')}</span>
                              )}
                              <Badge 
                                variant={
                                  task.status === 'Completed' || task.status === 'Won' ? 'default' :
                                  task.status === 'In Progress' ? 'secondary' :
                                  task.status === 'Lost' ? 'destructive' : 'outline'
                                }
                                className="text-[10px] px-1 py-0"
                              >
                                {task.status}
                              </Badge>
                              {task.hours > 0 && <span>• {task.hours}h</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                              title="View Details"
                              className="h-7 w-7"
                            >
                              <Eye className={`h-4 w-4 ${expandedTaskId === task.id ? 'text-primary' : ''}`} />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => startTaskMutation.mutate({ taskId: task.id, taskName: task.name })}
                              disabled={task.status === 'Completed' || task.status === 'In Progress' || startTaskMutation.isPending}
                              className="h-7 w-7"
                              title="Start"
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => addToWorkloadMutation.mutate(task)}
                              disabled={addToWorkloadMutation.isPending}
                              title="Add to Workload"
                              className="h-7 w-7"
                            >
                              <CalendarPlus className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setConvertToSubtaskTask({ id: task.id, name: task.name })}
                              title="Make it Subtask"
                              className="h-7 w-7"
                            >
                              <ArrowDownToLine className="h-4 w-4 text-purple-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Delete "${task.name}"?`)) {
                                  deleteTaskMutation.mutate(task.id);
                                }
                              }}
                              disabled={deleteTaskMutation.isPending}
                              title="Delete"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Task Details with Subtasks */}
                        {expandedTaskId === task.id && (
                          <div className="px-3 pb-3 bg-muted/30 border-t">
                            {/* Full Task Title */}
                            <div className="py-2 border-b border-dashed">
                              <p className="text-sm font-medium">{task.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                {task.deadline && (
                                  <span>Due: {format(new Date(task.deadline), 'MMM d, yyyy')}</span>
                                )}
                                <span>Status: {task.status}</span>
                                {task.hours > 0 && <span>Hours: {task.hours}h</span>}
                              </div>
                            </div>

                            {/* Subtasks Section */}
                            <div className="mt-2">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Subtasks ({task.subtasks?.length || 0})
                              </p>
                              <form onSubmit={handleAddSubtask(task.id)} className="flex items-center gap-2 mb-2">
                                <Textarea
                                  placeholder="Add subtasks (one per line or comma-separated)"
                                  value={newSubtaskNames[task.id] || ''}
                                  onChange={(e) => setNewSubtaskNames(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddSubtask(task.id)(e as unknown as React.FormEvent);
                                    }
                                  }}
                                  className="min-h-[48px] resize-none"
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={createSubtaskMutation.isPending || !(newSubtaskNames[task.id] || '').trim()}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              </form>
                              {task.subtasks && task.subtasks.length > 0 ? (
                                <div className="space-y-2">
                                  {task.subtasks.map((subtask: any) => (
                                    <div key={subtask.id} className="p-2 rounded border bg-background">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 bg-purple-50 text-purple-700 border-purple-200">
                                              Subtask
                                            </Badge>
                                            <p className="text-sm truncate">{subtask.name}</p>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                            <Badge 
                                              variant={
                                                subtask.status === 'Completed' ? 'default' :
                                                subtask.status === 'In Progress' ? 'secondary' : 'outline'
                                              }
                                              className="text-[10px] px-1 py-0"
                                            >
                                              {subtask.status}
                                            </Badge>
                                            {subtask.deadline && (
                                              <span>Due: {format(new Date(subtask.deadline), 'MMM d')}</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => addSubtaskToWorkloadMutation.mutate({ id: subtask.id, name: subtask.name })}
                                            disabled={addSubtaskToWorkloadMutation.isPending}
                                            title="Add to Workload"
                                            className="h-6 w-6"
                                          >
                                            <CalendarPlus className="h-3 w-3 text-blue-600" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                              if (confirm("Convert this subtask to a task?")) {
                                                convertSubtaskToTaskMutation.mutate({ subtaskId: subtask.id, subtaskName: subtask.name });
                                              }
                                            }}
                                            disabled={convertSubtaskToTaskMutation.isPending}
                                            title="Convert to Task"
                                            className="h-6 w-6"
                                          >
                                            <ArrowUpFromLine className="h-3 w-3 text-green-600" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => navigate(`/alltasks?highlight=${task.id}`)}
                                            title="View in All Tasks"
                                            className="h-6 w-6"
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                              if (confirm(`Delete subtask "${subtask.name}"?`)) {
                                                deleteSubtaskMutation.mutate(subtask.id);
                                              }
                                            }}
                                            disabled={deleteSubtaskMutation.isPending}
                                            title="Delete"
                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">No subtasks</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Convert to Subtask Dialog */}
            <ConvertToSubtaskDialog
              open={!!convertToSubtaskTask}
              onOpenChange={(open) => !open && setConvertToSubtaskTask(null)}
              sourceTask={convertToSubtaskTask}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['project-tasks-quick-add', selectedProject] });
              }}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default QuickAddSection;
