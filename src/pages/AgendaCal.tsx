
import React, { useState, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';

interface Task {
  id: string;
  name: string;
  project_id: string;
  assignee_id: string | null;
  start_date?: string;
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
  sprints?: {
    title: string;
  }[];
}

interface CalendarItem {
  id: string;
  name: string;
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
          deadline,
          created_at,
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

      const startDate = task.created_at ? parseISO(task.created_at) : new Date();
      const endDate = task.deadline ? parseISO(task.deadline) : startDate;
      const sprintName = task.sprints && task.sprints.length > 0 ? task.sprints[0].title : 'No Sprint';

      items.push({
        id: task.id,
        name: task.assignee?.name || 'Unassigned',
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
      <div className="flex h-screen">
        {/* Left Panel - Filters */}
        <div className="w-80 bg-gray-50 border-r p-6 overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold">Agenda Calendar</h2>
          </div>

          <div className="space-y-6">
            {/* Service Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Service</label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by service" />
                </SelectTrigger>
                <SelectContent>
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
            <div>
              <label className="block text-sm font-medium mb-2">Client</label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by client" />
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
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Projects</label>
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2 bg-white">
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
        <div className="flex-1 flex flex-col">
          {/* Calendar Header */}
          <div className="border-b p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">{getDateRangeText()}</h1>
                <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="flex-1 overflow-auto p-4">
            {viewMode === 'day' ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  {format(currentDate, 'EEEE, MMMM d')}
                </h3>
                <div className="space-y-2">
                  {getItemsForDate(currentDate).map((item) => (
                    <Card key={item.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="text-sm font-medium">
                          {item.name} || {item.task} || {item.sprint}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.project} • {item.client}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {getItemsForDate(currentDate).length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No tasks scheduled for this day
                    </div>
                  )}
                </div>
              </div>
            ) : viewMode === 'week' ? (
              <div className="grid grid-cols-7 gap-4">
                {getDateRange().map((date) => (
                  <div key={date.toISOString()} className="space-y-2">
                    <h3 className="text-sm font-semibold text-center border-b pb-2">
                      {format(date, 'EEE d')}
                    </h3>
                    <div className="space-y-1">
                      {getItemsForDate(date).map((item) => (
                        <Card key={`${date.toISOString()}-${item.id}`} className="border-l-4 border-l-green-500">
                          <CardContent className="p-2">
                            <div className="text-xs font-medium truncate">
                              {item.name} || {item.task}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {item.sprint}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {getDateRange().map((date) => (
                  <div key={date.toISOString()} className="min-h-24 border rounded p-1">
                    <div className="text-xs font-medium text-center mb-1">
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {getItemsForDate(date).slice(0, 2).map((item) => (
                        <div key={`${date.toISOString()}-${item.id}`} className="text-xs bg-blue-100 rounded p-1 truncate">
                          {item.name}
                        </div>
                      ))}
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
