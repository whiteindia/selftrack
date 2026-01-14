import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Filter, Check, ChevronDown, ChevronRight, Zap, ListTodo } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const QuickAddSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<"services" | "clients" | "projects">("services");
  
  // Selected filters
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  
  // Task form fields
  const [taskName, setTaskName] = useState('');
  const [taskStatus, setTaskStatus] = useState('Not Started');

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

  // Fetch tasks for selected project
  const { data: projectTasks = [] } = useQuery({
    queryKey: ['project-tasks-quick-add', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('id, name, status, date, hours, deadline')
        .eq('project_id', selectedProject)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
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
                  <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                    {projectTasks.map((task) => (
                      <div key={task.id} className="p-2 flex items-center justify-between gap-2 hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{task.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {task.deadline && (
                              <span>Due: {format(new Date(task.deadline), 'MMM d')}</span>
                            )}
                            {task.hours > 0 && <span>• {task.hours}h</span>}
                          </div>
                        </div>
                        <Badge 
                          variant={
                            task.status === 'Completed' || task.status === 'Won' ? 'default' :
                            task.status === 'In Progress' ? 'secondary' :
                            task.status === 'Lost' ? 'destructive' : 'outline'
                          }
                          className="text-xs shrink-0"
                        >
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default QuickAddSection;
