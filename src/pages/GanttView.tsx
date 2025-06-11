
import React, { useState, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartGantt, ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, addDays } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: string;
  created_at: string;
  sprint_leader?: {
    name: string;
  };
}

interface Task {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
  created_at: string;
  projects: {
    name: string;
    service: string;
    clients: {
      name: string;
    };
  };
}

interface SprintWithTasks extends Sprint {
  tasks: Task[];
  client_name?: string;
  project_name?: string;
  service_type?: string;
}

const GanttView = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());

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

  // Fetch sprints with their tasks
  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ['gantt-sprints', selectedMonth],
    queryFn: async () => {
      const startDate = startOfMonth(selectedMonth).toISOString();
      const endDate = endOfMonth(selectedMonth).toISOString();

      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select(`
          *,
          sprint_leader:employees(name)
        `)
        .or(`deadline.gte.${startDate},created_at.lte.${endDate}`)
        .order('deadline', { ascending: true });

      if (sprintsError) throw sprintsError;

      const sprintsWithTasks: SprintWithTasks[] = [];
      
      for (const sprint of sprintsData || []) {
        const { data: sprintTasks } = await supabase
          .from('sprint_tasks')
          .select(`
            task_id,
            tasks (
              id,
              name,
              status,
              deadline,
              created_at,
              projects (
                name,
                service,
                clients (
                  name
                )
              )
            )
          `)
          .eq('sprint_id', sprint.id);

        const tasks: Task[] = [];
        let client_name = '';
        let project_name = '';
        let service_type = '';

        for (const st of sprintTasks || []) {
          if (st.tasks) {
            const task = st.tasks as any;
            tasks.push({
              id: task.id,
              name: task.name,
              status: task.status,
              deadline: task.deadline,
              created_at: task.created_at,
              projects: task.projects
            });

            // Use the first task's project info for the sprint
            if (!client_name && task.projects) {
              client_name = task.projects.clients?.name || '';
              project_name = task.projects.name || '';
              service_type = task.projects.service || '';
            }
          }
        }

        sprintsWithTasks.push({
          ...sprint,
          tasks,
          client_name,
          project_name,
          service_type
        });
      }

      return sprintsWithTasks;
    }
  });

  // Filter sprints based on service filter
  const filteredSprints = useMemo(() => {
    if (globalServiceFilter === 'all') return sprints;
    return sprints.filter(sprint => sprint.service_type === globalServiceFilter);
  }, [sprints, globalServiceFilter]);

  // Generate calendar days for the month
  const monthDays = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  const toggleSprintExpansion = (sprintId: string) => {
    const newExpanded = new Set(expandedSprints);
    if (newExpanded.has(sprintId)) {
      newExpanded.delete(sprintId);
    } else {
      newExpanded.add(sprintId);
    }
    setExpandedSprints(newExpanded);
  };

  const getTimelinePosition = (startDate: string, endDate: string) => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const totalDays = differenceInDays(monthEnd, monthStart) + 1;

    const itemStart = new Date(startDate);
    const itemEnd = new Date(endDate);

    // Calculate position and width as percentages
    const startOffset = Math.max(0, differenceInDays(itemStart, monthStart));
    const endOffset = Math.min(totalDays, differenceInDays(itemEnd, monthStart) + 1);
    
    const left = (startOffset / totalDays) * 100;
    const width = ((endOffset - startOffset) / totalDays) * 100;

    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500';
      case 'In Progress':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading Gantt view...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <ChartGantt className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Gantt View</h1>
            <p className="text-gray-600">Project timeline and task visualization</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Month</label>
                <Select 
                  value={format(selectedMonth, 'yyyy-MM')} 
                  onValueChange={(value) => setSelectedMonth(new Date(value + '-01'))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() + i - 6);
                      return (
                        <SelectItem key={i} value={format(date, 'yyyy-MM')}>
                          {format(date, 'MMMM yyyy')}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Service Filter</label>
                <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
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
            </div>
          </CardContent>
        </Card>

        {/* Gantt Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline - {format(selectedMonth, 'MMMM yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Calendar header */}
            <div className="mb-4">
              <div className="grid grid-cols-[300px_1fr] gap-4">
                <div className="font-semibold text-sm">Sprint / Task</div>
                <div className="grid grid-cols-31 gap-px text-xs">
                  {monthDays.map((day, index) => (
                    <div key={index} className="text-center py-1 border-l border-gray-200">
                      {format(day, 'd')}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sprint rows */}
            <div className="space-y-2">
              {filteredSprints.map((sprint) => (
                <div key={sprint.id} className="border rounded-lg">
                  <Collapsible
                    open={expandedSprints.has(sprint.id)}
                    onOpenChange={() => toggleSprintExpansion(sprint.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start p-0 h-auto">
                        <div className="grid grid-cols-[300px_1fr] gap-4 w-full">
                          <div className="flex items-center gap-2 p-3 text-left">
                            {expandedSprints.has(sprint.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm">{sprint.title}</div>
                              <div className="text-xs text-gray-500">
                                {sprint.client_name} • {sprint.project_name}
                              </div>
                            </div>
                          </div>
                          <div className="relative h-8 flex items-center">
                            <div
                              className={`absolute h-6 rounded-md ${getStatusColor(sprint.status)} opacity-80`}
                              style={getTimelinePosition(sprint.created_at, sprint.deadline)}
                            >
                              <div className="h-full flex items-center justify-center text-white text-xs px-2 truncate">
                                {sprint.title}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t bg-gray-50">
                        {sprint.tasks.map((task) => (
                          <div key={task.id} className="grid grid-cols-[300px_1fr] gap-4 border-b last:border-b-0">
                            <div className="p-3 pl-8">
                              <div className="font-medium text-sm">{task.name}</div>
                              <div className="text-xs text-gray-500">
                                Status: {task.status}
                              </div>
                            </div>
                            <div className="relative h-8 flex items-center">
                              {task.deadline && (
                                <div
                                  className={`absolute h-4 rounded-sm ${getStatusColor(task.status)} opacity-60`}
                                  style={getTimelinePosition(task.created_at, task.deadline)}
                                >
                                  <div className="h-full flex items-center justify-center text-white text-xs px-1 truncate">
                                    {task.name}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>

            {filteredSprints.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No sprints found for the selected month and filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default GanttView;
