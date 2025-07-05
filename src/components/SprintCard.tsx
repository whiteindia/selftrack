import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { Edit, Trash2, Calendar, Clock, CheckCircle, Building2, User, X, AlertTriangle, TrendingUp, Plus, Pin, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { useSprintPinFavorite } from '@/hooks/useSprintPinFavorite';

interface Task {
  id: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  project_id: string;
  assignee_id: string | null;
  deadline: string | null;
  hours: number;
  estimated_duration: number | null;
  scheduled_time?: string | null;
  date?: string | null;
  projects?: {
    name: string;
    service: string;
    clients: {
      name: string;
    };
  };
  employees?: {
    name: string;
  };
}

interface SprintWithTasks {
  id: string;
  title: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  sprint_leader_id: string | null;
  created_at: string;
  updated_at: string;
  completion_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  slot_date?: string | null;
  estimated_hours?: number | null;
  is_pinned?: boolean;
  is_favorite?: boolean;
  sprint_leader?: {
    name: string;
  };
  tasks: Task[];
  isOverdue: boolean;
  overdueDays: number;
  totalEstimatedDuration: number;
  totalLoggedDuration: number;
}

interface SprintCardProps {
  sprint: SprintWithTasks;
  canUpdate: boolean;
  canDelete: boolean;
  onTaskStatusChange: (taskId: string, newStatus: 'Not Started' | 'In Progress' | 'Completed', sprintId: string) => void;
  onRemoveTask?: (taskId: string, sprintId: string) => void;
  onAddTasks?: (sprintId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
}

const SprintCard: React.FC<SprintCardProps> = ({
  sprint,
  canUpdate,
  canDelete,
  onTaskStatusChange,
  onRemoveTask,
  onAddTasks,
  onEdit,
  onDelete,
  getStatusIcon,
  getStatusColor
}) => {
  const { togglePin, toggleFavorite, isPinning, isFavoriting } = useSprintPinFavorite();
  
  // Debug logging
  useEffect(() => {
    console.log('SprintCard render - canUpdate:', canUpdate, 'onAddTasks:', !!onAddTasks, 'sprintId:', sprint.id);
  }, [canUpdate, onAddTasks, sprint.id]);
  const completedTasks = sprint.tasks.filter(task => task.status === 'Completed').length;
  const totalTasks = sprint.tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Get unique service and client combinations from tasks
  const serviceClientCombos = sprint.tasks.reduce((acc, task) => {
    if (task.projects) {
      const key = `${task.projects.service}-${task.projects.clients.name}`;
      if (!acc.includes(key)) {
        acc.push(key);
      }
    }
    return acc;
  }, [] as string[]);

  // Get the primary service and client for heading
  const primaryInfo = sprint.tasks.length > 0 && sprint.tasks[0].projects 
    ? { service: sprint.tasks[0].projects.service, client: sprint.tasks[0].projects.clients.name }
    : null;

  // Calculate priority indicators for sorting
  const today = new Date();
  const deadline = new Date(sprint.deadline);
  const daysUntilDeadline = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isRecentlyUpdated = (today.getTime() - new Date(sprint.updated_at).getTime()) < (7 * 24 * 60 * 60 * 1000);
  const isNearDeadline = daysUntilDeadline >= 0 && daysUntilDeadline <= 7;
  
  // Determine priority reason
  const getPriorityReason = () => {
    // Check if any task has actual time slots (scheduled_time or date)
    const hasTimeSlots = sprint.tasks.some(task => task.scheduled_time || task.date);
    if (hasTimeSlots) {
      return { text: 'Has Time Slots', icon: <Clock className="h-3 w-3" />, color: 'bg-green-50 text-green-700 border-green-200' };
    }
    
    // Check if any task has deadlines (but no time slots)
    const hasDeadlines = sprint.tasks.some(task => task.deadline);
    if (hasDeadlines) {
      return { text: 'Has Deadlines', icon: <Calendar className="h-3 w-3" />, color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    
    if (isRecentlyUpdated) {
      return { text: 'Recently Updated', icon: <TrendingUp className="h-3 w-3" />, color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (sprint.isOverdue) {
      return { text: `Overdue by ${sprint.overdueDays} days`, icon: <AlertTriangle className="h-3 w-3" />, color: 'bg-red-50 text-red-700 border-red-200' };
    }
    if (isNearDeadline) {
      return { text: `Due in ${daysUntilDeadline} days`, icon: <Clock className="h-3 w-3" />, color: 'bg-orange-50 text-orange-700 border-orange-200' };
    }
    return null;
  };

  const priorityReason = getPriorityReason();

  const [isTasksCollapsed, setIsTasksCollapsed] = useState(true);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg lg:text-xl break-words">{sprint.title}</CardTitle>
                {/* Sprint Time Slot Badge */}
                {(sprint.start_time || sprint.slot_date) && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {sprint.slot_date && format(new Date(sprint.slot_date), "MMM dd")}
                      {sprint.start_time && sprint.end_time && (
                        <>
                          {sprint.slot_date && ' '}
                          {sprint.start_time.substring(0, 5)} - {sprint.end_time.substring(0, 5)}
                        </>
                      )}
                      {sprint.estimated_hours && (
                        <>
                          {sprint.slot_date || (sprint.start_time && sprint.end_time) ? ' ' : ''}
                          ({sprint.estimated_hours}h)
                        </>
                      )}
                    </div>
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getStatusColor(sprint.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(sprint.status)}
                    {sprint.status}
                  </div>
                </Badge>
                {priorityReason && (
                  <Badge variant="outline" className={`text-xs ${priorityReason.color}`}>
                    <div className="flex items-center gap-1">
                      {priorityReason.icon}
                      {priorityReason.text}
                    </div>
                  </Badge>
                )}
              </div>
            </div>
            {primaryInfo && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Service: {primaryInfo.service}
                </Badge>
              </div>
            )}
            <div className="text-sm text-gray-500 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Deadline: {format(new Date(sprint.deadline), "PPP")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Est: {sprint.totalEstimatedDuration}h, Logged: {sprint.totalLoggedDuration}h</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Progress: {completedTasks}/{totalTasks} tasks</span>
                </div>
                {sprint.sprint_leader && (
                  <div className="truncate">
                    Lead: {sprint.sprint_leader.name}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {/* Pin and Favorite buttons */}
            <Button
              variant={sprint.is_pinned ? "default" : "outline"}
              size="sm"
              onClick={() => togglePin({ sprintId: sprint.id, isPinned: sprint.is_pinned || false })}
              disabled={isPinning}
              className={`p-2 ${sprint.is_pinned ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
              title={sprint.is_pinned ? 'Unpin sprint' : 'Pin sprint'}
            >
              <Pin className={`h-4 w-4 ${sprint.is_pinned ? 'fill-current' : ''}`} />
            </Button>
            
            <Button
              variant={sprint.is_favorite ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFavorite({ sprintId: sprint.id, isFavorite: sprint.is_favorite || false })}
              disabled={isFavoriting}
              className={`p-2 ${sprint.is_favorite ? 'bg-yellow-600 text-white hover:bg-yellow-700' : ''}`}
              title={sprint.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`h-4 w-4 ${sprint.is_favorite ? 'fill-current' : ''}`} />
            </Button>

            {canUpdate && onAddTasks && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('+ button clicked for sprint:', sprint.id);
                  onAddTasks(sprint.id);
                }}
                className="p-2"
                title="Add tasks to sprint"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {canUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="p-2"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="p-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={!isTasksCollapsed} onOpenChange={(open) => setIsTasksCollapsed(!open)}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-between p-2 hover:bg-gray-50"
            >
              <span className="text-sm font-medium">
                Tasks ({sprint.tasks.length})
              </span>
              {isTasksCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            {sprint.tasks.length > 0 ? (
              <div className="grid gap-2">
                {sprint.tasks.map((task) => (
                  <div key={task.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-2 border rounded-md gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium break-words mb-1">{task.name}</div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {task.projects && (
                          <>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                              {task.projects.name}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {task.projects.clients.name}
                            </Badge>
                          </>
                        )}
                      </div>
                      {task.employees && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Assignee: {task.employees.name}</span>
                        </div>
                      )}
                      {/* Task Time Slot Information */}
                      {(task.scheduled_time || task.date) && (
                        <div className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {task.date && format(new Date(task.date), "MMM dd")}
                            {task.scheduled_time && (
                              <>
                                {task.date && ' '}
                                {task.scheduled_time.includes(' ') ? task.scheduled_time.split(' ')[1].substring(0, 5) : task.scheduled_time}
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 w-full lg:w-auto">
                      {canUpdate ? (
                        <Select 
                          value={task.status} 
                          onValueChange={(value: 'Not Started' | 'In Progress' | 'Completed') => 
                            onTaskStatusChange(task.id, value, sprint.id)
                          }
                        >
                          <SelectTrigger className="w-full lg:w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      )}
                      {onRemoveTask && canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          onClick={() => onRemoveTask(task.id, sprint.id)}
                          title="Remove task from sprint"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No tasks assigned to this sprint yet.
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default SprintCard;
