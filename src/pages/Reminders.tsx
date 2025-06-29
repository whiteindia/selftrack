
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Bell, Calendar as CalendarIcon, Clock, User, Building, Edit, List, Grid } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import TaskEditDialog from '@/components/TaskEditDialog';

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

const Reminders = () => {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: tasks = [], isLoading } = useQuery({
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

  // Get unique clients from tasks
  const clients = tasks.reduce((acc, task) => {
    const client = task.project.client;
    if (!acc.find(c => c.id === client.id)) {
      acc.push(client);
    }
    return acc;
  }, [] as { id: string; name: string }[]);

  // Get projects for selected client
  const projects = selectedClient 
    ? tasks
        .filter(task => task.project.client.id === selectedClient)
        .reduce((acc, task) => {
          const project = task.project;
          if (!acc.find(p => p.id === project.id)) {
            acc.push(project);
          }
          return acc;
        }, [] as { id: string; name: string }[])
    : [];

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

  // Get tasks for selected date in calendar view
  const tasksForSelectedDate = selectedDate 
    ? filteredTasks.filter(task => 
        isSameDay(parseISO(task.reminder_datetime), selectedDate)
      )
    : [];

  // Get dates that have reminders for calendar highlighting
  const reminderDates = filteredTasks.map(task => parseISO(task.reminder_datetime));

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
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Reminders</h1>
            <Badge variant="secondary" className="ml-2">
              {filteredTasks.length} tasks
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
          {selectedClient && projects.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Project</h3>
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => (
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
                <CardTitle>Reminder Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasReminder: reminderDates
                  }}
                  modifiersStyles={{
                    hasReminder: {
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontWeight: 'bold'
                    }
                  }}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Tasks for Selected Date */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? (
                    <>Reminders for {format(selectedDate, 'PPP')}</>
                  ) : (
                    'Select a Date'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasksForSelectedDate.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">
                      {selectedDate 
                        ? "No reminders for this date"
                        : "Select a date to view reminders"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasksForSelectedDate.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-orange-50 rounded-lg border border-orange-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{task.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(task.status)} variant="secondary">
                              {task.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTask(task)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-orange-500" />
                            <span className="font-medium text-orange-800">
                              {format(parseISO(task.reminder_datetime), 'h:mm a')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-3 w-3" />
                            <span>{task.project.client.name} - {task.project.name}</span>
                          </div>
                          {task.assignee && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span>{task.assignee.name}</span>
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
          // List View (existing code)
          <>
            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-gray-500">
                    <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Reminder Tasks Found</h3>
                    <p className="text-sm">
                      {tasks.length === 0 
                        ? "No tasks have reminders set yet."
                        : "No tasks match the selected filters."
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTasks.map((task) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-medium leading-tight">
                          {task.name}
                          <Bell className="inline h-4 w-4 ml-2 text-orange-500" />
                        </CardTitle>
                        <Badge className={getStatusColor(task.status)} variant="secondary">
                          {task.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span>{task.project.client.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{task.project.name}</span>
                        </div>
                        {task.assignee && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{task.assignee.name}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between bg-orange-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-orange-800">
                              {format(parseISO(task.reminder_datetime), 'PPp')}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTask(task)}
                              className="h-6 w-6 p-0 hover:bg-orange-100"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {task.deadline && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-500" />
                            <span>Due: {format(parseISO(task.deadline), 'PP')}</span>
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
