import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, UserIcon, BuildingIcon, ChevronDown, ChevronUp, Play, MessageSquare, Users, Clock, Plus, Edit } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import Navigation from '@/components/Navigation';
import TaskEditDialog from '@/components/TaskEditDialog';
import TaskCreateDialog from '@/components/TaskCreateDialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import TimeTrackerWithComment from '@/components/TimeTrackerWithComment';
import ManualTimeLog from '@/components/ManualTimeLog';
import TaskHistory from '@/components/TaskHistory';
import SubtaskDialog from '@/components/SubtaskDialog';
import { useSubtasks } from '@/hooks/useSubtasks';
import SubtaskCard from '@/components/SubtaskCard';
import { useTimeEntryCount } from '@/hooks/useTimeEntryCount';

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
  const [editMode, setEditMode] = useState<'reminder' | 'slot' | 'full'>('full');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [selectedTaskForSubtask, setSelectedTaskForSubtask] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubtaskCreateDialogOpen, setIsSubtaskCreateDialogOpen] = useState(false);
  const [selectedTaskForSubtaskCreate, setSelectedTaskForSubtaskCreate] = useState<any>(null);

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

  // Fetch employees for subtask dialog
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Process tasks to update overdue status
  const processedTasks = useMemo(() => {
    return tasks.map(task => {
      const isOverdue = task.deadline && new Date(task.deadline).getTime() < new Date().getTime();
      return {
        ...task,
        status: isOverdue && task.status !== 'Completed' ? 'Overdue' : task.status
      };
    });
  }, [tasks]);

  // Extract unique values for filters - include Overdue status
  const uniqueStatuses = ['Not Started', 'In Progress', 'On Hold', 'On-Head', 'Targeted', 'Imp', 'Completed', 'Overdue'];
  const uniqueClients = [...new Set(processedTasks.map(task => task.projects?.clients?.name).filter(Boolean))];
  const uniqueProjects = clientFilter === 'all' 
    ? [...new Set(processedTasks.map(task => task.projects?.name).filter(Boolean))]
    : [...new Set(processedTasks.filter(task => task.projects?.clients?.name === clientFilter).map(task => task.projects?.name).filter(Boolean))];
  const uniqueAssignees = [...new Set(processedTasks.map(task => task.assignee?.name).filter(Boolean))];

  // Filter tasks based on all criteria
  const filteredTasks = useMemo(() => {
    return processedTasks.filter(task => {
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesClient = clientFilter === 'all' || task.projects?.clients?.name === clientFilter;
      const matchesProject = projectFilter === 'all' || task.projects?.name === projectFilter;
      const matchesAssignee = assigneeFilter === 'all' || task.assignee?.name === assigneeFilter;
      const matchesSearch = searchQuery === '' || 
        task.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesClient && matchesProject && matchesAssignee && matchesSearch;
    });
  }, [processedTasks, statusFilter, clientFilter, projectFilter, assigneeFilter, searchQuery]);

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
      case 'Overdue': return 'bg-red-600 text-white font-bold animate-pulse';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditTask = (task: Task, mode: 'reminder' | 'slot' | 'full' = 'full') => {
    setEditingTask(task);
    setEditMode(mode);
    setIsEditDialogOpen(true);
  };

  const handleEditSubtask = (subtask: any) => {
    // Transform subtask to match task structure for the dialog
    const subtaskForEdit = {
      ...subtask,
      project_id: null, // Subtasks don't have project_id
    };
    setEditingTask(subtaskForEdit);
    setEditMode('full');
    setIsEditDialogOpen(true);
  };

  const handleTaskUpdate = () => {
    refetch();
    setIsEditDialogOpen(false);
    setEditingTask(null);
  };

  const handleTaskCreateSuccess = () => {
    refetch();
    setIsCreateDialogOpen(false);
  };

  const handleAddSubtask = (task: any) => {
    setSelectedTaskForSubtaskCreate(task);
    setIsSubtaskCreateDialogOpen(true);
  };

  const handleSubtaskCreateSuccess = () => {
    refetch();
    setIsSubtaskCreateDialogOpen(false);
    setSelectedTaskForSubtaskCreate(null);
  };

  const handleSubtaskSuccess = () => {
    refetch();
    setIsSubtaskDialogOpen(false);
    setSelectedTaskForSubtask(null);
  };

  const handleSubtaskSave = async (subtaskData: any) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .insert([subtaskData]);

      if (error) throw error;
      handleSubtaskSuccess();
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">All Tasks</h1>
          {hasPageAccess('tasks') && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          )}
        </div>

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
          Showing {filteredTasks.length} of {processedTasks.length} tasks
        </div>

        {/* Tasks Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No tasks found matching your filters
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isOverdue = task.status === 'Overdue';
              
              return (
                <TaskCardWithActions 
                  key={task.id}
                  task={task}
                  isOverdue={isOverdue}
                  getStatusColor={getStatusColor}
                  expandedTask={expandedTask}
                  setExpandedTask={setExpandedTask}
                  handleEditTask={handleEditTask}
                  handleEditSubtask={handleEditSubtask}
                  handleAddSubtask={handleAddSubtask}
                  refetch={refetch}
                />
              );
            })
          )}
        </div>

        {/* Task Create Dialog */}
        <TaskCreateDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSuccess={handleTaskCreateSuccess}
        />

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
            isSubtask={!editingTask.project_id && editingTask.task_id} // Determine if it's a subtask
          />
        )}

        {/* Subtask Create Dialog */}
        {selectedTaskForSubtaskCreate && (
          <TaskCreateDialog
            isOpen={isSubtaskCreateDialogOpen}
            onClose={() => {
              setIsSubtaskCreateDialogOpen(false);
              setSelectedTaskForSubtaskCreate(null);
            }}
            parentTaskId={selectedTaskForSubtaskCreate.id}
            onSuccess={handleSubtaskCreateSuccess}
          />
        )}

        {/* Legacy Subtask Dialog - keeping for compatibility */}
        {selectedTaskForSubtask && (
          <SubtaskDialog
            taskId={selectedTaskForSubtask.id}
            isOpen={isSubtaskDialogOpen}
            onClose={() => {
              setIsSubtaskDialogOpen(false);
              setSelectedTaskForSubtask(null);
            }}
            onSave={handleSubtaskSave}
            employees={employees}
          />
        )}
      </div>
    </Navigation>
  );
};

// Separate component for individual task cards with actions
const TaskCardWithActions = ({ 
  task, 
  isOverdue, 
  getStatusColor, 
  expandedTask, 
  setExpandedTask, 
  handleEditTask,
  handleEditSubtask,
  handleAddSubtask, 
  refetch 
}: any) => {
  const { subtasks, updateSubtaskMutation, deleteSubtaskMutation } = useSubtasks(task.id);
  const { data: timeEntryCount = 0 } = useTimeEntryCount(task.id);

  const handleSubtaskStatusChange = (subtaskId: string, status: string) => {
    updateSubtaskMutation.mutate({ 
      id: subtaskId, 
      updates: { 
        status,
        completion_date: status === 'Completed' ? new Date().toISOString() : null
      }
    });
  };

  const handleSubtaskDelete = (subtaskId: string) => {
    if (confirm('Are you sure you want to delete this subtask?')) {
      deleteSubtaskMutation.mutate(subtaskId);
    }
  };

  return (
    <Card 
      className={`hover:shadow-md transition-shadow cursor-pointer ${
        isOverdue 
          ? 'border-l-4 border-l-red-500 bg-red-50 ring-2 ring-red-200' 
          : 'border-l-4 border-l-blue-500'
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Task Name - Improved mobile wrapping */}
        <h3 
          className={`font-medium text-sm break-words overflow-wrap-anywhere leading-relaxed max-w-full ${
            isOverdue ? 'text-red-900' : ''
          }`}
          onClick={() => handleEditTask(task)}
        >
          {task.name}
        </h3>

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
              <span className={`ml-2 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                Due: {format(new Date(task.deadline), 'MMM dd, yyyy')}
              </span>
            )}
          </span>
        </div>

        {/* Action Buttons - Compact with icons only */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTask(task);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <TimeTrackerWithComment 
            task={{ id: task.id, name: task.name }}
            onSuccess={refetch}
          />
          <ManualTimeLog 
            taskId={task.id}
            onSuccess={refetch}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAddSubtask(task);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {subtasks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedTask(expandedTask === task.id ? null : task.id);
              }}
            >
              <Users className="h-4 w-4" />
              <span className="ml-1 text-xs">({subtasks.length})</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedTask(expandedTask === task.id ? null : task.id);
            }}
          >
            <MessageSquare className="h-4 w-4" />
            {timeEntryCount > 0 && (
              <span className="ml-1 text-xs">({timeEntryCount})</span>
            )}
          </Button>
        </div>

        {/* Expanded Section */}
        {expandedTask === task.id && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <TaskHistory taskId={task.id} onUpdate={refetch} />
            
            {/* Subtasks Section */}
            {subtasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Subtasks:</h4>
                {subtasks.map((subtask) => (
                  <SubtaskCard
                    key={subtask.id}
                    subtask={subtask}
                    onEdit={handleEditSubtask}
                    onDelete={handleSubtaskDelete}
                    onStatusChange={handleSubtaskStatusChange}
                    onTimeUpdate={refetch}
                    canUpdate={true}
                    canDelete={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AllTasks;
