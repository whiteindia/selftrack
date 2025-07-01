
import React, { useState, useMemo, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Circle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';

interface Task {
  id: string;
  name: string;
  project_id: string;
  assignee_id: string | null;
  assigner_id: string | null;
  date: string;
  deadline?: string;
  status: string;
  projects: {
    name: string;
    service: string;
    client_id: string;
    clients: {
      name: string;
    };
  };
  assignee: {
    name: string;
  } | null;
  assigner: {
    name: string;
  } | null;
  sprints?: {
    title: string;
  }[];
}

interface CalendarItem {
  id: string;
  task: string;
  sprint: string;
  startDate: Date;
  endDate: Date;
  service: string;
  client: string;
  project: string;
}

type ViewMode = 'day' | 'week' | 'month';

const AgendaCal = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for live timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch running tasks (tasks with active time entries)
  const { data: runningTasks = [] } = useQuery({
    queryKey: ['running-tasks-agenda'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          start_time,
          task_id,
          tasks (
            id,
            name
          )
        `)
        .is('end_time', null)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 2000
  });

  // Fetch services for filter
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch clients for filter
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          service,
          client_id,
          clients (
            name
          )
        `)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch tasks with related data
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['agenda-tasks', currentDate, viewMode],
    queryFn: async () => {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          project_id,
          assignee_id,
          assigner_id,
          date,
          deadline,
          status,
          projects (
            name,
            service,
            client_id,
            clients (
              name
            )
          ),
          assignee:employees!assignee_id (
            name
          ),
          assigner:employees!assigner_id (
            name
          )
        `)
        .order('deadline', { ascending: true });

      if (tasksError) throw tasksError;

      // Fetch sprint data for tasks
      const tasksWithSprints: Task[] = [];
      
      for (const task of tasksData || []) {
        const { data: sprintTasks } = await supabase
          .from('sprint_tasks')
          .select(`
            sprints (
              title
            )
          `)
          .eq('task_id', task.id);

        tasksWithSprints.push({
          ...task,
          sprints: sprintTasks?.map(st => st.sprints).filter(Boolean) || []
        });
      }

      return tasksWithSprints;
    }
  });

  // Format elapsed time for running tasks
  const formatElapsedTime = (startTime: string) => {
    const start = new Date(startTime);
    const elapsed = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Check if a task is currently running
  const getRunningTaskEntry = (taskId: string) => {
    return runningTasks.find(entry => entry.task_id === taskId);
  };

  // Filter projects based on client filter
  const filteredProjects = useMemo(() => {
    if (clientFilter === 'all') return projects;
    return projects.filter(project => project.client_id === clientFilter);
  }, [projects, clientFilter]);

  // Generate calendar items from tasks
  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];
    
    tasks.forEach(task => {
      if (!task.projects) return;
      
      // Apply filters
      if (serviceFilter !== 'all' && task.projects.service !== serviceFilter) return;
      if (clientFilter !== 'all' && task.projects.client_id !== clientFilter) return;
      if (projectFilter !== 'all' && task.project_id !== projectFilter) return;

      const startDate = task.date ? parseISO(task.date) : new Date();
      const endDate = task.deadline ? parseISO(task.deadline) : startDate;
      const sprintName = task.sprints && task.sprints.length > 0 ? task.sprints[0].title : 'No Sprint';

      items.push({
        id: task.id,
        task: task.name,
        sprint: sprintName,
        startDate,
        endDate,
        service: task.projects.service,
        client: task.projects.clients?.name || 'Unknown Client',
        project: task.projects.name
      });
    });

    return items;
  }, [tasks, serviceFilter, clientFilter, projectFilter]);

  // Get date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return [currentDate];
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: weekStart, end: weekEnd });
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return eachDayOfInterval({ start: monthStart, end: monthEnd });
      default:
        return [currentDate];
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
    }
  };

  const getItemsForDate = (date: Date) => {
    return calendarItems.filter(item => 
      isSameDay(item.startDate, date) || 
      isSameDay(item.endDate, date) ||
      (item.startDate <= date && item.endDate >= date)
    );
  };

  const getDateRangeText = () => {
    const dateRange = getDateRange();
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        return `${format(dateRange[0], 'MMM d')} - ${format(dateRange[dateRange.length - 1], 'MMM d, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
    }
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading agenda calendar...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="flex flex-col lg:flex-row h-screen relative">
        {/* Left Panel - Filters */}
        <div className="w-full lg:w-80 bg-gray-50 border-b lg:border-r lg:border-b-0 px-1 lg:p-6 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4 lg:mb-6">
            <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
            <h2 className="text-lg lg:text-xl font-bold">Agenda Calendar</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-6 lg:space-y-0 lg:space-y-6">
            {/* Service Filter */}
            <div className="lg:space-y-0 relative z-50">
              <label className="block text-sm font-medium mb-2">Service</label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="bg-white border border-gray-200 shadow-sm">
                  <SelectValue placeholder="Filter by service" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.name}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Filter */}
            <div className="lg:space-y-0 relative z-40">
              <label className="block text-sm font-medium mb-2">Client</label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="bg-white border border-gray-200 shadow-sm">
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-40">
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Filter */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1 lg:space-y-0 relative z-30">
              <label className="block text-sm font-medium mb-2">Projects</label>
              <div className="space-y-1 max-h-32 lg:max-h-48 overflow-y-auto border rounded-md p-2 bg-white">
                <div
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${
                    projectFilter === 'all' ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                  onClick={() => setProjectFilter('all')}
                >
                  <Circle className="h-3 w-3 fill-current" />
                  <span className="text-sm">All Projects</span>
                </div>
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${
                      projectFilter === project.id ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                    onClick={() => setProjectFilter(project.id)}
                  >
                    <Circle className="h-3 w-3 fill-current" />
                    <span className="text-sm truncate">{project.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Calendar View */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Calendar Header */}
          <div className="border-b px-1 lg:p-4 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-4 mb-3 lg:mb-4">
              <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                <Button variant="outline" size="icon" onClick={() => navigateDate('prev')} className="flex-shrink-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg lg:text-2xl font-bold truncate">{getDateRangeText()}</h1>
                <Button variant="outline" size="icon" onClick={() => navigateDate('next')} className="flex-shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
                {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="capitalize text-xs lg:text-sm px-2 lg:px-3"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="flex-1 overflow-auto px-1 lg:p-4">
            {viewMode === 'day' ? (
              <div className="space-y-3 lg:space-y-4">
                <h3 className="text-base lg:text-lg font-semibold border-b pb-2">
                  {format(currentDate, 'EEEE, MMMM d')}
                </h3>
                <div className="space-y-2">
                  {getItemsForDate(currentDate).map((item) => {
                    const runningEntry = getRunningTaskEntry(item.id);
                    return (
                      <Card key={item.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-3 lg:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium break-words">
                                {item.task} || {item.sprint}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 break-words">
                                {item.project} • {item.client}
                              </div>
                            </div>
                            {runningEntry && (
                              <div className="flex items-center text-sm text-green-600 font-mono bg-green-50 px-2 py-1 rounded flex-shrink-0">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatElapsedTime(runningEntry.start_time)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {getItemsForDate(currentDate).length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No tasks scheduled for this day
                    </div>
                  )}
                </div>
              </div>
            ) : viewMode === 'week' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3 lg:gap-4">
                {getDateRange().map((date) => (
                  <div key={date.toISOString()} className="space-y-2">
                    <h3 className="text-sm font-semibold text-center border-b pb-2">
                      {format(date, 'EEE d')}
                    </h3>
                    <div className="space-y-1">
                      {getItemsForDate(date).map((item) => {
                        const runningEntry = getRunningTaskEntry(item.id);
                        return (
                          <Card key={`${date.toISOString()}-${item.id}`} className="border-l-4 border-l-green-500">
                            <CardContent className="p-2">
                              <div className="text-xs font-medium truncate">
                                {item.task}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {item.sprint}
                              </div>
                              {runningEntry && (
                                <div className="flex items-center text-xs text-green-600 font-mono mt-1">
                                  <Clock className="h-2 w-2 mr-1" />
                                  {formatElapsedTime(runningEntry.start_time)}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 lg:gap-2">
                {getDateRange().map((date) => (
                  <div key={date.toISOString()} className="min-h-16 lg:min-h-24 border rounded p-1">
                    <div className="text-xs font-medium text-center mb-1">
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {getItemsForDate(date).slice(0, 2).map((item) => {
                        const runningEntry = getRunningTaskEntry(item.id);
                        return (
                          <div key={`${date.toISOString()}-${item.id}`} className="text-xs bg-blue-100 rounded p-1">
                            <div className="truncate">{item.task}</div>
                            {runningEntry && (
                              <div className="flex items-center text-green-600 font-mono text-xs">
                                <Clock className="h-2 w-2 mr-1" />
                                {formatElapsedTime(runningEntry.start_time)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {getItemsForDate(date).length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{getItemsForDate(date).length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Navigation>
  );
};

export default AgendaCal;
