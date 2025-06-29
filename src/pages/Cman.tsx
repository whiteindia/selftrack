import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Navigation from '@/components/Navigation';
import TaskKanban from '@/components/TaskKanban';
import KanbanSprintDialog from '@/components/KanbanSprintDialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';

type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'On-Head' | 'Targeted' | 'Imp';

const Cman = () => {
  const { user } = useAuth();
  const { hasPageAccess } = usePrivileges();
  
  // Default selected services for Cman
  const defaultServices = ['Cman●FRC'];

  const [selectedServices, setSelectedServices] = useState<string[]>(defaultServices);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showSprintDialog, setShowSprintDialog] = useState(false);
  const [sprintTaskIds, setSprintTaskIds] = useState<string[]>([]);
  const [sprintProjectId, setSprintProjectId] = useState<string>();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch clients filtered by selected services
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', selectedServices],
    queryFn: async () => {
      if (selectedServices.length === 0) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .overlaps('services', selectedServices);
      
      if (error) throw error;
      return data || [];
    },
    enabled: selectedServices.length > 0,
  });

  // Fetch projects filtered by selected clients
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', selectedClients],
    queryFn: async () => {
      if (selectedClients.length === 0) return [];
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients!inner(name)
        `)
        .in('client_id', selectedClients);
      
      if (error) throw error;
      return data || [];
    },
    enabled: selectedClients.length > 0,
  });

  // Fetch tasks filtered by selected projects
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', selectedProjects],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:employees!tasks_assignee_id_fkey(name),
          assigner:employees!tasks_assigner_id_fkey(name),
          projects!inner(name, clients!inner(name))
        `);

      if (selectedProjects.length > 0) {
        query = query.in('project_id', selectedProjects);
      } else if (selectedClients.length > 0) {
        const projectIds = projects.map(p => p.id);
        if (projectIds.length > 0) {
          query = query.in('project_id', projectIds);
        }
      } else if (selectedServices.length > 0) {
        const clientIds = clients.map(c => c.id);
        if (clientIds.length > 0) {
          const allProjects = await supabase
            .from('projects')
            .select('id')
            .in('client_id', clientIds);
          
          const projectIds = allProjects.data?.map(p => p.id) || [];
          if (projectIds.length > 0) {
            query = query.in('project_id', projectIds);
          }
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      return (data || []).map(task => ({
        ...task,
        project_name: task.projects?.name || 'Unknown Project'
      }));
    },
    enabled: selectedServices.length > 0,
  });

  const toggleService = (serviceName: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
    setSelectedClients([]);
    setSelectedProjects([]);
  };

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId)
        ? prev.filter(c => c !== clientId)
        : [...prev, clientId]
    );
    setSelectedProjects([]);
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(p => p !== projectId)
        : [...prev, projectId]
    );
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
      
      if (error) throw error;
      refetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleCreateSprint = (selectedTaskIds: string[], projectId?: string) => {
    setSprintTaskIds(selectedTaskIds);
    setSprintProjectId(projectId);
    setShowSprintDialog(true);
  };

  const handleSprintSuccess = () => {
    setShowSprintDialog(false);
    setSprintTaskIds([]);
    setSprintProjectId(undefined);
    refetchTasks();
  };

  const canCreate = hasPageAccess('tasks');

  return (
    <Navigation>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Cman</h1>
        
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-between w-full p-0 h-auto">
                  <CardTitle className="text-lg font-medium">Filters</CardTitle>
                  {isFiltersOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {/* Service Filter */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <Button
                        key={service.id}
                        variant={selectedServices.includes(service.name) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleService(service.name)}
                        className="flex items-center gap-2"
                      >
                        {selectedServices.includes(service.name) && <Check className="h-3 w-3" />}
                        {service.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Client Filter */}
                {clients.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Clients</h3>
                    <div className="flex flex-wrap gap-2">
                      {clients.map((client) => (
                        <Button
                          key={client.id}
                          variant={selectedClients.includes(client.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleClient(client.id)}
                          className="flex items-center gap-2"
                        >
                          {selectedClients.includes(client.id) && <Check className="h-3 w-3" />}
                          {client.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Filter */}
                {projects.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Projects</h3>
                    <div className="flex flex-wrap gap-2">
                      {projects.map((project) => (
                        <Button
                          key={project.id}
                          variant={selectedProjects.includes(project.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleProject(project.id)}
                          className="flex items-center gap-2"
                        >
                          {selectedProjects.includes(project.id) && <Check className="h-3 w-3" />}
                          {project.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <TaskKanban 
          tasks={tasks}
          canCreate={canCreate}
          canUpdate={hasPageAccess('tasks')}
          canDelete={hasPageAccess('tasks')}
          onTaskStatusChange={handleTaskStatusChange}
          showTaskSelection={true}
          onCreateSprint={handleCreateSprint}
          collapsibleColumns={true}
          statusOrder={['Overdue', 'On-Head', 'Not Started', 'In Progress', 'On Hold', 'Targeted', 'Imp', 'Completed']}
        />

        <KanbanSprintDialog
          open={showSprintDialog}
          onOpenChange={setShowSprintDialog}
          selectedTaskIds={sprintTaskIds}
          projectId={sprintProjectId}
          onSuccess={handleSprintSuccess}
        />
      </div>
    </Navigation>
  );
};

export default Cman;
