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
import TaskTable from '@/components/TaskTable';
import ViewModeToggle from '@/components/ViewModeToggle';
import { useViewMode } from '@/hooks/useViewMode';

type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'On-Head' | 'Targeted' | 'Imp' | 'Overdue';

const Myself = () => {
  const { user } = useAuth();
  const { hasPageAccess } = usePrivileges();
  const { viewMode, setViewMode } = useViewMode('kanban');
  
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showSprintDialog, setShowSprintDialog] = useState(false);
  const [sprintTaskIds, setSprintTaskIds] = useState<string[]>([]);
  const [sprintProjectId, setSprintProjectId] = useState<string>();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Fetch ALL services from Supabase services table
  const { data: allServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      console.log('Fetching all services from Supabase services table...');
      const { data, error } = await supabase
        .from('services')
        .select('name')
        .order('name');
      
      if (error) {
        console.error('Error fetching services:', error);
        throw error;
      }
      
      return data || [];
    },
  });

  // Fetch all tasks with their full project and client information
  const { data: allTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['myself-all-tasks'],
    queryFn: async () => {
      console.log('Fetching all tasks with project and client information...');
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:employees!tasks_assignee_id_fkey(name),
          assigner:employees!tasks_assigner_id_fkey(name),
          projects!inner(
            id,
            name,
            service,
            client_id,
            clients!inner(
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
      
      // Transform tasks to include flattened project and client information
      const transformedTasks = (data || []).map(task => ({
        ...task,
        project_name: task.projects?.name || 'Unknown Project',
        project_service: task.projects?.service || '',
        client_id: task.projects?.clients?.id || '',
        client_name: task.projects?.clients?.name || '',
      }));
      
      console.log('All tasks fetched:', transformedTasks);
      return transformedTasks;
    },
  });

  // Get Myself-specific services and pre-fill them
  const myselfServices = useMemo(() => {
    const myselfKeywords = [
      'Self_Hygiene_HKeep-Cook-Preserve',
      'Selfjoy_Luxury-Ent-Enjoy-Fun',
      'Self_Appearance_Groom-BodyCare-Cloths',
      'Self_Health-Diet-Fit-Medication',
      'Self_Improve-Cit_Growth-Frc_Upskill-Cy',
      'Self_Hygiene-HKeep-Cook-Preserve'
    ];
    
    return allServices.filter(service => 
      service.name && myselfKeywords.some(keyword => service.name.includes(keyword))
    );
  }, [allServices]);

  // Set default services when services are loaded (Myself specific)
  React.useEffect(() => {
    if (myselfServices.length > 0 && selectedServices.length === 0) {
      const serviceNames = myselfServices.map(s => s.name);
      console.log('Pre-filling Myself services:', serviceNames);
      setSelectedServices(serviceNames);
    }
  }, [myselfServices, selectedServices.length]);

  // Pre-filter tasks based on Myself service criteria
  const myselfFilteredTasks = useMemo(() => {
    const myselfKeywords = [
      'Self_Hygiene_HKeep-Cook-Preserve',
      'Selfjoy_Luxury-Ent-Enjoy-Fun',
      'Self_Appearance_Groom-BodyCare-Cloths',
      'Self_Health-Diet-Fit-Medication',
      'Self_Improve-Cit_Growth-Frc_Upskill-Cy',
      'Self_Hygiene-HKeep-Cook-Preserve'
    ];
    
    return allTasks.filter(task => 
      task.project_service && myselfKeywords.some(keyword => 
        task.project_service.includes(keyword)
      )
    );
  }, [allTasks]);

  // Filter tasks based on selected services
  const tasksForSelectedServices = useMemo(() => {
    if (selectedServices.length === 0) return myselfFilteredTasks;
    
    return myselfFilteredTasks.filter(task => 
      selectedServices.includes(task.project_service)
    );
  }, [myselfFilteredTasks, selectedServices]);

  const availableClients = useMemo(() => {
    if (!tasksForSelectedServices.length) return [];
    
    const clientMap = new Map<string, { id: string; name: string }>();
    tasksForSelectedServices.forEach(task => {
      if (task.client_id && task.client_name) {
        clientMap.set(task.client_id, {
          id: task.client_id,
          name: task.client_name
        });
      }
    });
    
    return Array.from(clientMap.values());
  }, [tasksForSelectedServices]);

  const tasksForSelectedClients = useMemo(() => {
    if (selectedClients.length === 0) return tasksForSelectedServices;
    
    return tasksForSelectedServices.filter(task =>
      selectedClients.includes(task.client_id)
    );
  }, [tasksForSelectedServices, selectedClients]);

  const availableProjects = useMemo(() => {
    if (!tasksForSelectedClients.length) return [];
    
    const projectMap = new Map<string, { id: string; name: string }>();
    tasksForSelectedClients.forEach(task => {
      if (task.project_id && task.project_name) {
        projectMap.set(task.project_id, {
          id: task.project_id,
          name: task.project_name
        });
      }
    });
    
    return Array.from(projectMap.values());
  }, [tasksForSelectedClients]);

  const filteredTasks = useMemo(() => {
    if (selectedProjects.length === 0) return tasksForSelectedClients;
    
    return tasksForSelectedClients.filter(task =>
      selectedProjects.includes(task.project_id)
    );
  }, [tasksForSelectedClients, selectedProjects]);

  const tasks = useMemo(() => {
    return filteredTasks.map(task => {
      const isOverdue = task.deadline && new Date(task.deadline).getTime() < new Date().getTime();
      return {
        ...task,
        status: isOverdue && task.status !== 'Completed' ? 'Overdue' : task.status
      };
    });
  }, [filteredTasks]);

  const toggleService = (serviceName: string) => {
    setSelectedServices(prev => {
      const newServices = prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName];
      
      console.log('Services changed to:', newServices);
      
      // Clear dependent filters when services change
      setSelectedClients([]);
      setSelectedProjects([]);
      
      return newServices;
    });
  };

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const newClients = prev.includes(clientId)
        ? prev.filter(c => c !== clientId)
        : [...prev, clientId];
      
      console.log('Clients changed to:', newClients);
      
      // Clear dependent filters when clients change
      setSelectedProjects([]);
      
      return newClients;
    });
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => {
      const newProjects = prev.includes(projectId)
        ? prev.filter(p => p !== projectId)
        : [...prev, projectId];
      
      console.log('Projects changed to:', newProjects);
      return newProjects;
    });
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      if (newStatus === 'Overdue') {
        console.log('Overdue status is computed dynamically, not saving to database');
        return;
      }

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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Myself</h1>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
        
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
                {/* Service Filter - Show Myself-specific services */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Services (Myself)</h3>
                  <div className="flex flex-wrap gap-2">
                    {myselfServices.map((service) => (
                      <Button
                        key={service.name}
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
                {availableClients.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Clients ({availableClients.length})</h3>
                    <div className="flex flex-wrap gap-2">
                      {availableClients.map((client) => (
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
                {availableProjects.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Projects ({availableProjects.length})</h3>
                    <div className="flex flex-wrap gap-2">
                      {availableProjects.map((project) => (
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

                {/* Debug Info */}
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Services: {selectedServices.length}, Clients: {availableClients.length}, Projects: {availableProjects.length}, Tasks: {tasks.length}</div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Conditional rendering based on view mode */}
        {viewMode === 'kanban' ? (
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
        ) : (
          <TaskTable
            tasks={tasks}
            canCreate={canCreate}
            canUpdate={hasPageAccess('tasks')}
            canDelete={hasPageAccess('tasks')}
            onTaskStatusChange={handleTaskStatusChange}
          />
        )}

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

export default Myself;
