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
  entry_type: string;
  task_name: string;
  project_name: string;
  project_service: string;
  client_name: string;
  assignee_name: string | null;
  assigner_name: string | null;
  employee_name: string;
  sprint_title: string | null;
}

interface CalendarSlot {
  hour: number;
  entries: TimeEntry[];
  spanningEntries: Array<{
    entry: TimeEntry;
    position: 'start' | 'middle' | 'end';
    totalHours: number;
  }>;
}

const LogCal = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
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

  // Fetch time entries with related data for the selected date
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['log-time-entries', currentDate],
    queryFn: async () => {
      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);

      // First get all time entries for the day
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
          entry_type,
          employees!employee_id (
            name
          )
        `)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .not('end_time', 'is', null)
        .order('start_time', { ascending: true });

      if (entriesError) throw entriesError;

      // Process each entry to get task/subtask details
      const enrichedEntries: TimeEntry[] = [];
      
      for (const entry of entriesData || []) {
        let taskDetails = null;
        let sprintTitle = null;

        if (entry.entry_type === 'task') {
          // Get task details
          const { data: taskData } = await supabase
            .from('tasks')
            .select(`
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
            `)
            .eq('id', entry.task_id)
            .single();

          if (taskData) {
            taskDetails = taskData;
            
            // Get sprint info for task
            const { data: sprintTasks } = await supabase
              .from('sprint_tasks')
              .select(`
                sprints (
                  title
                )
              `)
              .eq('task_id', entry.task_id);

            if (sprintTasks && sprintTasks.length > 0) {
              sprintTitle = sprintTasks[0].sprints?.title || null;
            }
          }
        } else if (entry.entry_type === 'subtask') {
          // Get subtask details
          const { data: subtaskData } = await supabase
            .from('subtasks')
            .select(`
              id,
              name,
              assignee_id,
              assigner_id,
              task_id,
              tasks!inner (
                project_id,
                projects (
                  name,
                  service,
                  client_id,
                  clients (
                    name
                  )
                )
              ),
              assignee:employees!assignee_id (
                name
              ),
              assigner:employees!assigner_id (
                name
              )
            `)
            .eq('id', entry.task_id)
            .single();

          if (subtaskData) {
            taskDetails = {
              id: subtaskData.id,
              name: subtaskData.name,
              project_id: subtaskData.tasks?.project_id,
              assignee_id: subtaskData.assignee_id,
              assigner_id: subtaskData.assigner_id,
              projects: subtaskData.tasks?.projects,
              assignee: subtaskData.assignee,
              assigner: subtaskData.assigner
            };

            // Get sprint info for the parent task
            const { data: sprintTasks } = await supabase
              .from('sprint_tasks')
              .select(`
                sprints (
                  title
                )
              `)
              .eq('task_id', subtaskData.task_id);

            if (sprintTasks && sprintTasks.length > 0) {
              sprintTitle = sprintTasks[0].sprints?.title || null;
            }
          }
        }

        if (taskDetails) {
          enrichedEntries.push({
            id: entry.id,
            task_id: entry.task_id,
            employee_id: entry.employee_id,
            start_time: entry.start_time,
            end_time: entry.end_time,
            duration_minutes: entry.duration_minutes,
            comment: entry.comment,
            entry_type: entry.entry_type,
            task_name: taskDetails.name,
            project_name: taskDetails.projects?.name || 'Unknown Project',
            project_service: taskDetails.projects?.service || 'Unknown Service',
            client_name: taskDetails.projects?.clients?.name || 'Unknown Client',
            assignee_name: taskDetails.assignee?.name || null,
            assigner_name: taskDetails.assigner?.name || null,
            employee_name: entry.employees?.name || 'Unknown Employee',
            sprint_title: sprintTitle
          });
        }
      }

      return enrichedEntries;
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
      // Apply filters (removed assignee and assigner filters)
      if (serviceFilter !== 'all' && entry.project_service !== serviceFilter) return false;
      if (clientFilter !== 'all' && entry.client_name !== clientFilter) return false;
      if (projectFilter !== 'all' && entry.project_name !== projectFilter) return false;

      return true;
    });
  }, [timeEntries, serviceFilter, clientFilter, projectFilter]);

  // Generate 24-hour calendar slots with spanning entries
  const calendarSlots = useMemo(() => {
    const slots: CalendarSlot[] = [];
    
    // Initialize all slots
    for (let hour = 0; hour < 24; hour++) {
      slots.push({ 
        hour, 
        entries: [], 
        spanningEntries: [] 
      });
    }

    // Process each time entry to handle spanning
    filteredTimeEntries.forEach(entry => {
      if (!entry.end_time) return;

      const entryStart = parseISO(entry.start_time);
      const entryEnd = parseISO(entry.end_time);
      const startHour = entryStart.getHours();
      const endHour = entryEnd.getHours();
      const durationHours = Math.ceil((entryEnd.getTime() - entryStart.getTime()) / (1000 * 60 * 60));

      // If the task spans multiple hours
      if (durationHours > 1 || startHour !== endHour) {
        for (let hour = startHour; hour <= endHour && hour < 24; hour++) {
          let position: 'start' | 'middle' | 'end' = 'middle';
          
          if (hour === startHour) position = 'start';
          else if (hour === endHour) position = 'end';

          slots[hour].spanningEntries.push({
            entry,
            position,
            totalHours: durationHours
          });
        }
      } else {
        // Single hour entry - add to regular entries
        slots[startHour].entries.push(entry);
      }
    });
    
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

  const renderTimeEntry = (entry: TimeEntry, isSpanning = false, position?: 'start' | 'middle' | 'end', totalHours?: number) => {
    const baseClasses = "border-l-4 border-l-green-500 bg-green-50";
    const spanningClasses = isSpanning ? (
      position === 'start' ? 'rounded-t-md rounded-b-none border-b-0' :
      position === 'end' ? 'rounded-b-md rounded-t-none border-t-0' :
      'rounded-none border-t-0 border-b-0'
    ) : '';

    return (
      <Card className={`${baseClasses} ${spanningClasses}`}>
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="text-sm font-medium text-green-800 break-words">
              {entry.comment || 'No Comment'} || {entry.task_name} || {entry.sprint_title || 'No Sprint'} || {entry.assignee_name || 'Unassigned'}
              {isSpanning && position === 'start' && totalHours && (
                <span className="ml-2 text-xs bg-green-200 px-2 py-1 rounded">
                  {totalHours}h total
                </span>
              )}
            </div>
            {position !== 'middle' && (
              <>
                <div className="text-xs text-gray-600 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {formatTimeRange(entry.start_time, entry.end_time)}
                </div>
                <div className="text-xs text-gray-500 break-words">
                  {entry.project_name} • {entry.client_name} • Logged by: {entry.employee_name}
                </div>
              </>
            )}
            {position === 'middle' && (
              <div className="text-xs text-gray-400 italic text-center">
                — continues —
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
        <div className="w-full lg:w-80 bg-gray-50 border-b lg:border-r lg:border-b-0 p-1 lg:p-6 overflow-y-auto">
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
                    <SelectItem key={client.id} value={client.name}>
                      {client.name}
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
                      projectFilter === project.name ? 'bg-blue-50 text-blue-707' : ''
                    }`}
                    onClick={() => setProjectFilter(project.name)}
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
          <div className="border-b p-1 lg:p-4 bg-white">
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
                  (slot.entries.length > 0 || slot.spanningEntries.length > 0) && (
                    <div key={slot.hour}>
                      <div className="text-sm font-medium text-gray-700 mb-2 sticky top-0 bg-white py-1">
                        {formatHour(slot.hour)}
                      </div>
                      <div className="space-y-1 ml-4">
                        {/* Regular entries */}
                        {slot.entries.map((entry, index) => (
                          <div key={`regular-${entry.id}-${index}`}>
                            {renderTimeEntry(entry)}
                          </div>
                        ))}
                        {/* Spanning entries */}
                        {slot.spanningEntries.map((spanEntry, index) => (
                          <div key={`span-${spanEntry.entry.id}-${index}`}>
                            {renderTimeEntry(spanEntry.entry, true, spanEntry.position, spanEntry.totalHours)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
                {calendarSlots.every(slot => slot.entries.length === 0 && slot.spanningEntries.length === 0) && (
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
                      {(slot.entries.length > 0 || slot.spanningEntries.length > 0) ? (
                        <div className="space-y-1">
                          {/* Regular entries */}
                          {slot.entries.map((entry, index) => (
                            <div key={`regular-${entry.id}-${index}`}>
                              {renderTimeEntry(entry)}
                            </div>
                          ))}
                          {/* Spanning entries */}
                          {slot.spanningEntries.map((spanEntry, index) => (
                            <div key={`span-${spanEntry.entry.id}-${index}`}>
                              {renderTimeEntry(spanEntry.entry, true, spanEntry.position, spanEntry.totalHours)}
                            </div>
                          ))}
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
