
import React, { useState, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartGantt, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, isWithinInterval } from 'date-fns';

interface Project {
  id: string;
  name: string;
  service: string;
  client_id: string;
  start_date: string | null;
  deadline: string | null;
  clients: {
    name: string;
  };
}

interface Task {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
  created_at: string;
  project_id: string;
}

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: string;
  created_at: string;
  tasks: Task[];
}

interface GanttItem {
  id: string;
  type: 'sprint' | 'task';
  name: string;
  client: string;
  project: string;
  service: string;
  startDate: string;
  endDate: string;
  status: string;
  parentId?: string;
  level: number;
}

const GanttView = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [serviceFilter, setServiceFilter] = useState<string>('all');
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

  // Fetch projects with clients
  const { data: projects = [] } = useQuery({
    queryKey: ['gantt-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          service,
          client_id,
          start_date,
          deadline,
          clients (
            name
          )
        `)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch sprints with their tasks
  const { data: sprintsData = [], isLoading } = useQuery({
    queryKey: ['gantt-sprints', selectedMonth],
    queryFn: async () => {
      const startDate = startOfMonth(selectedMonth).toISOString();
      const endDate = endOfMonth(selectedMonth).toISOString();

      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select('*')
        .or(`deadline.gte.${startDate},created_at.lte.${endDate}`)
        .order('deadline', { ascending: true });

      if (sprintsError) throw sprintsError;

      const sprintsWithTasks: Sprint[] = [];
      
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
              project_id
            )
          `)
          .eq('sprint_id', sprint.id);

        const tasks: Task[] = (sprintTasks || [])
          .filter(st => st.tasks)
          .map(st => st.tasks as Task);

        sprintsWithTasks.push({
          ...sprint,
          tasks
        });
      }

      return sprintsWithTasks;
    }
  });

  // Generate gantt items
  const ganttItems = useMemo(() => {
    const items: GanttItem[] = [];
    
    sprintsData.forEach(sprint => {
      // Find project info for this sprint's tasks
      const firstTask = sprint.tasks[0];
      const project = projects.find(p => p.id === firstTask?.project_id);
      
      if (!project) return;
      
      // Filter by service if selected
      if (serviceFilter !== 'all' && project.service !== serviceFilter) return;

      // Add sprint item
      items.push({
        id: sprint.id,
        type: 'sprint',
        name: sprint.title,
        client: project.clients?.name || 'Unknown Client',
        project: project.name,
        service: project.service,
        startDate: sprint.created_at,
        endDate: sprint.deadline,
        status: sprint.status,
        level: 0
      });

      // Add task items if sprint is expanded
      if (expandedSprints.has(sprint.id)) {
        sprint.tasks.forEach(task => {
          items.push({
            id: task.id,
            type: 'task',
            name: task.name,
            client: project.clients?.name || 'Unknown Client',
            project: project.name,
            service: project.service,
            startDate: task.created_at,
            endDate: task.deadline || task.created_at,
            status: task.status,
            parentId: sprint.id,
            level: 1
          });
        });
      }
    });

    return items;
  }, [sprintsData, projects, serviceFilter, expandedSprints]);

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

    return { 
      left: `${left}%`, 
      width: `${Math.max(width, 2)}%`,
      visible: isWithinInterval(itemStart, { start: monthStart, end: monthEnd }) || 
               isWithinInterval(itemEnd, { start: monthStart, end: monthEnd })
    };
  };

  const getStatusColor = (status: string, type: 'sprint' | 'task') => {
    const baseColors = {
      'Completed': type === 'sprint' ? 'bg-green-600' : 'bg-green-400',
      'In Progress': type === 'sprint' ? 'bg-blue-600' : 'bg-blue-400',
      'Not Started': type === 'sprint' ? 'bg-gray-600' : 'bg-gray-400',
    };
    return baseColors[status as keyof typeof baseColors] || (type === 'sprint' ? 'bg-gray-600' : 'bg-gray-400');
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
            <h1 className="text-3xl font-bold">Gantt Timeline View</h1>
            <p className="text-gray-600">Sprint and task timeline visualization</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline Filters</CardTitle>
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
            </div>
          </CardContent>
        </Card>

        {/* Gantt Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline - {format(selectedMonth, 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {/* Header */}
            <div className="min-w-[1200px]">
              <div className="grid grid-cols-[200px_200px_200px_1fr] gap-2 border-b-2 border-gray-200 pb-2 mb-4">
                <div className="font-semibold text-sm">Client</div>
                <div className="font-semibold text-sm">Project</div>
                <div className="font-semibold text-sm">Sprint/Task</div>
                <div className="relative">
                  <div className="grid gap-px text-xs font-medium" style={{ gridTemplateColumns: `repeat(${monthDays.length}, 1fr)` }}>
                    {monthDays.map((day, index) => (
                      <div key={index} className="text-center py-1 border-l border-gray-200 min-w-[30px]">
                        {format(day, 'd')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gantt Rows */}
              <div className="space-y-1">
                {ganttItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="grid grid-cols-[200px_200px_200px_1fr] gap-2 min-h-[40px] items-center border-b border-gray-100">
                    <div className="text-sm truncate">{item.client}</div>
                    <div className="text-sm truncate">{item.project}</div>
                    <div className={`flex items-center gap-2 text-sm ${item.level > 0 ? 'pl-6' : ''}`}>
                      {item.type === 'sprint' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => toggleSprintExpansion(item.id)}
                        >
                          {expandedSprints.has(item.id) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <span className="truncate font-medium">{item.name}</span>
                    </div>
                    <div className="relative h-8 flex items-center">
                      {(() => {
                        const position = getTimelinePosition(item.startDate, item.endDate);
                        if (!position.visible) return null;
                        
                        return (
                          <div
                            className={`absolute h-6 rounded-md ${getStatusColor(item.status, item.type)} opacity-80 flex items-center px-2`}
                            style={{ left: position.left, width: position.width }}
                          >
                            <span className="text-white text-xs truncate font-medium">
                              {item.name}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              {ganttItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No sprints or tasks found for the selected month and filters.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span className="text-sm">Completed (Sprint)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span className="text-sm">Completed (Task)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span className="text-sm">In Progress (Sprint)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-400 rounded"></div>
                <span className="text-sm">In Progress (Task)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-600 rounded"></div>
                <span className="text-sm">Not Started (Sprint)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span className="text-sm">Not Started (Task)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default GanttView;
