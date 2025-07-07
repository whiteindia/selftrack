
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Bell, Calendar as CalendarIcon, Clock, User, Building, Edit, List, Grid, Target, AlertTriangle } from 'lucide-react';
import { format, parseISO, isSameDay, isAfter, isBefore, addDays } from 'date-fns';
import { formatToIST } from '@/utils/timezoneUtils';
import { useAuth } from '@/contexts/AuthContext';
import TaskEditDialog from '@/components/TaskEditDialog';
import NotificationSettings from '@/components/NotificationSettings';

interface Task {
  id: string;
  name: string;
  reminder_datetime: string;
  status: string;
  deadline: string | null;
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
}

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: string;
  project?: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
}

const Reminders = () => {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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
          project:projects(
            id,
            name,
            client:clients(
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

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });

  // Fetch task deadlines
  const { data: taskDeadlines = [], isLoading: taskDeadlinesLoading } = useQuery({
    queryKey: ['task-deadlines', user?.id],
    queryFn: async () => {
      const today = new Date();
      const futureDate = addDays(today, 30); // Show deadlines within next 30 days

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          deadline,
          status,
          assignee_id,
          project:projects(
            id,
            name,
            client:clients(
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

      if (error) throw error;
      return data as TaskDeadline[];
    },
    enabled: !!user,
  });

  // Fetch upcoming project deadlines
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['upcoming-project-deadlines', user?.id],
    queryFn: async () => {
      const today = new Date();
      const futureDate = addDays(today, 30); // Show deadlines within next 30 days

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

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });

  // Fetch upcoming sprint deadlines
  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ['upcoming-sprint-deadlines', user?.id],
    queryFn: async () => {
      const today = new Date();
      const futureDate = addDays(today, 30); // Show deadlines within next 30 days

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
            client:client_id(
              id,
              name
            )
          )
        `)
        .not('deadline', 'is', null)
        .gte('deadline', today.toISOString().split('T')[0])
        .lte('deadline', futureDate.toISOString().split('T')[0])
        .order('deadline', { ascending: true });

      if (error) throw error;
      return data as Sprint[];
    },
    enabled: !!user,
  });

  const isLoading = tasksLoading || taskDeadlinesLoading || projectsLoading || sprintsLoading;

  // Get unique clients from all data
  const clients = React.useMemo(() => {
    const allItems = [...tasks, ...taskDeadlines, ...projects, ...sprints];
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
  }, [tasks, taskDeadlines, projects, sprints]);

  // Get projects for selected client
  const projectsForClient = React.useMemo(() => {
    if (!selectedClient) return [];
    
    const allItems = [...tasks, ...taskDeadlines, ...projects, ...sprints];
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
  }, [selectedClient, tasks, taskDeadlines, projects, sprints]);

  // Filter tasks based on selected filters
  const filteredTasks = tasks.filter(task => {
    if (selectedClient && task.project.client.id !== selectedClient) {
      return false;
    }
    if (selectedProject && task.project.id !== selectedProject) {
      return false;
    }
    return true;
  });

  // Filter task deadlines based on selected filters
  const filteredTaskDeadlines = taskDeadlines.filter(task => {
    if (selectedClient && task.project.client.id !== selectedClient) {
      return false;
    }
    if (selectedProject && task.project.id !== selectedProject) {
      return false;
    }
    return true;
  });

  // Filter projects based on selected filters
  const filteredProjects = projects.filter(project => {
    if (selectedClient && project.clients.id !== selectedClient) {
      return false;
    }
    if (selectedProject && project.id !== selectedProject) {
      return false;
    }
    return true;
  });

  // Filter sprints based on selected filters
  const filteredSprints = sprints.filter(sprint => {
    if (selectedClient && sprint.project?.client.id !== selectedClient) {
      return false;
    }
    if (selectedProject && sprint.project?.id !== selectedProject) {
      return false;
    }
    return true;
  });

  // Combine all items for calendar view
  const allItems = [
    ...filteredTasks.map(task => ({
      ...task,
      type: 'reminder' as const,
      datetime: task.reminder_datetime,
    })),
    ...filteredTaskDeadlines.map(task => ({
      ...task,
      type: 'task-deadline' as const,
      datetime: task.deadline + 'T23:59:59',
    })),
    ...filteredProjects.map(project => ({
      ...project,
      type: 'project-deadline' as const,
      datetime: project.deadline + 'T23:59:59',
    })),
    ...filteredSprints.map(sprint => ({
      ...sprint,
      type: 'sprint-deadline' as const,
      datetime: sprint.deadline + 'T23:59:59',
    })),
  ].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  // Get items for selected date in calendar view
  const itemsForSelectedDate = selectedDate 
    ? allItems.filter(item => 
        isSameDay(parseISO(item.datetime), selectedDate)
      )
    : [];

  // Get dates that have reminders or deadlines for calendar highlighting
  const highlightDates = allItems.map(item => parseISO(item.datetime));

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Active':
        return 'bg-blue-100 text-blue-800';
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeadlineUrgency = (deadline: string) => {
    const deadlineDate = parseISO(deadline);
    const today = new Date();
    const daysDiff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return { color: 'text-red-600', label: 'Overdue', urgent: true };
    if (daysDiff <= 3) return { color: 'text-red-600', label: `${daysDiff} day(s) left`, urgent: true };
    if (daysDiff <= 7) return { color: 'text-orange-600', label: `${daysDiff} day(s) left`, urgent: false };
    return { color: 'text-gray-600', label: `${daysDiff} day(s) left`, urgent: false };
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

  return (
    <Navigation>
      <div className="space-y-6">
        {/* Notification Settings */}
        <NotificationSettings />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Reminders & Deadlines</h1>
            <Badge variant="secondary" className="ml-2">
              {allItems.length} items
            </Badge>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="flex items-center gap-2"
            >
              <Grid className="h-4 w-4" />
              Calendar
            </Button>
          </div>
        </div>

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

        {/* Calendar View */}
        {viewMode === 'calendar' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle>Reminders & Deadlines Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasItems: highlightDates
                  }}
                  modifiersStyles={{
                    hasItems: {
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontWeight: 'bold'
                    }
                  }}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Items for Selected Date */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? (
                    <>Items for {format(selectedDate, 'PPP')}</>
                  ) : (
                    'Select a Date'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {itemsForSelectedDate.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">
                      {selectedDate 
                        ? "No items for this date"
                        : "Select a date to view items"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itemsForSelectedDate.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`p-3 rounded-lg border ${
                          item.type === 'reminder' 
                            ? 'bg-orange-50 border-orange-200'
                            : item.type === 'task-deadline'
                            ? 'bg-yellow-50 border-yellow-200'
                            : item.type === 'project-deadline'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-purple-50 border-purple-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            {'name' in item ? item.name : item.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            {item.type === 'reminder' && (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200" variant="secondary">
                                <Bell className="h-3 w-3 mr-1" />
                                Reminder
                              </Badge>
                            )}
                            {item.type === 'task-deadline' && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200" variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Task DL
                              </Badge>
                            )}
                            {item.type === 'project-deadline' && (
                              <Badge className="bg-red-100 text-red-800 border-red-200" variant="secondary">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Project DL
                              </Badge>
                            )}
                            {item.type === 'sprint-deadline' && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200" variant="secondary">
                                <Target className="h-3 w-3 mr-1" />
                                Sprint DL
                              </Badge>
                            )}
                            {'status' in item && (
                              <Badge className={getStatusColor(item.status)} variant="secondary">
                                {item.status}
                              </Badge>
                            )}
                            {item.type === 'reminder' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTask(item as Task)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium">
                              {item.type === 'reminder' 
                                ? formatToIST(item.datetime, 'h:mm a')
                                : 'End of day'
                              }
                            </span>
                            {item.type !== 'reminder' && (
                              <span className={`ml-2 font-medium ${getDeadlineUrgency(item.datetime).color}`}>
                                {getDeadlineUrgency(item.datetime).label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-3 w-3" />
                            <span>
                              {'project' in item && item.project?.client?.name 
                                ? `${item.project.client.name} - ${item.project.name}`
                                : 'clients' in item && item.clients
                                ? `${item.clients.name} - ${item.name}`
                                : 'N/A'
                              }
                            </span>
                          </div>
                          {'assignee' in item && item.assignee && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span>{item.assignee.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // List View
          <>
            {allItems.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-gray-500">
                    <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Reminders or Deadlines Found</h3>
                    <p className="text-sm">
                      {tasks.length === 0 && taskDeadlines.length === 0 && projects.length === 0 && sprints.length === 0
                        ? "No reminders or upcoming deadlines."
                        : "No items match the selected filters."
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allItems.map((item) => (
                  <Card key={`${item.type}-${item.id}`} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-medium leading-tight">
                          {'name' in item ? item.name : item.title}
                          {item.type === 'reminder' && <Bell className="inline h-4 w-4 ml-2 text-orange-500" />}
                          {item.type === 'task-deadline' && <Clock className="inline h-4 w-4 ml-2 text-yellow-500" />}
                          {item.type === 'project-deadline' && <AlertTriangle className="inline h-4 w-4 ml-2 text-red-500" />}
                          {item.type === 'sprint-deadline' && <Target className="inline h-4 w-4 ml-2 text-purple-500" />}
                        </CardTitle>
                        {'status' in item && (
                          <Badge className={getStatusColor(item.status)} variant="secondary">
                            {item.status}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span>
                            {'project' in item && item.project?.client?.name 
                              ? item.project.client.name
                              : 'clients' in item && item.clients
                              ? item.clients.name
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {'project' in item && item.project?.name 
                              ? item.project.name
                              : 'name' in item
                              ? item.name
                              : 'N/A'
                            }
                          </span>
                        </div>
                        {'assignee' in item && item.assignee && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{item.assignee.name}</span>
                          </div>
                        )}
                        {'service' in item && item.service && (
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            <span>{item.service}</span>
                          </div>
                        )}
                        
                        <div className={`flex items-center justify-between p-2 rounded ${
                          item.type === 'reminder' 
                            ? 'bg-orange-50'
                            : item.type === 'task-deadline'
                            ? 'bg-yellow-50'
                            : item.type === 'project-deadline'
                            ? 'bg-red-50'
                            : 'bg-purple-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            {item.type === 'reminder' && <Bell className="h-4 w-4 text-orange-500" />}
                            {item.type === 'task-deadline' && <Clock className="h-4 w-4 text-yellow-500" />}
                            {item.type === 'project-deadline' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            {item.type === 'sprint-deadline' && <Target className="h-4 w-4 text-purple-500" />}
                            <span className={`font-medium ${
                              item.type === 'reminder' 
                                ? 'text-orange-800'
                                : item.type === 'task-deadline'
                                ? 'text-yellow-800'
                                : item.type === 'project-deadline'
                                ? 'text-red-800'
                                : 'text-purple-800'
                            }`}>
                              {item.type === 'reminder' 
                                ? formatToIST(item.datetime, 'PPp')
                                : formatToIST(item.datetime, 'PP')
                              }
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {item.type === 'reminder' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTask(item as Task)}
                                className="h-6 w-6 p-0 hover:bg-orange-100"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {item.type !== 'reminder' && (
                          <div className={`flex items-center gap-2 ${getDeadlineUrgency(item.datetime).color}`}>
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{getDeadlineUrgency(item.datetime).label}</span>
                            {getDeadlineUrgency(item.datetime).urgent && (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {editingTask && (
          <TaskEditDialog
            isOpen={!!editingTask}
            onClose={() => setEditingTask(null)}
            task={editingTask}
            mode="reminder"
          />
        )}
      </div>
    </Navigation>
  );
};

export default Reminders;
