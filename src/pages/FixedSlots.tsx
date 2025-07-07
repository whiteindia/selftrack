import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CalendarCheck, Calendar, Clock, User, Building, List, Edit, Trash2 } from 'lucide-react';
import { format, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { formatToIST } from '@/utils/timezoneUtils';
import { useAuth } from '@/contexts/AuthContext';
import TaskEditDialog from '@/components/TaskEditDialog';

interface Task {
  id: string;
  name: string;
  slot_start_datetime: string;
  slot_end_datetime: string;
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

const FixedSlots = () => {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
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
        .not('slot_start_datetime', 'is', null)
        .not('slot_end_datetime', 'is', null)
        .order('slot_start_datetime', { ascending: true });

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

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const minutes = differenceInMinutes(end, start);
    
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  };

  // Calendar-specific functions
  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const getTasksForDay = (day: Date) => {
    return filteredTasks.filter(task => {
      const startDate = parseISO(task.slot_start_datetime);
      return isSameDay(startDate, day);
    });
  };

  const getTaskPosition = (task: Task) => {
    const startDate = parseISO(task.slot_start_datetime);
    const endDate = parseISO(task.slot_end_datetime);
    
    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const endHour = endDate.getHours() + endDate.getMinutes() / 60;
    
    // Convert to percentage of day (assuming 24-hour view)
    const topPercentage = (startHour / 24) * 100;
    const heightPercentage = ((endHour - startHour) / 24) * 100;
    
    return {
      top: `${topPercentage}%`,
      height: `${Math.max(heightPercentage, 4)}%`, // Minimum 4% height for visibility
    };
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
          <CalendarCheck className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Fixed Slots</h1>
          <Badge variant="secondary" className="ml-2">
            {filteredTasks.length} tasks
          </Badge>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">View Mode:</span>
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'list' | 'calendar')}>
            <ToggleGroupItem value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </ToggleGroupItem>
          </ToggleGroup>
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

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="space-y-4">
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                Previous Week
              </Button>
              <h2 className="text-lg font-semibold">
                Week of {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </h2>
              <Button
                variant="outline"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                Next Week
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 min-h-[600px]">
              {getWeekDays().map((day) => {
                const dayTasks = getTasksForDay(day);
                return (
                  <div key={day.toISOString()} className="border rounded-lg p-2 bg-white min-h-[200px]">
                    <div className="font-medium text-sm text-gray-700 mb-2">
                      {format(day, 'EEE d')}
                    </div>
                    <div className="relative h-full">
                      {dayTasks.map((task) => {
                        const position = getTaskPosition(task);
                        return (
                          <div
                            key={task.id}
                            className="absolute left-0 right-0 bg-blue-100 border-l-4 border-blue-500 p-1 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors group"
                            style={position}
                            onClick={() => setEditingTask(task)}
                          >
                            <div className="font-medium truncate">{task.name}</div>
                            <div className="text-gray-600 truncate">{task.assignee?.name || 'Unassigned'}</div>
                            <div className="text-gray-500">
                                                      {formatToIST(task.slot_start_datetime, 'HH:mm')} -
                        {formatToIST(task.slot_end_datetime, 'HH:mm')}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTask(task);
                                }}
                                className="h-4 w-4 p-0 hover:bg-blue-300"
                              >
                                <Edit className="h-2 w-2" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <>
            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-gray-500">
                    <CalendarCheck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Fixed Slot Tasks Found</h3>
                    <p className="text-sm">
                      {tasks.length === 0 
                        ? "No tasks have fixed time slots set yet."
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
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CalendarCheck className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-800">
                                {formatDuration(task.slot_start_datetime, task.slot_end_datetime)} Slot
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTask(task)}
                              className="h-6 w-6 p-0 hover:bg-blue-100"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-blue-600 space-y-1">
                            <div>Start: {formatToIST(task.slot_start_datetime, 'PPp')}</div>
                            <div>End: {formatToIST(task.slot_end_datetime, 'PPp')}</div>
                          </div>
                        </div>
                        {task.deadline && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-500" />
                            <span>Due: {formatToIST(task.deadline, 'PP')}</span>
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
            mode="slot"
          />
        )}
      </div>
    </Navigation>
  );
};

export default FixedSlots;
