
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Edit, Trash2, Calendar, Clock, CheckCircle } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  project_id: string;
  assignee_id: string | null;
  deadline: string | null;
  hours: number;
  estimated_duration: number | null;
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
  onEdit,
  onDelete,
  getStatusIcon,
  getStatusColor
}) => {
  const completedTasks = sprint.tasks.filter(task => task.status === 'Completed').length;
  const totalTasks = sprint.tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <CardTitle className="text-lg lg:text-xl break-words">{sprint.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getStatusColor(sprint.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(sprint.status)}
                    {sprint.status}
                  </div>
                </Badge>
                {sprint.isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue by {sprint.overdueDays} days
                  </Badge>
                )}
              </div>
            </div>
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
        {sprint.tasks.length > 0 ? (
          <div className="grid gap-2">
            {sprint.tasks.map((task) => (
              <div key={task.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-2 border rounded-md gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium break-words">{task.name}</div>
                  <div className="text-sm text-gray-500 break-words">
                    {task.projects?.clients.name} - {task.projects?.name}
                    {task.employees && <span> • Assignee: {task.employees.name}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0 w-full lg:w-auto">
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No tasks assigned to this sprint yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SprintCard;
