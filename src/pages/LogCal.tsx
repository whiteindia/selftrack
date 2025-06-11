
import React, { useState, useMemo, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, ChevronLeft, ChevronRight, Circle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, subDays, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface TimeEntry {
  id: string;
  task_id: string;
  employee_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  comment: string | null;
  tasks: {
    id: string;
    name: string;
    project_id: string;
    assignee_id: string | null;
    assigner_id: string | null;
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
  };
  employee: {
    name: string;
  };
  sprints?: {
    title: string;
  }[];
}

interface CalendarSlot {
  hour: number;
  entries: TimeEntry[];
}

const LogCal = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [assignerFilter, setAssignerFilter] = useState<string>('all');

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

  // Fetch employees for assignee/assigner filters
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch time entries with related data for the selected date
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['log-time-entries', currentDate],
    queryFn: async () => {
      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);

      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select(`
          id,
          task_id,
          employee_id,
          start_time,
          end_time,
          duration_minutes,
          comment,
          tasks (
            id,
            name,
            project_id,
            assignee_id,
            assigner_id,
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
          ),
          employee:employees!employee_id (
            name
          )
        `)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .not('end_time', 'is', null)
        .order('start_time', { ascending: true });

      if (entriesError) throw entriesError;

      // Fetch sprint data for each task
      const entriesWithSprints: TimeEntry[] = [];
      
      for (const entry of entriesData || []) {
        const { data: sprintTasks } = await supabase
          .from('sprint_tasks')
          .select(`
            sprints (
              title
            )
          `)
          .eq('task_id', entry.task_id);

        entriesWithSprints.push({
          ...entry,
          sprints: sprintTasks?.map(st => st.sprints).filter(Boolean) || []
        });
      }

      return entriesWithSprints;
    }
  });

  // Filter projects based on client filter
  const filteredProjects = useMemo(() => {
    if (clientFilter === 'all') return projects;
    return projects.filter(project => project.client_id === clientFilter);
  }, [projects, clientFilter]);

  // Apply filters to time entries
  const filteredTimeEntries = useMemo(() => {
    return timeEntries.filter(entry => {
      if (!entry.tasks || !entry.tasks.projects) return false;
      
      // Apply filters
      if (serviceFilter !== 'all' && entry.tasks.projects.service !== serviceFilter) return false;
      if (clientFilter !== 'all' && entry.tasks.projects.client_id !== clientFilter) return false;
      if (projectFilter !== 'all' && entry.tasks.project_id !== projectFilter) return false;
      if (assigneeFilter !== 'all' && entry.tasks.assignee_id !== assigneeFilter) return false;
      if (assignerFilter !== 'all' && entry.tasks.assigner_id !== assignerFilter) return false;

      return true;
    });
  }, [timeEntries, serviceFilter, clientFilter, projectFilter, assigneeFilter, assignerFilter]);

  // Generate 24-hour calendar slots
  const calendarSlots = useMemo(() => {
    const slots: CalendarSlot[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const entries = filteredTimeEntries.filter(entry => {
        const entryStart = parseISO(entry.start_time);
        const entryHour = entryStart.getHours();
        return entryHour === hour;
      });
      
      slots.push({ hour, entries });
    }
    
    return slots;
  }, [filteredTimeEntries]);

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const formatTimeRange = (startTime: string, endTime: string | null) => {
    if (!endTime) return format(parseISO(startTime), 'HH:mm') + ' - Running';
    return `${format(parseISO(startTime), 'HH:mm')} - ${format(parseISO(endTime), 'HH:mm')}`;
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading log calendar...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Left Panel - Filters */}
        <div className="w-full lg:w-80 bg-gray-50 border-b lg:border-r lg:border-b-0 p-4 lg:p-6 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4 lg:mb-6">
            <CalendarClock className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
            <h2 className="text-lg lg:text-xl font-bold">Log Calendar</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-6 lg:space-y-0 lg:space-y-6">
            {/* Service Filter */}
            <div className="lg:space-y-0">
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
            <div className="lg:space-y-0">
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

            {/* Assignee Filter */}
            <div className="lg:space-y-0">
              <label className="block text-sm font-medium mb-2">Assignee</label>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigner Filter */}
            <div className="lg:space-y-0">
              <label className="block text-sm font-medium mb-2">Assigner</label>
              <Select value={assignerFilter} onValueChange={setAssignerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by assigner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assigners</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Filter */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1 lg:space-y-0">
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
          <div className="border-b p-3 lg:p-4 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-4">
              <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                <Button variant="outline" size="icon" onClick={() => navigateDate('prev')} className="flex-shrink-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg lg:text-2xl font-bold truncate">
                  {format(currentDate, 'EEEE, MMMM d, yyyy')} - Time Log View
                </h1>
                <Button variant="outline" size="icon" onClick={() => navigateDate('next')} className="flex-shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 24-Hour Calendar Content */}
          <div className="flex-1 overflow-auto">
            {/* Mobile View */}
            <div className="block lg:hidden">
              <div className="space-y-2 p-3">
                {calendarSlots.map((slot) => (
                  slot.entries.length > 0 && (
                    <div key={slot.hour}>
                      <div className="text-sm font-medium text-gray-700 mb-2 sticky top-0 bg-white py-1">
                        {formatHour(slot.hour)}
                      </div>
                      <div className="space-y-2 ml-4">
                        {slot.entries.map((entry, index) => {
                          const sprintName = entry.sprints && entry.sprints.length > 0 
                            ? entry.sprints[0].title 
                            : 'No Sprint';
                          
                          return (
                            <Card 
                              key={`${entry.id}-${index}`} 
                              className="border-l-4 border-l-green-500 bg-green-50"
                            >
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="text-sm font-medium text-green-800 break-words">
                                    {entry.comment || 'No Comment'} || {entry.tasks.name} || {sprintName} || {entry.tasks.assignee?.name || 'Unassigned'}
                                  </div>
                                  <div className="text-xs text-gray-600 flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    {formatTimeRange(entry.start_time, entry.end_time)}
                                  </div>
                                  <div className="text-xs text-gray-500 break-words">
                                    {entry.tasks.projects.name} • {entry.tasks.projects.clients?.name} • Logged by: {entry.employee.name}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )
                ))}
                {calendarSlots.every(slot => slot.entries.length === 0) && (
                  <div className="text-center text-gray-500 py-8">
                    No time logs for this day
                  </div>
                )}
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-1 divide-y">
                {calendarSlots.map((slot) => (
                  <div key={slot.hour} className="min-h-16 flex border-b">
                    {/* Time Label */}
                    <div className="w-20 flex-shrink-0 bg-gray-50 border-r p-3 text-sm font-medium text-gray-700">
                      {formatHour(slot.hour)}
                    </div>
                    
                    {/* Time Slot Content */}
                    <div className="flex-1 p-2 relative">
                      {slot.entries.length > 0 ? (
                        <div className="space-y-1">
                          {slot.entries.map((entry, index) => {
                            const sprintName = entry.sprints && entry.sprints.length > 0 
                              ? entry.sprints[0].title 
                              : 'No Sprint';
                            
                            return (
                              <Card 
                                key={`${entry.id}-${index}`} 
                                className="border-l-4 border-l-green-500 bg-green-50"
                              >
                                <CardContent className="p-3">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium text-green-800">
                                      {entry.comment || 'No Comment'} || {entry.tasks.name} || {sprintName} || {entry.tasks.assignee?.name || 'Unassigned'}
                                    </div>
                                    <div className="text-xs text-gray-600 flex items-center gap-2">
                                      <Clock className="h-3 w-3" />
                                      {formatTimeRange(entry.start_time, entry.end_time)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {entry.tasks.projects.name} • {entry.tasks.projects.clients?.name} • Logged by: {entry.employee.name}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                          No logs
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Navigation>
  );
};

export default LogCal;
