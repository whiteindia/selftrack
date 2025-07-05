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
import { usePrivileges } from '@/hooks/usePrivileges';
import { toast } from '@/hooks/use-toast';
import AddTasksToSprintDialog from '@/components/AddTasksToSprintDialog';

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  sprint_leader_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  completion_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  slot_date?: string | null;
  estimated_hours?: number | null;
  is_pinned?: boolean;
  is_favorite?: boolean;
}

interface Task {
  id: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  project_id: string;
  assignee_id: string | null;
  deadline: string | null;
  hours: number;
  estimated_duration: number | null;
  scheduled_time?: string | null;
  date?: string | null;
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
  sprint_leader?: {
    name: string;
  };
  project?: {
    name: string;
    service: string;
    assignee_employee_id: string;
    clients: {
      name: string;
    };
  };
  tasks: Task[];
  isOverdue: boolean;
  overdueDays: number;
  totalEstimatedDuration: number;
  totalLoggedDuration: number;
}

const Sprints = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [addTasksDialogOpen, setAddTasksDialogOpen] = useState(false);
  const [selectedSprintForAddTasks, setSelectedSprintForAddTasks] = useState<{ id: string; title: string } | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedAssigner, setSelectedAssigner] = useState<string>('all');
  const [selectedSprintLeader, setSelectedSprintLeader] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');
  const [selectedPinFilter, setSelectedPinFilter] = useState<string>('all');
  const [selectedFavoriteFilter, setSelectedFavoriteFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  console.log('Sprints component rendered');

  const { hasOperationAccess, isRlsFilteringActive, userId, userRole, employeeId, loading: privilegesLoading } = usePrivileges();
  
  // Check specific permissions for sprints page
  const canCreate = hasOperationAccess('sprints', 'create');
  const canUpdate = hasOperationAccess('sprints', 'update');
  const canDelete = hasOperationAccess('sprints', 'delete');
  const canRead = hasOperationAccess('sprints', 'read');

  console.log('Sprints page permissions:', { canCreate, canUpdate, canDelete, canRead });
  console.log('Should apply user filtering:', isRlsFilteringActive('sprints'), 'User ID:', userId, 'Employee ID:', employeeId);

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
    },
    enabled: canRead
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
    },
    enabled: canRead
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
    },
    enabled: canRead
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
    },
    enabled: canRead
  });

  // Fetch sprints with their tasks and project information
  const { data: sprints = [], isLoading, error: sprintsError } = useQuery({
    queryKey: ['sprints', userId, userRole, employeeId],
    queryFn: async () => {
      console.log('=== SPRINTS QUERY START ===');
      console.log('Fetching sprints with project manager access...');
      console.log('User ID:', userId, 'Employee ID:', employeeId, 'User role:', userRole);
      
      try {
        // Fetch sprints - RLS will filter based on sprint leadership, task involvement, or project management
        const { data: sprintsData, error: sprintsError } = await supabase
          .from('sprints')
          .select(`
            *,
            projects (
              name,
              service,
              assignee_employee_id,
              clients (
                name
              )
            )
          `)
          .order('deadline', { ascending: true });

        if (sprintsError) {
          console.error('Error fetching sprints:', sprintsError);
          throw sprintsError;
        }

        console.log('Raw sprints data from database:', sprintsData);
        console.log('Number of sprints found:', sprintsData?.length || 0);

        if (sprintsData && sprintsData.length > 0) {
          sprintsData.forEach((sprint, index) => {
            console.log(`Sprint ${index + 1}:`, {
              id: sprint.id,
              title: sprint.title,
              sprint_leader_id: sprint.sprint_leader_id,
              project_id: sprint.project_id,
              status: sprint.status,
              deadline: sprint.deadline
            });
          });
        }

        const sprintsWithTasks: SprintWithTasks[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (const sprint of sprintsData) {
          console.log('Processing sprint:', sprint.id, sprint.title);
          
          // Fetch sprint leader data
          let sprintLeader = null;
          if (sprint.sprint_leader_id) {
            const { data: leaderData } = await supabase
              .from('employees')
              .select('name')
              .eq('id', sprint.sprint_leader_id)
              .single();
            
            if (leaderData) {
              sprintLeader = { name: leaderData.name };
            }
          }
          
          // Fetch tasks for this sprint - RLS will automatically filter based on user permissions
          const { data: sprintTasks, error: tasksError } = await supabase
            .from('sprint_tasks')
            .select(`
              task_id,
              tasks (
                id,
                name,
                status,
                project_id,
                assignee_id,
                deadline,
                hours,
                estimated_duration,
                scheduled_time,
                date,
                projects (
                  name,
                  service,
                  clients (
                    name
                  )
                )
              )
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
                hours: task.hours || 0,
                estimated_duration: task.estimated_duration,
                scheduled_time: task.scheduled_time,
                date: task.date,
                projects: task.projects,
                employees: employeeData
              });
            }
          }

          // RLS handles visibility at database level, so if we see the sprint, we should show it
          // But we'll add a safety check: if no tasks and user is not sprint leader and not project manager, skip
          const isSprintLeader = sprint.sprint_leader_id === employeeId;
          const hasVisibleTasks = tasks.length > 0;
          const isProjectManager = sprint.projects && (sprint.projects as any).assignee_employee_id === employeeId;
          
          if (!isSprintLeader && !hasVisibleTasks && !isProjectManager) {
            console.log(`Filtering out sprint ${sprint.title} - user is not sprint leader, project manager, and has no visible tasks`);
            continue;
          }

          // Calculate durations
          const totalEstimatedDuration = tasks.reduce((sum, task) => sum + (task.estimated_duration || 0), 0);
          const totalLoggedDuration = tasks.reduce((sum, task) => sum + task.hours, 0);

          // Check if all tasks are completed and auto-update sprint status
          const allTasksCompleted = tasks.length > 0 && tasks.every(task => task.status === 'Completed');
          let sprintStatus = sprint.status;
          let completionDate = sprint.completion_date;
          
          if (allTasksCompleted && sprint.status !== 'Completed') {
            // Auto-update sprint to completed with completion date
            const now = new Date().toISOString();
            const { error: updateError } = await supabase
              .from('sprints')
              .update({ 
                status: 'Completed',
                completion_date: now
              })
              .eq('id', sprint.id);
            
            if (!updateError) {
              sprintStatus = 'Completed';
              completionDate = now;
              console.log('Auto-completed sprint:', sprint.title);
            }
          }

          // Calculate overdue status and days
          const sprintDeadline = new Date(sprint.deadline);
          sprintDeadline.setHours(0, 0, 0, 0);
          
          let isOverdue = false;
          let overdueDays = 0;
          
          if (sprintStatus === 'Completed' && completionDate) {
            // For completed sprints, calculate overdue days from completion date
            const completedDate = new Date(completionDate);
            completedDate.setHours(0, 0, 0, 0);
            isOverdue = sprintDeadline < completedDate;
            overdueDays = isOverdue ? Math.floor((completedDate.getTime() - sprintDeadline.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          } else {
            // For non-completed sprints, calculate overdue days from today
            isOverdue = sprintDeadline < today;
            overdueDays = isOverdue ? Math.floor((today.getTime() - sprintDeadline.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          }
          
          sprintsWithTasks.push({
            ...sprint,
            status: sprintStatus as 'Not Started' | 'In Progress' | 'Completed',
            completion_date: completionDate,
            sprint_leader: sprintLeader,
            project: sprint.projects as any,
            tasks,
            isOverdue,
            overdueDays,
            totalEstimatedDuration,
            totalLoggedDuration
          });
        }

        // Enhanced sorting with priority: pinned sprints, tasks with time slots, recently updated, overdue, near deadlines
        sprintsWithTasks.sort((a, b) => {
          const today = new Date();
          const aDeadline = new Date(a.deadline);
          const bDeadline = new Date(b.deadline);
          
          // Calculate days until deadline (negative if overdue)
          const aDaysUntilDeadline = Math.floor((aDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const bDaysUntilDeadline = Math.floor((bDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          // Priority 1: Pinned sprints (highest priority)
          const aIsPinned = a.is_pinned || false;
          const bIsPinned = b.is_pinned || false;
          
          if (aIsPinned && !bIsPinned) return -1;
          if (!aIsPinned && bIsPinned) return 1;
          
          // Priority 2: Tasks with actual time slots (scheduled_time or date)
          const aHasTimeSlots = a.tasks.some(task => task.scheduled_time || task.date);
          const bHasTimeSlots = b.tasks.some(task => task.scheduled_time || task.date);
          
          if (aHasTimeSlots && !bHasTimeSlots) return -1;
          if (!aHasTimeSlots && bHasTimeSlots) return 1;
          
          // If both have time slots, sort by earliest slot time
          if (aHasTimeSlots && bHasTimeSlots) {
            const aEarliestSlot = a.tasks
              .filter(task => task.scheduled_time || task.date)
              .map(task => {
                if (task.scheduled_time) {
                  const time = task.scheduled_time.includes(' ') ? task.scheduled_time.split(' ')[1] : task.scheduled_time;
                  return time;
                }
                return '23:59'; // Default to end of day if only date
              })
              .sort()[0] || '23:59';
            
            const bEarliestSlot = b.tasks
              .filter(task => task.scheduled_time || task.date)
              .map(task => {
                if (task.scheduled_time) {
                  const time = task.scheduled_time.includes(' ') ? task.scheduled_time.split(' ')[1] : task.scheduled_time;
                  return time;
                }
                return '23:59'; // Default to end of day if only date
              })
              .sort()[0] || '23:59';
            
            return aEarliestSlot.localeCompare(bEarliestSlot);
          }
          
          // Priority 3: Tasks with deadlines (but no time slots)
          const aHasDeadlines = a.tasks.some(task => task.deadline);
          const bHasDeadlines = b.tasks.some(task => task.deadline);
          
          if (aHasDeadlines && !bHasDeadlines) return -1;
          if (!aHasDeadlines && bHasDeadlines) return 1;
          
          // Priority 4: Recently updated (within last 7 days)
          const aRecentlyUpdated = (today.getTime() - new Date(a.updated_at).getTime()) < (7 * 24 * 60 * 60 * 1000);
          const bRecentlyUpdated = (today.getTime() - new Date(b.updated_at).getTime()) < (7 * 24 * 60 * 60 * 1000);
          
          if (aRecentlyUpdated && !bRecentlyUpdated) return -1;
          if (!aRecentlyUpdated && bRecentlyUpdated) return 1;
          
          // Priority 5: Overdue sprints (negative days until deadline)
          const aOverdue = aDaysUntilDeadline < 0;
          const bOverdue = bDaysUntilDeadline < 0;
          
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;
          
          // If both are overdue, sort by most overdue first (smaller negative number = more overdue)
          if (aOverdue && bOverdue) {
            return aDaysUntilDeadline - bDaysUntilDeadline;
          }
          
          // Priority 6: Near deadlines (within 7 days) - sort by closest deadline first
          const aNearDeadline = aDaysUntilDeadline >= 0 && aDaysUntilDeadline <= 7;
          const bNearDeadline = bDaysUntilDeadline >= 0 && bDaysUntilDeadline <= 7;
          
          if (aNearDeadline && !bNearDeadline) return -1;
          if (!aNearDeadline && bNearDeadline) return 1;
          
          // If both are near deadline, sort by closest deadline first
          if (aNearDeadline && bNearDeadline) {
            return aDaysUntilDeadline - bDaysUntilDeadline;
          }
          
          // Priority 7: All other sprints - sort by deadline (earliest first)
          return aDaysUntilDeadline - bDaysUntilDeadline;
        });

        console.log('Final sprints with tasks (RLS with project manager access):', sprintsWithTasks);
        return sprintsWithTasks;
      } catch (error) {
        console.error('Error in sprints query:', error);
        throw error;
      }
    },
    enabled: canRead && !!userId, // Only fetch if user has read permission and userId is available
    retry: false // Don't retry on RLS policy errors
  });

  // Log any query errors
  if (sprintsError) {
    console.error('Sprints query error:', sprintsError);
  }

  // Generate available years from sprints
  const availableYears = [...new Set(sprints.map(sprint => new Date(sprint.deadline).getFullYear()))].sort((a, b) => b - a);

  // Enhanced filter logic
  const filteredSprints = sprints.filter(sprint => {
    // Sprint Leader filter
    if (selectedSprintLeader !== 'all' && sprint.sprint_leader_id !== selectedSprintLeader) {
      return false;
    }

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

    // Pin filter
    if (selectedPinFilter !== 'all') {
      const isPinned = sprint.is_pinned || false;
      if (selectedPinFilter === 'pinned' && !isPinned) {
        return false;
      }
      if (selectedPinFilter === 'unpinned' && isPinned) {
        return false;
      }
    }

    // Favorite filter
    if (selectedFavoriteFilter !== 'all') {
      const isFavorite = sprint.is_favorite || false;
      if (selectedFavoriteFilter === 'favorite' && !isFavorite) {
        return false;
      }
      if (selectedFavoriteFilter === 'unfavorite' && isFavorite) {
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
    mutationFn: async ({ sprintId, status, completionDate }: { sprintId: string; status: string; completionDate?: string }) => {
      console.log('Updating sprint status:', sprintId, status);
      const updateData: any = { status };
      if (status === 'Completed' && completionDate) {
        updateData.completion_date = completionDate;
      }
      
      const { error } = await supabase
        .from('sprints')
        .update(updateData)
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

  const removeTaskFromSprint = useMutation({
    mutationFn: async ({ taskId, sprintId }: { taskId: string; sprintId: string }) => {
      console.log('Removing task from sprint:', taskId, sprintId);
      const { error } = await supabase
        .from('sprint_tasks')
        .delete()
        .eq('sprint_id', sprintId)
        .eq('task_id', taskId);
      
      if (error) {
        console.error('Error removing task from sprint:', error);
        throw error;
      }
      console.log('Task removed from sprint successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({
        title: "Success",
        description: "Task removed from sprint successfully",
      });
    },
    onError: (error) => {
      console.error('Remove task from sprint error:', error);
      toast({
        title: "Error",
        description: "Failed to remove task from sprint",
        variant: "destructive",
      });
    }
  });

  const handleTaskStatusChange = (taskId: string, newStatus: 'Not Started' | 'In Progress' | 'Completed', sprintId: string) => {
    if (!canUpdate) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to update task status",
        variant: "destructive",
      });
      return;
    }

    console.log('Handle task status change:', taskId, newStatus, sprintId);
    updateTaskStatus.mutate({ taskId, status: newStatus });
    
    const sprint = sprints.find(s => s.id === sprintId);
    if (sprint) {
      const updatedTasks = sprint.tasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      
      let sprintStatus: 'Not Started' | 'In Progress' | 'Completed' = 'Not Started';
      let completionDate: string | undefined;
      
      if (updatedTasks.every(t => t.status === 'Completed') && updatedTasks.length > 0) {
        sprintStatus = 'Completed';
        completionDate = new Date().toISOString();
      } else if (updatedTasks.some(t => t.status === 'In Progress' || t.status === 'Completed')) {
        sprintStatus = 'In Progress';
      }
      
      if (sprintStatus !== sprint.status) {
        updateSprintStatus.mutate({ sprintId, status: sprintStatus, completionDate });
      }
    }
  };

  const handleEditSprint = (sprint: Sprint) => {
    if (!canUpdate) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to edit sprints",
        variant: "destructive",
      });
      return;
    }

    console.log('Edit sprint:', sprint);
    setEditingSprint(sprint);
    setDialogOpen(true);
  };

  const handleDeleteSprint = (sprintId: string) => {
    if (!canDelete) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to delete sprints",
        variant: "destructive",
      });
      return;
    }

    console.log('Delete sprint requested:', sprintId);
    if (confirm('Are you sure you want to delete this sprint? This action cannot be undone.')) {
      deleteSprint.mutate(sprintId);
    }
  };

  const handleRemoveTask = (taskId: string, sprintId: string) => {
    if (!canUpdate) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to remove tasks from sprints",
        variant: "destructive",
      });
      return;
    }

    console.log('Remove task requested:', taskId, sprintId);
    if (confirm('Are you sure you want to remove this task from the sprint?')) {
      removeTaskFromSprint.mutate({ taskId, sprintId });
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
    setSelectedSprintLeader('all');
    setSelectedStatus('active');
    setSelectedYear('all');
    setSelectedMonth('all');
    setGlobalServiceFilter('all');
    setSelectedPinFilter('all');
    setSelectedFavoriteFilter('all');
  };

  const hasActiveFilters = selectedClient !== 'all' || selectedProject !== 'all' || selectedAssignee !== 'all' || selectedAssigner !== 'all' || selectedSprintLeader !== 'all' || selectedStatus !== 'active' || selectedYear !== 'all' || selectedMonth !== 'all' || globalServiceFilter !== 'all' || selectedPinFilter !== 'all' || selectedFavoriteFilter !== 'all';

  const handleCreateSprint = () => {
    if (!canCreate) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to create sprints",
        variant: "destructive",
      });
      return;
    }

    console.log('Create sprint requested');
    setEditingSprint(null);
    setDialogOpen(true);
  };

  const handleAddTasksToSprint = (sprintId: string) => {
    console.log('handleAddTasksToSprint called with sprintId:', sprintId);
    console.log('canUpdate:', canUpdate);
    
    if (!canUpdate) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to add tasks to sprints",
        variant: "destructive",
      });
      return;
    }

    const sprint = sprints.find(s => s.id === sprintId);
    console.log('Found sprint:', sprint);
    if (sprint) {
      setSelectedSprintForAddTasks({ id: sprintId, title: sprint.title });
      setAddTasksDialogOpen(true);
      console.log('Dialog should open now');
    }
  };

  console.log('Sprints loading:', isLoading);
  console.log('Sprints data:', sprints);
  console.log('Filtered sprints:', filteredSprints);

  if (isLoading || privilegesLoading) {
    return (
      <Navigation>
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading sprints...</div>
          </div>
        </div>
      </Navigation>
    );
  }

  // Check if user has read access
  if (!canRead) {
    return (
      <Navigation>
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to view sprints.</p>
          </div>
        </div>
      </Navigation>
    );
  }

  if (sprintsError) {
    return (
      <Navigation>
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8">
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
      <div className="w-full max-w-none px-2 sm:px-4 lg:px-6">
        <SprintsHeader
          globalServiceFilter={globalServiceFilter}
          setGlobalServiceFilter={setGlobalServiceFilter}
          services={services}
          canCreate={canCreate}
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
          selectedSprintLeader={selectedSprintLeader}
          setSelectedSprintLeader={setSelectedSprintLeader}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          globalServiceFilter={globalServiceFilter}
          selectedPinFilter={selectedPinFilter}
          setSelectedPinFilter={setSelectedPinFilter}
          selectedFavoriteFilter={selectedFavoriteFilter}
          setSelectedFavoriteFilter={setSelectedFavoriteFilter}
          clients={clients}
          projects={projects}
          employees={employees}
          services={services}
          availableYears={availableYears}
          hasActiveFilters={hasActiveFilters}
          resetFilters={resetFilters}
        />

        <div className="space-y-3 sm:space-y-4">
          {filteredSprints.length === 0 ? (
            <SprintsEmptyState
              sprintsLength={sprints.length}
              hasActiveFilters={hasActiveFilters}
              resetFilters={resetFilters}
              canCreate={canCreate}
              onCreateSprint={handleCreateSprint}
            />
          ) : (
            filteredSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onTaskStatusChange={handleTaskStatusChange}
                onRemoveTask={handleRemoveTask}
                onAddTasks={handleAddTasksToSprint}
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

        {selectedSprintForAddTasks && (
          <AddTasksToSprintDialog
            open={addTasksDialogOpen}
            onOpenChange={setAddTasksDialogOpen}
            sprintId={selectedSprintForAddTasks.id}
            sprintTitle={selectedSprintForAddTasks.title}
            onSuccess={() => {
              console.log('Add tasks dialog success callback');
              queryClient.invalidateQueries({ queryKey: ['sprints'] });
              setAddTasksDialogOpen(false);
              setSelectedSprintForAddTasks(null);
            }}
          />
        )}
      </div>
    </Navigation>
  );
};

export default Sprints;
