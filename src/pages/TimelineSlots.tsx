
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Clock, CalendarIcon, Building, User, Filter } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskSlot {
  id: string;
  name: string;
  slot_start_datetime: string;
  slot_end_datetime: string;
  assignee?: {
    name: string;
  };
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
}

const TimelineSlots = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'users' | 'clients' | 'projects'>('users');

  const { data: taskSlots = [], isLoading } = useQuery({
    queryKey: ['timeline-slots', selectedDate, selectedClient, selectedProject],
    queryFn: async () => {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from('tasks')
        .select(`
          id,
          name,
          slot_start_datetime,
          slot_end_datetime,
          assignee:employees!tasks_assignee_id_fkey(
            name
          ),
          project:projects(
            id,
            name,
            client:clients(
              id,
              name
            )
          )
        `)
        .not('slot_start_datetime', 'is', null)
        .not('slot_end_datetime', 'is', null)
        .gte('slot_start_datetime', startOfDay.toISOString())
        .lte('slot_start_datetime', endOfDay.toISOString());

      if (selectedClient !== 'all') {
        query = query.eq('project.client.id', selectedClient);
      }

      if (selectedProject !== 'all') {
        query = query.eq('project.id', selectedProject);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as TaskSlot[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['timeline-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['timeline-projects', selectedClient],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (selectedClient !== 'all') {
        query = query.eq('client_id', selectedClient);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  // Generate hours array (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get unique entities for Y-axis based on view mode
  const entities = React.useMemo(() => {
    switch (viewMode) {
      case 'users':
        return Array.from(new Set(taskSlots.map(task => task.assignee?.name || 'Unassigned')));
      case 'clients':
        return Array.from(new Set(taskSlots.map(task => task.project.client.name)));
      case 'projects':
        return Array.from(new Set(taskSlots.map(task => task.project.name)));
      default:
        return [];
    }
  }, [taskSlots, viewMode]);

  // Function to get task slots for a specific entity and time period
  const getTasksForEntityAndTime = (entity: string, startHour: number, endHour: number) => {
    return taskSlots.filter(task => {
      let entityName = '';
      switch (viewMode) {
        case 'users':
          entityName = task.assignee?.name || 'Unassigned';
          break;
        case 'clients':
          entityName = task.project.client.name;
          break;
        case 'projects':
          entityName = task.project.name;
          break;
      }
      
      if (entityName !== entity) return false;

      const startTime = parseISO(task.slot_start_datetime);
      const endTime = parseISO(task.slot_end_datetime);
      const taskStartHour = startTime.getHours() + startTime.getMinutes() / 60;
      const taskEndHour = endTime.getHours() + endTime.getMinutes() / 60;

      return taskStartHour < endHour && taskEndHour > startHour;
    });
  };

  // Calculate task duration in minutes
  const getTaskDuration = (task: TaskSlot) => {
    const startTime = parseISO(task.slot_start_datetime);
    const endTime = parseISO(task.slot_end_datetime);
    return differenceInMinutes(endTime, startTime);
  };

  // Get color intensity based on duration
  const getTaskColor = (duration: number) => {
    if (duration <= 30) return 'bg-blue-200';
    if (duration <= 60) return 'bg-blue-400';
    if (duration <= 120) return 'bg-blue-600';
    return 'bg-blue-800';
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
          <Clock className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Timeline Slots</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              Task Timeline Visualization
            </CardTitle>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* View Mode Selector */}
              <Select value={viewMode} onValueChange={(value: 'users' | 'clients' | 'projects') => setViewMode(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="View by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Users
                    </div>
                  </SelectItem>
                  <SelectItem value="clients">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Clients
                    </div>
                  </SelectItem>
                  <SelectItem value="projects">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Projects
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Client Filter */}
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Project Filter */}
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            {entities.length === 0 || taskSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium mb-1">No scheduled slots found</p>
                <p className="text-sm">No tasks with time slots for the selected date and filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>Duration intensity:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-200 border"></div>
                    <span>≤30min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400"></div>
                    <span>≤1hr</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600"></div>
                    <span>≤2hrs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-800"></div>
                    <span>&gt;2hrs</span>
                  </div>
                </div>

                {/* Timeline Grid */}
                <div className="overflow-x-auto">
                  <div className="min-w-[1200px]">
                    {/* Hour headers */}
                    <div className="grid grid-cols-25 gap-1 mb-2">
                      <div className="text-xs font-medium text-gray-500 p-1"></div>
                      {hours.map(hour => (
                        <div key={hour} className="text-xs text-center text-gray-500 p-1">
                          {hour.toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>

                    {/* Entity rows */}
                    <TooltipProvider>
                      {entities.map(entity => (
                        <div key={entity} className="grid grid-cols-25 gap-1 mb-2 relative">
                          <div className="text-xs font-medium text-gray-700 p-2 truncate" title={entity}>
                            {entity}
                          </div>
                          {/* Timeline cells */}
                          {hours.map(hour => (
                            <div key={hour} className="relative h-12 border border-gray-200">
                              {/* Render task blocks that overlap with this hour */}
                              {taskSlots
                                .filter(task => {
                                  let entityName = '';
                                  switch (viewMode) {
                                    case 'users':
                                      entityName = task.assignee?.name || 'Unassigned';
                                      break;
                                    case 'clients':
                                      entityName = task.project.client.name;
                                      break;
                                    case 'projects':
                                      entityName = task.project.name;
                                      break;
                                  }
                                  
                                  if (entityName !== entity) return false;

                                  const startTime = parseISO(task.slot_start_datetime);
                                  const endTime = parseISO(task.slot_end_datetime);
                                  const taskStartHour = startTime.getHours();
                                  const taskEndHour = endTime.getHours();

                                  return hour >= taskStartHour && hour < taskEndHour;
                                })
                                .map((task, index) => {
                                  const startTime = parseISO(task.slot_start_datetime);
                                  const endTime = parseISO(task.slot_end_datetime);
                                  const duration = getTaskDuration(task);
                                  const colorClass = getTaskColor(duration);

                                  return (
                                    <Tooltip key={`${task.id}-${hour}`}>
                                      <TooltipContent>
                                        <div className="space-y-1">
                                          <div className="font-medium">{task.name}</div>
                                          <div className="text-xs">
                                            Duration: {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')} ({duration}min)
                                          </div>
                                          <div className="text-xs">Assignee: {task.assignee?.name || 'Unassigned'}</div>
                                          <div className="text-xs">Client: {task.project.client.name}</div>
                                          <div className="text-xs">Project: {task.project.name}</div>
                                        </div>
                                      </TooltipContent>
                                      <div 
                                        className={cn(
                                          'absolute inset-1 rounded text-white text-xs p-1 cursor-pointer hover:opacity-80 transition-opacity',
                                          colorClass
                                        )}
                                        style={{ top: `${index * 8}px` }}
                                      >
                                        <div className="truncate font-medium">{task.name}</div>
                                      </div>
                                    </Tooltip>
                                  );
                                })}
                            </div>
                          ))}
                        </div>
                      ))}
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default TimelineSlots;
