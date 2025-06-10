import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import SprintDialog from '@/components/SprintDialog';
import SprintCard from '@/components/SprintCard';
import SprintsHeader from '@/components/SprintsHeader';
import SprintsFilters from '@/components/SprintsFilters';
import SprintsEmptyState from '@/components/SprintsEmptyState';
import Navigation from '@/components/Navigation';
import { toast } from '@/hooks/use-toast';

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  project_id: string;
  assignee_id: string | null;
  deadline: string | null;
  hours: number;
  projects?: {
    name: string;
    service: string;
    clients: {
      name: string;
    };
  };
  employees?: {
    name: string;
  };
}

interface SprintWithTasks extends Sprint {
  tasks: Task[];
}

const Sprints = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedAssigner, setSelectedAssigner] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  console.log('Sprints component rendered');

  // Fetch clients for filter
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log('Fetching clients...');
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
      console.log('Clients fetched:', data);
      return data || [];
    }
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      console.log('Fetching projects...');
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .order('name');
      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      console.log('Projects fetched:', data);
      return data || [];
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      console.log('Fetching employees...');
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .order('name');
      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }
      console.log('Employees fetched:', data);
      return data || [];
    }
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      console.log('Fetching services...');
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');
      if (error) {
        console.error('Error fetching services:', error);
        throw error;
      }
      console.log('Services fetched:', data);
      return data || [];
    }
  });

  // Fetch sprints with their tasks
  const { data: sprints = [], isLoading, error: sprintsError } = useQuery({
    queryKey: ['sprints'],
    queryFn: async () => {
      console.log('Fetching sprints...');
      try {
        const { data: sprintsData, error: sprintsError } = await supabase
          .from('sprints')
          .select('*')
          .order('deadline', { ascending: true });

        if (sprintsError) {
          console.error('Error fetching sprints:', sprintsError);
          throw sprintsError;
        }

        console.log('Sprints data fetched:', sprintsData);

        if (!sprintsData || sprintsData.length === 0) {
          console.log('No sprints found');
          return [];
        }

        const sprintsWithTasks: SprintWithTasks[] = [];
        
        for (const sprint of sprintsData) {
          console.log('Processing sprint:', sprint.id, sprint.title);
          
          const { data: sprintTasks, error: tasksError } = await supabase
            .from('sprint_tasks')
            .select(`
              task_id,
              tasks (\
                id,\
                name,\
                status,\
                project_id,\
                assignee_id,\
                deadline,\
                hours,\
                projects (\
                  name,\
                  service,\
                  clients (\
                    name\
                  )\
                )\
              )\
            `)
            .eq('sprint_id', sprint.id);

          if (tasksError) {
            console.error('Error fetching sprint tasks:', tasksError);
            throw tasksError;
          }

          console.log('Sprint tasks for', sprint.title, ':', sprintTasks);

          const tasks: Task[] = [];
          
          for (const st of sprintTasks || []) {
            if (st.tasks) {
              const task = st.tasks as any;
              let employeeData = null;
              
              if (task.assignee_id) {
                const { data: employee } = await supabase
                  .from('employees')
                  .select('name')
                  .eq('id', task.assignee_id)
                  .single();
                
                if (employee) {
                  employeeData = { name: employee.name };
                }
              }
              
              tasks.push({
                id: task.id,
                name: task.name,
                status: task.status as 'Not Started' | 'In Progress' | 'Completed',
                project_id: task.project_id,
                assignee_id: task.assignee_id,
                deadline: task.deadline,
                hours: task.hours,
                projects: task.projects,
                employees: employeeData
              });
            }
          }
          
          sprintsWithTasks.push({
            ...sprint,
            status: sprint.status as 'Not Started' | 'In Progress' | 'Completed',
            tasks
          });
        }

        console.log('Final sprints with tasks:', sprintsWithTasks);
        return sprintsWithTasks;
      } catch (error) {
        console.error('Error in sprints query:', error);
        throw error;
      }
    }
  });

  // Log any query errors
  if (sprintsError) {
    console.error('Sprints query error:', sprintsError);
  }

  // Generate available years from sprints
  const availableYears = [...new Set(sprints.map(sprint => new Date(sprint.deadline).getFullYear()))].sort((a, b) => b - a);

  // Enhanced filter logic
  const filteredSprints = sprints.filter(sprint => {
    // Global service filter - check project service type
    if (globalServiceFilter !== 'all') {
      const hasMatchingService = sprint.tasks.some(task => 
        task.projects?.service === globalServiceFilter
      );
      if (!hasMatchingService && sprint.tasks.length > 0) {
        return false;
      }
    }

    // Status filter - by default hide completed sprints
    if (selectedStatus === 'active' && sprint.status === 'Completed') {
      return false;
    }
    if (selectedStatus !== 'all' && selectedStatus !== 'active' && sprint.status !== selectedStatus) {
      return false;
    }

    // Year filter
    if (selectedYear !== 'all') {
      const sprintYear = new Date(sprint.deadline).getFullYear();
      if (sprintYear !== parseInt(selectedYear)) {
        return false;
      }
    }

    // Month filter
    if (selectedMonth !== 'all') {
      const sprintMonth = new Date(sprint.deadline).getMonth();
      if (sprintMonth !== parseInt(selectedMonth)) {
        return false;
      }
    }

    if (sprint.tasks.length === 0) {
      return selectedClient === 'all' && selectedProject === 'all' && selectedAssignee === 'all' && selectedAssigner === 'all' && selectedService === 'all';
    }

    return sprint.tasks.some(task => {
      if (selectedClient !== 'all') {
        const clientName = clients.find(c => c.id === selectedClient)?.name;
        if (task.projects?.clients?.name !== clientName) {
          return false;
        }
      }

      if (selectedProject !== 'all') {
        if (task.project_id !== selectedProject) {
          return false;
        }
      }

      if (selectedAssignee !== 'all') {
        if (task.assignee_id !== selectedAssignee) {
          return false;
        }
      }

      if (selectedService !== 'all') {
        if (task.projects?.service !== selectedService) {
          return false;
        }
      }

      return true;
    });
  });

  // Delete sprint mutation
  const deleteSprint = useMutation({
    mutationFn: async (sprintId: string) => {
      console.log('Deleting sprint:', sprintId);
      // First delete sprint_tasks relationships
      const { error: sprintTasksError } = await supabase
        .from('sprint_tasks')
        .delete()
        .eq('sprint_id', sprintId);
      
      if (sprintTasksError) {
        console.error('Error deleting sprint tasks:', sprintTasksError);
        throw sprintTasksError;
      }

      // Then delete the sprint
      const { error } = await supabase
        .from('sprints')
        .delete()
        .eq('id', sprintId);
      
      if (error) {
        console.error('Error deleting sprint:', error);
        throw error;
      }
      console.log('Sprint deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({
        title: "Success",
        description: "Sprint deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Delete sprint error:', error);
      toast({
        title: "Error",
        description: "Failed to delete sprint",
        variant: "destructive",
      });
    }
  });

  // Update task status mutation
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'Not Started' | 'In Progress' | 'Completed' }) => {
      console.log('Updating task status:', taskId, status);
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);
      
      if (error) {
        console.error('Error updating task status:', error);
        throw error;
      }
      console.log('Task status updated successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
    },
    onError: (error) => {
      console.error('Update task status error:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  });

  const updateSprintStatus = useMutation({
    mutationFn: async ({ sprintId, status }: { sprintId: string; status: string }) => {
      console.log('Updating sprint status:', sprintId, status);
      const { error } = await supabase
        .from('sprints')
        .update({ status })
        .eq('id', sprintId);
      
      if (error) {
        console.error('Error updating sprint status:', error);
        throw error;
      }
      console.log('Sprint status updated successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    }
  });

  const handleTaskStatusChange = (taskId: string, newStatus: 'Not Started' | 'In Progress' | 'Completed', sprintId: string) => {
    console.log('Handle task status change:', taskId, newStatus, sprintId);
    updateTaskStatus.mutate({ taskId, status: newStatus });
    
    const sprint = sprints.find(s => s.id === sprintId);
    if (sprint) {
      const updatedTasks = sprint.tasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      
      let sprintStatus: 'Not Started' | 'In Progress' | 'Completed' = 'Not Started';
      if (updatedTasks.every(t => t.status === 'Completed')) {
        sprintStatus = 'Completed';
      } else if (updatedTasks.some(t => t.status === 'In Progress' || t.status === 'Completed')) {
        sprintStatus = 'In Progress';
      }
      
      if (sprintStatus !== sprint.status) {
        updateSprintStatus.mutate({ sprintId, status: sprintStatus });
      }
    }
  };

  const handleEditSprint = (sprint: Sprint) => {
    console.log('Edit sprint:', sprint);
    setEditingSprint(sprint);
    setDialogOpen(true);
  };

  const handleDeleteSprint = (sprintId: string) => {
    console.log('Delete sprint requested:', sprintId);
    if (confirm('Are you sure you want to delete this sprint? This action cannot be undone.')) {
      deleteSprint.mutate(sprintId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const resetFilters = () => {
    setSelectedClient('all');
    setSelectedProject('all');
    setSelectedAssignee('all');
    setSelectedAssigner('all');
    setSelectedService('all');
    setSelectedStatus('active');
    setSelectedYear('all');
    setSelectedMonth('all');
    setGlobalServiceFilter('all');
  };

  const hasActiveFilters = selectedClient !== 'all' || selectedProject !== 'all' || selectedAssignee !== 'all' || selectedAssigner !== 'all' || selectedService !== 'all' || selectedStatus !== 'active' || selectedYear !== 'all' || selectedMonth !== 'all' || globalServiceFilter !== 'all';

  const handleCreateSprint = () => {
    console.log('Create sprint requested');
    setEditingSprint(null);
    setDialogOpen(true);
  };

  console.log('Sprints loading:', isLoading);
  console.log('Sprints data:', sprints);
  console.log('Filtered sprints:', filteredSprints);

  if (isLoading) {
    return (
      <Navigation>
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading sprints...</div>
          </div>
        </div>
      </Navigation>
    );
  }

  if (sprintsError) {
    return (
      <Navigation>
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-red-500">
              Error loading sprints: {sprintsError.message}
            </div>
          </div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="container mx-auto p-6">
        <SprintsHeader
          globalServiceFilter={globalServiceFilter}
          setGlobalServiceFilter={setGlobalServiceFilter}
          services={services}
          onCreateSprint={handleCreateSprint}
        />

        <SprintsFilters
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          selectedAssignee={selectedAssignee}
          setSelectedAssignee={setSelectedAssignee}
          selectedAssigner={selectedAssigner}
          setSelectedAssigner={setSelectedAssigner}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          globalServiceFilter={globalServiceFilter}
          clients={clients}
          projects={projects}
          employees={employees}
          services={services}
          availableYears={availableYears}
          hasActiveFilters={hasActiveFilters}
          resetFilters={resetFilters}
        />

        <div className="space-y-6">
          {filteredSprints.length === 0 ? (
            <SprintsEmptyState
              sprintsLength={sprints.length}
              hasActiveFilters={hasActiveFilters}
              resetFilters={resetFilters}
              onCreateSprint={handleCreateSprint}
            />
          ) : (
            filteredSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                onTaskStatusChange={handleTaskStatusChange}
                onEdit={() => handleEditSprint(sprint)}
                onDelete={() => handleDeleteSprint(sprint.id)}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            ))
          )}
        </div>

        <SprintDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingSprint={editingSprint}
          onSuccess={() => {
            console.log('Sprint dialog success callback');
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
            setDialogOpen(false);
            setEditingSprint(null);
          }}
        />
      </div>
    </Navigation>
  );
};

export default Sprints;
