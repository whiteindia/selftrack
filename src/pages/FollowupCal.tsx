import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Calendar as CalendarIcon, Clock, User, Building, Target, AlertTriangle, CalendarCheck } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import AssignToSlotDialog from '@/components/AssignToSlotDialog';

interface Task {
  id: string;
  name: string;
  reminder_datetime: string;
  status: string;
  deadline: string | null;
  assignee_id: string | null;
  project_id: string;
  projects: {
    id: string;
    name: string;
    clients: {
      id: string;
      name: string;
    };
  };
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
  assignee?: {
    name: string;
  };
}

interface TaskDeadline {
  id: string;
  name: string;
  deadline: string;
  status: string;
  assignee_id: string | null;
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
  assignee?: {
    name: string;
  };
}

interface FixedSlotTask {
  id: string;
  name: string;
  slot_start_datetime: string;
  slot_end_datetime: string;
  status: string;
  assignee_id: string | null;
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
  assignee?: {
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
  deadline: string;
  status: string;
  service: string;
  clients: {
    id: string;
    name: string;
  };
  client: {
    id: string;
    name: string;
  };
}

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: string;
  project?: {
    id: string;
    name: string;
    clients: {
      id: string;
      name: string;
    };
    client: {
      id: string;
      name: string;
    };
  };
}

const FollowupCal = () => {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string>('month');
  
  // Selection state for assigning to workload calendar
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  // Event type filter state with localStorage persistence
  const [visibleEventTypes, setVisibleEventTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('followupCalEventFilters');
    return saved ? JSON.parse(saved) : ['reminder', 'task-deadline', 'fixed-slot', 'project-deadline', 'sprint-deadline'];
  });

  // Save filter preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('followupCalEventFilters', JSON.stringify(visibleEventTypes));
  }, [visibleEventTypes]);

  // Fetch reminder tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['reminder-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          reminder_datetime,
          status,
          deadline,
          assignee_id,
          project_id,
          projects!tasks_project_id_fkey(
            id,
            name,
            clients!projects_client_id_fkey(
              id,
              name
            )
          ),
          assignee:employees!tasks_assignee_id_fkey(
            name
          )
        `)
        .not('reminder_datetime', 'is', null)
        .order('reminder_datetime', { ascending: true });

      if (error) {
        console.error('Error fetching reminder tasks:', error);
        throw error;
      }
      
      // Transform the data to match the expected interface
      const transformedData = (data || []).map(task => {
        try {
          return {
            ...task,
            project: {
              id: task.projects?.id || '',
              name: task.projects?.name || 'Unknown',
              client: {
                id: task.projects?.clients?.id || '',
                name: task.projects?.clients?.name || 'Unknown'
              }
            }
          };
        } catch (err) {
          console.error('Error transforming task data:', err, task);
          return null;
        }
      }).filter(Boolean);
      
      return transformedData as Task[];
    },
    enabled: !!user,
  });

  // Fetch task deadlines
  const { data: taskDeadlines = [], isLoading: taskDeadlinesLoading } = useQuery({
    queryKey: ['task-deadlines', user?.id],
    queryFn: async () => {
      const today = new Date();
      const futureDate = addDays(today, 30);

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          deadline,
          status,
          assignee_id,
          project_id,
          projects!tasks_project_id_fkey(
            id,
            name,
            clients!projects_client_id_fkey(
              id,
              name
            )
          ),
          assignee:employees!tasks_assignee_id_fkey(
            name
          )
        `)
        .not('deadline', 'is', null)
        .gte('deadline', today.toISOString().split('T')[0])
        .lte('deadline', futureDate.toISOString().split('T')[0])
        .order('deadline', { ascending: true });

      if (error) {
        console.error('Error fetching task deadlines:', error);
        throw error;
      }
      
      // Transform the data to match the expected interface
      const transformedData = (data || []).map(task => {
        try {
          return {
            ...task,
            project: {
              id: task.projects?.id || '',
              name: task.projects?.name || 'Unknown',
              client: {
                id: task.projects?.clients?.id || '',
                name: task.projects?.clients?.name || 'Unknown'
              }
            }
          };
        } catch (err) {
          console.error('Error transforming task deadline data:', err, task);
          return null;
        }
      }).filter(Boolean);
      
      return transformedData as TaskDeadline[];
    },
    enabled: !!user,
  });

  // Fetch fixed slot tasks
  const { data: fixedSlotTasks = [], isLoading: fixedSlotsLoading } = useQuery({
    queryKey: ['fixed-slot-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          slot_start_datetime,
          slot_end_datetime,
          status,
          assignee_id,
          project_id,
          projects!tasks_project_id_fkey(
            id,
            name,
            clients!projects_client_id_fkey(
              id,
              name
            )
          ),
          assignee:employees!tasks_assignee_id_fkey(
            name
          )
        `)
        .not('slot_start_datetime', 'is', null)
        .not('slot_end_datetime', 'is', null)
        .order('slot_start_datetime', { ascending: true });

      if (error) {
        console.error('Error fetching fixed slot tasks:', error);
        throw error;
      }
      
      // Transform the data to match the expected interface
      const transformedData = (data || []).map(task => {
        try {
          return {
            ...task,
            project: {
              id: task.projects?.id || '',
              name: task.projects?.name || 'Unknown',
              client: {
                id: task.projects?.clients?.id || '',
                name: task.projects?.clients?.name || 'Unknown'
              }
            }
          };
        } catch (err) {
          console.error('Error transforming fixed slot task data:', err, task);
          return null;
        }
      }).filter(Boolean);
      
      return transformedData as FixedSlotTask[];
    },
    enabled: !!user,
  });

  // Fetch upcoming project deadlines
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['upcoming-project-deadlines', user?.id],
    queryFn: async () => {
      const today = new Date();
      const futureDate = addDays(today, 30);

      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          deadline,
          status,
          service,
          clients:client_id(
            id,
            name
          )
        `)
        .not('deadline', 'is', null)
        .gte('deadline', today.toISOString().split('T')[0])
        .lte('deadline', futureDate.toISOString().split('T')[0])
        .order('deadline', { ascending: true });

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      
      // Transform the data to match the expected interface
      const transformedData = (data || []).map(project => {
        try {
          return {
            ...project,
            client: {
              id: project.clients?.id || '',
              name: project.clients?.name || 'Unknown'
            }
          };
        } catch (err) {
          console.error('Error transforming project data:', err, project);
          return null;
        }
      }).filter(Boolean);
      
      return transformedData as Project[];
    },
    enabled: !!user,
  });

  // Fetch upcoming sprint deadlines
  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ['upcoming-sprint-deadlines', user?.id],
    queryFn: async () => {
      const today = new Date();
      const futureDate = addDays(today, 30);

      const { data, error } = await supabase
        .from('sprints')
        .select(`
          id,
          title,
          deadline,
          status,
          project:project_id(
            id,
            name,
            clients:client_id(
              id,
              name
            )
          )
        `)
        .not('deadline', 'is', null)
        .gte('deadline', today.toISOString().split('T')[0])
        .lte('deadline', futureDate.toISOString().split('T')[0])
        .order('deadline', { ascending: true });

      if (error) {
        console.error('Error fetching sprints:', error);
        throw error;
      }
      
      // Transform the data to match the expected interface
      const transformedData = (data || []).map(sprint => {
        try {
          return {
            ...sprint,
            project: sprint.project ? {
              ...sprint.project,
              client: {
                id: sprint.project.clients?.id || '',
                name: sprint.project.clients?.name || 'Unknown'
              }
            } : undefined
          };
        } catch (err) {
          console.error('Error transforming sprint data:', err, sprint);
          return null;
        }
      }).filter(Boolean);
      
      return transformedData as Sprint[];
    },
    enabled: !!user,
  });

  const isLoading = tasksLoading || taskDeadlinesLoading || fixedSlotsLoading || projectsLoading || sprintsLoading;



  // Get unique clients from all data
  const clients = React.useMemo(() => {
    const allItems = [...(tasks || []), ...(taskDeadlines || []), ...(fixedSlotTasks || []), ...(projects || []), ...(sprints || [])];
    const clientsMap = new Map<string, { id: string; name: string }>();
    
    allItems.forEach(item => {
      let client;
      if ('project' in item && item.project?.client) {
        client = item.project.client;
      } else if ('clients' in item && item.clients) {
        client = item.clients;
      }
      
      if (client && !clientsMap.has(client.id)) {
        clientsMap.set(client.id, client);
      }
    });
    
    return Array.from(clientsMap.values());
  }, [tasks, taskDeadlines, fixedSlotTasks, projects, sprints]);

  // Get projects for selected client
  const projectsForClient = React.useMemo(() => {
    if (!selectedClient) return [];
    
    const allItems = [...(tasks || []), ...(taskDeadlines || []), ...(fixedSlotTasks || []), ...(projects || []), ...(sprints || [])];
    const projectsMap = new Map<string, { id: string; name: string }>();
    
    allItems.forEach(item => {
      let clientId: string | null = null;
      let project: { id: string; name: string } | null = null;
      
      if ('project' in item && item.project?.client) {
        clientId = item.project.client.id;
        project = { id: item.project.id, name: item.project.name };
      } else if ('clients' in item && item.clients) {
        clientId = item.clients.id;
        project = { id: item.id, name: item.name };
      }
      
      if (clientId === selectedClient && project && !projectsMap.has(project.id)) {
        projectsMap.set(project.id, project);
      }
    });
    
    return Array.from(projectsMap.values());
  }, [selectedClient, tasks, taskDeadlines, fixedSlotTasks, projects, sprints]);

  // Filter data based on selected client and project
  const filteredTasks = (tasks || []).filter(task => {
    if (selectedClient && task.project?.client?.id !== selectedClient) return false;
    if (selectedProject && task.project?.id !== selectedProject) return false;
    return true;
  });

  const filteredTaskDeadlines = (taskDeadlines || []).filter(task => {
    if (selectedClient && task.project?.client?.id !== selectedClient) return false;
    if (selectedProject && task.project?.id !== selectedProject) return false;
    return true;
  });

  const filteredFixedSlotTasks = (fixedSlotTasks || []).filter(task => {
    if (selectedClient && task.project?.client?.id !== selectedClient) return false;
    if (selectedProject && task.project?.id !== selectedProject) return false;
    return true;
  });

  const filteredProjects = (projects || []).filter(project => {
    if (selectedClient && project.clients?.id !== selectedClient) return false;
    if (selectedProject && project.id !== selectedProject) return false;
    return true;
  });

  const filteredSprints = (sprints || []).filter(sprint => {
    if (selectedClient && sprint.project?.client?.id !== selectedClient) return false;
    if (selectedProject && sprint.project?.id !== selectedProject) return false;
    return true;
  });

  // Create assignable items list for selection UI
  const assignableItems = React.useMemo(() => {
    const items = [
      ...filteredTasks.map(task => ({
        id: `reminder-${task.id}`,
        originalId: task.id,
        type: 'reminder',
        title: task.name,
        date: task.reminder_datetime,
        client: task.project?.client?.name || 'Unknown',
        project: task.project?.name || 'Unknown',
        assigneeId: task.assignee_id,
        projectId: task.project?.id || '',
        itemType: 'task'
      })),
      ...filteredTaskDeadlines.map(task => ({
        id: `task-deadline-${task.id}`,
        originalId: task.id,
        type: 'task-deadline',
        title: task.name,
        date: task.deadline,
        client: task.project?.client?.name || 'Unknown',
        project: task.project?.name || 'Unknown',
        assigneeId: task.assignee_id,
        projectId: task.project?.id || '',
        itemType: 'task'
      })),
      ...filteredFixedSlotTasks.map(task => ({
        id: `fixed-slot-${task.id}`,
        originalId: task.id,
        type: 'fixed-slot',
        title: task.name,
        date: task.slot_start_datetime,
        client: task.project?.client?.name || 'Unknown',
        project: task.project?.name || 'Unknown',
        assigneeId: task.assignee_id,
        projectId: task.project?.id || '',
        itemType: 'task'
      }))
      // Note: We exclude project deadlines and sprint deadlines as they're not directly assignable tasks
    ];
    
    return items.filter(item => visibleEventTypes.includes(item.type));
  }, [filteredTasks, filteredTaskDeadlines, filteredFixedSlotTasks, visibleEventTypes]);

  // Convert to FullCalendar events format with filtering by event type
  const calendarEvents = [
    ...filteredTasks.map(task => ({
      id: `reminder-${task.id}`,
      title: task.name,
      start: task.reminder_datetime,
      extendedProps: {
        type: 'reminder',
        client: task.project?.client?.name || 'Unknown',
        project: task.project?.name || 'Unknown',
        status: task.status,
        assignee: task.assignee?.name,
        icon: 'bell'
      },
      backgroundColor: '#fb923c',
      borderColor: '#ea580c'
    })),
    ...filteredTaskDeadlines.map(task => ({
      id: `task-deadline-${task.id}`,
      title: task.name,
      start: task.deadline,
      allDay: true,
      extendedProps: {
        type: 'task-deadline',
        client: task.project?.client?.name || 'Unknown',
        project: task.project?.name || 'Unknown',
        status: task.status,
        assignee: task.assignee?.name,
        icon: 'clock'
      },
      backgroundColor: '#fbbf24',
      borderColor: '#d97706'
    })),
    ...filteredFixedSlotTasks.map(task => ({
      id: `fixed-slot-${task.id}`,
      title: task.name,
      start: task.slot_start_datetime,
      end: task.slot_end_datetime,
      extendedProps: {
        type: 'fixed-slot',
        client: task.project?.client?.name || 'Unknown',
        project: task.project?.name || 'Unknown',
        status: task.status,
        assignee: task.assignee?.name,
        icon: 'calendar-check'
      },
      backgroundColor: '#60a5fa',
      borderColor: '#2563eb'
    })),
    ...filteredProjects.map(project => ({
      id: `project-deadline-${project.id}`,
      title: project.name,
      start: project.deadline,
      allDay: true,
      extendedProps: {
        type: 'project-deadline',
        client: project.clients?.name || 'Unknown',
        status: project.status,
        service: project.service,
        icon: 'alert-triangle'
      },
      backgroundColor: '#f87171',
      borderColor: '#dc2626'
    })),
    ...filteredSprints.map(sprint => ({
      id: `sprint-deadline-${sprint.id}`,
      title: sprint.title,
      start: sprint.deadline,
      allDay: true,
      extendedProps: {
        type: 'sprint-deadline',
        client: sprint.project?.client?.name || 'N/A',
        project: sprint.project?.name || 'N/A',
        status: sprint.status,
        icon: 'target'
      },
      backgroundColor: '#a78bfa',
      borderColor: '#7c3aed'
    }))
  ].filter(event => visibleEventTypes.includes(event.extendedProps.type));



  // Event type filter configuration
  const eventTypeFilters = [
    {
      type: 'reminder',
      label: 'Reminders',
      icon: Bell,
      color: 'bg-orange-400',
      textColor: 'text-orange-800',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-200'
    },
    {
      type: 'task-deadline',
      label: 'Task Deadlines',
      icon: Clock,
      color: 'bg-yellow-400',
      textColor: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-200'
    },
    {
      type: 'fixed-slot',
      label: 'Fixed Slots',
      icon: CalendarCheck,
      color: 'bg-blue-400',
      textColor: 'text-blue-800',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-200'
    },
    {
      type: 'project-deadline',
      label: 'Project Deadlines',
      icon: AlertTriangle,
      color: 'bg-red-400',
      textColor: 'text-red-800',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200'
    },
    {
      type: 'sprint-deadline',
      label: 'Sprint Deadlines',
      icon: Target,
      color: 'bg-purple-400',
      textColor: 'text-purple-800',
      bgColor: 'bg-purple-100',
      borderColor: 'border-purple-200'
    }
  ];

  const handleEventTypeToggle = (eventType: string) => {
    setVisibleEventTypes(prev => 
      prev.includes(eventType)
        ? prev.filter(type => type !== eventType)
        : [...prev, eventType]
    );
  };

  // Selection handlers
  const handleItemSelect = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedItems(new Set(assignableItems.map(item => item.id)));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const getSelectedItemsData = () => {
    return assignableItems.filter(item => selectedItems.has(item.id));
  };

  // Helper functions
  const handleClientSelect = (clientId: string) => {
    if (selectedClient === clientId) {
      setSelectedClient(null);
      setSelectedProject(null);
    } else {
      setSelectedClient(clientId);
      setSelectedProject(null);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    if (selectedProject === projectId) {
      setSelectedProject(null);
    } else {
      setSelectedProject(projectId);
    }
  };

  const getItemIcon = (iconName: string) => {
    switch (iconName) {
      case 'bell':
        return <Bell className="h-3 w-3" />;
      case 'clock':
        return <Clock className="h-3 w-3" />;
      case 'calendar-check':
        return <CalendarCheck className="h-3 w-3" />;
      case 'alert-triangle':
        return <AlertTriangle className="h-3 w-3" />;
      case 'target':
        return <Target className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const { event } = eventInfo;
    const { extendedProps } = event;
    
    return (
      <div className="p-1 text-xs">
        <div className="flex items-center gap-1 mb-1">
          {getItemIcon(extendedProps.icon)}
          <span className="font-medium truncate">{event.title}</span>
        </div>
        <div className="text-xs opacity-80">
          <div>{extendedProps.client}</div>
          <div>{extendedProps.type.replace('-', ' ')}</div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Navigation>
    );
  }

  // Add error handling for missing data
  if (!tasks && !taskDeadlines && !fixedSlotTasks && !projects && !sprints) {
    return (
      <Navigation>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
            <p className="text-gray-600">No calendar events found. Please check your data or try refreshing the page.</p>
          </div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Followup Calendar</h1>
          <Badge variant="secondary" className="ml-2">
            {calendarEvents.length} items
          </Badge>
        </div>
        


        {/* Selection Actions */}
        {selectedItems.size > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="bg-blue-600">
                    {selectedItems.size} selected
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Ready to assign to workload calendar
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDeselectAll}
                  >
                    Clear Selection
                  </Button>
                  <Button 
                    onClick={() => setShowAssignDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Assign to Slot
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Selection Controls */}
        {assignableItems.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Selection:</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSelectAll}
                  >
                    Select All Assignable
                  </Button>
                  <span className="text-xs text-gray-500">
                    ({assignableItems.length} items can be assigned)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event Type Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Event Type Filters</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setVisibleEventTypes(['reminder', 'task-deadline', 'fixed-slot', 'project-deadline', 'sprint-deadline'])}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setVisibleEventTypes([])}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {eventTypeFilters.map((filter) => {
                const Icon = filter.icon;
                const isActive = visibleEventTypes.includes(filter.type);
                
                return (
                  <Button
                    key={filter.type}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleEventTypeToggle(filter.type)}
                    className={`flex items-center gap-2 ${
                      isActive 
                        ? `${filter.bgColor} ${filter.textColor} ${filter.borderColor} border hover:${filter.bgColor}/80`
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-3 h-3 ${filter.color} rounded-full`}></div>
                    <Icon className="h-4 w-4" />
                    <span>{filter.label}</span>
                    {isActive && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {calendarEvents.filter(event => event.extendedProps.type === filter.type).length}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="space-y-4">
          {/* Client Filter */}
          {clients.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Client</h3>
              <div className="flex flex-wrap gap-2">
                {clients.map((client) => (
                  <Button
                    key={client.id}
                    variant={selectedClient === client.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleClientSelect(client.id)}
                    className="flex items-center gap-2"
                  >
                    <Building className="h-4 w-4" />
                    {client.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Project Filter */}
          {selectedClient && projectsForClient.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Project</h3>
              <div className="flex flex-wrap gap-2">
                {projectsForClient.map((project) => (
                  <Button
                    key={project.id}
                    variant={selectedProject === project.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleProjectSelect(project.id)}
                    className="flex items-center gap-2"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {project.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Calendar with Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Followup Calendar Views</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeView} onValueChange={setActiveView}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="month">Month</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="day">Day</TabsTrigger>
                    <TabsTrigger value="list">List</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="month" className="mt-4">
                    <FullCalendar
                      plugins={[dayGridPlugin]}
                      initialView="dayGridMonth"
                      events={calendarEvents}
                      eventContent={renderEventContent}
                      height={600}
                      headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: ''
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="week" className="mt-4">
                    <FullCalendar
                      plugins={[timeGridPlugin]}
                      initialView="timeGridWeek"
                      events={calendarEvents}
                      eventContent={renderEventContent}
                      height={600}
                      headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: ''
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="day" className="mt-4">
                    <FullCalendar
                      plugins={[timeGridPlugin]}
                      initialView="timeGridDay"
                      events={calendarEvents}
                      eventContent={renderEventContent}
                      height={600}
                      headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: ''
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="list" className="mt-4">
                    <FullCalendar
                      plugins={[listPlugin]}
                      initialView="listWeek"
                      events={calendarEvents}
                      height={600}
                      headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: ''
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Items List with Selection */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5" />
                  Assignable Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {assignableItems.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No assignable items found
                  </p>
                ) : (
                  assignableItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedItems.has(item.id)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={(checked) => 
                            handleItemSelect(item.id, checked as boolean)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {getItemIcon(
                              item.type === 'reminder' ? 'bell' :
                              item.type === 'task-deadline' ? 'clock' :
                              'calendar-check'
                            )}
                            <span className="font-medium text-sm truncate">
                              {item.title}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span>{item.client}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              <span>{item.project}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {format(parseISO(item.date), 'MMM dd, yyyy HH:mm')}
                              </span>
                            </div>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className="mt-2 text-xs"
                          >
                            {item.type.replace('-', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-400 rounded"></div>
                <Bell className="h-4 w-4" />
                <span className="text-sm">Reminders</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                <Clock className="h-4 w-4" />
                <span className="text-sm">Task Deadlines</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-400 rounded"></div>
                <CalendarCheck className="h-4 w-4" />
                <span className="text-sm">Fixed Slots</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-400 rounded"></div>
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Project Deadlines</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-400 rounded"></div>
                <Target className="h-4 w-4" />
                <span className="text-sm">Sprint Deadlines</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Dialog */}
        <AssignToSlotDialog
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          selectedItems={getSelectedItemsData()}
          onAssigned={() => {
            setSelectedItems(new Set());
            setShowAssignDialog(false);
          }}
        />
      </div>
    </Navigation>
  );
};

export default FollowupCal;
