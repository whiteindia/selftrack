import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Clock, User, Building, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Reminders</h1>
          <Badge variant="secondary" className="ml-2">
            {filteredTasks.length} tasks
          </Badge>
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
                    <Calendar className="h-4 w-4" />
                    {project.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tasks Grid */}
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
                      <Calendar className="h-4 w-4" />
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
                          {format(new Date(task.reminder_datetime), 'PPp')}
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
                        <span>Due: {format(new Date(task.deadline), 'PP')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
