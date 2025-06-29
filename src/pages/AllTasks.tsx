import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, UserIcon, BuildingIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import Navigation from '@/components/Navigation';
import TaskEditDialog from '@/components/TaskEditDialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';

interface Task {
  id: string;
  name: string;
  status: string;
  deadline?: string;
  date: string;
  reminder_datetime?: string;
  slot_start_datetime?: string;
  slot_end_datetime?: string;
  assignee?: { name: string };
  assigner?: { name: string };
  projects: {
    name: string;
    clients: { name: string };
  };
}

const AllTasks = () => {
  const { user } = useAuth();
  const { hasPageAccess } = usePrivileges();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<'reminder' | 'slot'>('reminder');

  // Fetch all tasks
  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:employees!tasks_assignee_id_fkey(name),
          assigner:employees!tasks_assigner_id_fkey(name),
          projects!inner(
            name,
            clients!inner(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Extract unique values for filters
  const uniqueStatuses = ['Not Started', 'In Progress', 'On Hold', 'On-Head', 'Targeted', 'Imp', 'Completed'];
  const uniqueClients = [...new Set(tasks.map(task => task.projects?.clients?.name).filter(Boolean))];
  const uniqueProjects = clientFilter === 'all' 
    ? [...new Set(tasks.map(task => task.projects?.name).filter(Boolean))]
    : [...new Set(tasks.filter(task => task.projects?.clients?.name === clientFilter).map(task => task.projects?.name).filter(Boolean))];
  const uniqueAssignees = [...new Set(tasks.map(task => task.assignee?.name).filter(Boolean))];

  // Filter tasks based on all criteria
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesClient = clientFilter === 'all' || task.projects?.clients?.name === clientFilter;
      const matchesProject = projectFilter === 'all' || task.projects?.name === projectFilter;
      const matchesAssignee = assigneeFilter === 'all' || task.assignee?.name === assigneeFilter;
      const matchesSearch = searchQuery === '' || 
        task.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesClient && matchesProject && matchesAssignee && matchesSearch;
    });
  }, [tasks, statusFilter, clientFilter, projectFilter, assigneeFilter, searchQuery]);

  // Reset project filter when client filter changes
  React.useEffect(() => {
    if (clientFilter !== 'all') {
      setProjectFilter('all');
    }
  }, [clientFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'On-Head': return 'bg-purple-100 text-purple-800';
      case 'Targeted': return 'bg-orange-100 text-orange-800';
      case 'Imp': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditTask = (task: Task, mode: 'reminder' | 'slot' = 'reminder') => {
    setEditingTask(task);
    setEditMode(mode);
    setIsEditDialogOpen(true);
  };

  const handleTaskUpdate = () => {
    refetch();
    setIsEditDialogOpen(false);
    setEditingTask(null);
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading tasks...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">All Tasks</h1>

        {/* Collapsible Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-between w-full p-0 h-auto">
                  <CardTitle className="text-lg font-medium">Filters</CardTitle>
                  {isFiltersOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {/* Status Filter */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Status</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={statusFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setStatusFilter('all')}
                    >
                      All Statuses
                    </Button>
                    {uniqueStatuses.map(status => (
                      <Button
                        key={status}
                        size="sm"
                        variant={statusFilter === status ? 'default' : 'outline'}
                        onClick={() => setStatusFilter(status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Client Filter */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Client</h3>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    <Button
                      size="sm"
                      variant={clientFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setClientFilter('all')}
                    >
                      All Clients
                    </Button>
                    {uniqueClients.map(client => (
                      <Button
                        key={client}
                        size="sm"
                        variant={clientFilter === client ? 'default' : 'outline'}
                        onClick={() => setClientFilter(client)}
                      >
                        {client}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Project Filter */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Project</h3>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    <Button
                      size="sm"
                      variant={projectFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setProjectFilter('all')}
                    >
                      All Projects
                    </Button>
                    {uniqueProjects.map(project => (
                      <Button
                        key={project}
                        size="sm"
                        variant={projectFilter === project ? 'default' : 'outline'}
                        onClick={() => setProjectFilter(project)}
                      >
                        {project}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Assignee Filter */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Assignee</h3>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    <Button
                      size="sm"
                      variant={assigneeFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setAssigneeFilter('all')}
                    >
                      All Assignees
                    </Button>
                    {uniqueAssignees.map(assignee => (
                      <Button
                        key={assignee}
                        size="sm"
                        variant={assigneeFilter === assignee ? 'default' : 'outline'}
                        onClick={() => setAssigneeFilter(assignee)}
                      >
                        {assignee}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Search */}
        <div className="max-w-md">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Results Summary */}
        <div className="text-sm text-gray-600">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>

        {/* Tasks Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No tasks found matching your filters
            </div>
          ) : (
            filteredTasks.map((task) => (
              <Card 
                key={task.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleEditTask(task)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Task Name */}
                  <h3 className="font-medium text-sm break-words line-clamp-2">{task.name}</h3>

                  {/* Status Badge */}
                  <Badge className={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>

                  {/* Project and Client Info */}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <BuildingIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {task.projects?.clients?.name} - {task.projects?.name}
                    </span>
                  </div>

                  {/* Assignee Info */}
                  {task.assignee?.name && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <UserIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{task.assignee.name}</span>
                    </div>
                  )}

                  {/* Date and Deadline */}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                    <span>
                      {task.date && format(new Date(task.date), 'MMM dd, yyyy')}
                      {task.deadline && (
                        <span className="text-red-600 ml-2">
                          Due: {format(new Date(task.deadline), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Task Dialog */}
        {editingTask && (
          <TaskEditDialog
            task={editingTask}
            isOpen={isEditDialogOpen}
            onClose={() => {
              setIsEditDialogOpen(false);
              setEditingTask(null);
            }}
            mode={editMode}
          />
        )}
      </div>
    </Navigation>
  );
};

export default AllTasks;
