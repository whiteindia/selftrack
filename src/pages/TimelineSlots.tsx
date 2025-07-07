import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, User, Building, Calendar as CalendarIconLucide } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { formatToIST } from '@/utils/timezoneUtils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import TaskEditDialog from '@/components/TaskEditDialog';

interface TimelineTask {
  id: string;
  name: string;
  slot_start_datetime: string;
  slot_end_datetime: string;
  status: string;
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
  assignee?: {
    id: string;
    name: string;
  };
}

type ViewMode = 'user' | 'client' | 'project';

const TimelineSlots = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('client'); // Changed default to 'client'
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['timeline-slots', selectedDate, user?.id],
    queryFn: async () => {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          slot_start_datetime,
          slot_end_datetime,
          status,
          project:projects(
            id,
            name,
            client:clients(
              id,
              name
            )
          ),
          assignee:employees!tasks_assignee_id_fkey(
            id,
            name
          )
        `)
        .not('slot_start_datetime', 'is', null)
        .not('slot_end_datetime', 'is', null)
        .gte('slot_start_datetime', startOfDay.toISOString())
        .lte('slot_start_datetime', endOfDay.toISOString())
        .order('slot_start_datetime', { ascending: true });

      if (error) throw error;
      return data as TimelineTask[];
    },
    enabled: !!user,
  });

  // Get unique clients from tasks for the selected date
  const availableClients = useMemo(() => {
    const clients = tasks.reduce((acc, task) => {
      const client = task.project.client;
      if (!acc.find(c => c.id === client.id)) {
        acc.push(client);
      }
      return acc;
    }, [] as { id: string; name: string }[]);
    return clients;
  }, [tasks]);

  // Get projects for selected client
  const availableProjects = useMemo(() => {
    if (!selectedClient) return [];
    return tasks
      .filter(task => task.project.client.id === selectedClient)
      .reduce((acc, task) => {
        const project = task.project;
        if (!acc.find(p => p.id === project.id)) {
          acc.push(project);
        }
        return acc;
      }, [] as { id: string; name: string }[]);
  }, [tasks, selectedClient]);

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (selectedClient && task.project.client.id !== selectedClient) {
        return false;
      }
      if (selectedProject && task.project.id !== selectedProject) {
        return false;
      }
      return true;
    });
  }, [tasks, selectedClient, selectedProject]);

  // Generate timeline data based on view mode
  const timelineData = useMemo(() => {
    const groups = new Map<string, { name: string; tasks: TimelineTask[] }>();

    filteredTasks.forEach(task => {
      let groupKey: string;
      let groupName: string;

      switch (viewMode) {
        case 'user':
          groupKey = task.assignee?.id || 'unassigned';
          groupName = task.assignee?.name || 'Unassigned';
          break;
        case 'client':
          groupKey = task.project.client.id;
          groupName = task.project.client.name;
          break;
        case 'project':
          groupKey = task.project.id;
          groupName = task.project.name;
          break;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { name: groupName, tasks: [] });
      }
      groups.get(groupKey)!.tasks.push(task);
    });

    return Array.from(groups.entries()).map(([key, value]) => ({
      id: key,
      name: value.name,
      tasks: value.tasks.sort((a, b) => 
        new Date(a.slot_start_datetime).getTime() - new Date(b.slot_start_datetime).getTime()
      )
    }));
  }, [filteredTasks, viewMode]);

  // Generate time slots (only show hours that have tasks)
  const activeTimeSlots = useMemo(() => {
    const hoursWithTasks = new Set<number>();
    
    filteredTasks.forEach(task => {
      const startHour = new Date(task.slot_start_datetime).getHours();
      const endHour = new Date(task.slot_end_datetime).getHours();
      
      for (let hour = startHour; hour <= endHour; hour++) {
        hoursWithTasks.add(hour);
      }
    });

    return Array.from(hoursWithTasks).sort((a, b) => a - b);
  }, [filteredTasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500';
      case 'In Progress':
        return 'bg-blue-500';
      case 'Not Started':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getTaskPosition = (task: TimelineTask) => {
    const startDate = parseISO(task.slot_start_datetime);
    const endDate = parseISO(task.slot_end_datetime);
    
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    const duration = endMinutes - startMinutes;
    
    // Calculate position as percentage of the day (1440 minutes)
    const leftPercentage = (startMinutes / 1440) * 100;
    const widthPercentage = (duration / 1440) * 100;
    
    return {
      left: `${leftPercentage}%`,
      width: `${Math.max(widthPercentage, 2)}%`, // Minimum 2% width for visibility
    };
  };

  const handleTaskClick = (task: TimelineTask) => {
    setSelectedTask(task);
  };

  const handleCloseDialog = () => {
    setSelectedTask(null);
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
          <Clock className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Team Slots</h1>
          <Badge variant="secondary" className="ml-2">
            {filteredTasks.length} tasks
          </Badge>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* View Mode */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">View By</label>
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User
                  </div>
                </SelectItem>
                <SelectItem value="client">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Client
                  </div>
                </SelectItem>
                <SelectItem value="project">
                  <div className="flex items-center gap-2">
                    <CalendarIconLucide className="h-4 w-4" />
                    Project
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Client</label>
            <Select value={selectedClient || 'all'} onValueChange={(value) => {
              setSelectedClient(value === 'all' ? null : value);
              setSelectedProject(null);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {availableClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Project</label>
            <Select 
              value={selectedProject || 'all'} 
              onValueChange={(value) => setSelectedProject(value === 'all' ? null : value)}
              disabled={!selectedClient}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {availableProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Legend */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Status Legend</CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded"></div>
                <span>Not Started</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Completed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Heatmap */}
        {timelineData.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Clock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No Team Slots Found</h3>
                <p className="text-sm">No tasks with time slots for {format(selectedDate, "PPP")}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Timeline - {format(selectedDate, "PPP")}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Time Header */}
              <div className="mb-4">
                <div className="flex">
                  <div className="w-48 flex-shrink-0"></div>
                  <div className="flex-1 relative h-8 border-b border-gray-200">
                    {activeTimeSlots.map((hour) => (
                      <div
                        key={hour}
                        className="absolute text-xs text-gray-600 transform -translate-x-1/2"
                        style={{ left: `${(hour / 24) * 100}%` }}
                      >
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeline Rows */}
              <div className="space-y-3">
                {timelineData.map((group) => (
                  <div key={group.id} className="flex">
                    {/* Group Label */}
                    <div className="w-48 flex-shrink-0 pr-4">
                      <div className="font-medium text-sm truncate" title={group.name}>
                        {group.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative h-12 bg-gray-50 rounded border">
                      {group.tasks.map((task) => {
                        const position = getTaskPosition(task);
                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "absolute top-1 bottom-1 rounded px-2 text-xs text-white flex items-center cursor-pointer hover:opacity-80 transition-opacity",
                              getStatusColor(task.status)
                            )}
                            style={position}
                            title={`${task.name} (${formatToIST(task.slot_start_datetime, 'HH:mm')} - ${formatToIST(task.slot_end_datetime, 'HH:mm')})`}
                            onClick={() => handleTaskClick(task)}
                          >
                            <span className="truncate font-medium">{task.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Detail Dialog */}
        {selectedTask && (
          <TaskEditDialog
            isOpen={!!selectedTask}
            onClose={handleCloseDialog}
            task={{
              id: selectedTask.id,
              name: selectedTask.name,
              status: selectedTask.status,
              project_id: selectedTask.project.id,
              assignee_id: selectedTask.assignee?.id,
              slot_start_datetime: selectedTask.slot_start_datetime,
              slot_end_datetime: selectedTask.slot_end_datetime,
            }}
            mode="full"
          />
        )}
      </div>
    </Navigation>
  );
};

export default TimelineSlots;
