
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, Clock, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  id: string;
  name: string;
  status: string;
  deadline?: string;
  estimated_duration?: number;
  hours: number;
  assignee?: {
    name: string;
  };
  assigner?: {
    name: string;
  };
  project_name?: string;
  project_id?: string;
}

interface TaskTableProps {
  tasks: Task[];
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onTaskStatusChange?: (taskId: string, newStatus: string) => void;
  onAddTask?: () => void;
}

const TaskTable: React.FC<TaskTableProps> = ({ 
  tasks, 
  canCreate = false,
  canUpdate = false,
  canDelete = false,
  onTaskStatusChange,
  onAddTask
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'On-Head':
        return 'bg-purple-100 text-purple-800';
      case 'Targeted':
        return 'bg-orange-100 text-orange-800';
      case 'Imp':
        return 'bg-red-100 text-red-800';
      case 'Overdue':
        return 'bg-red-600 text-white font-bold animate-pulse';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Task Button */}
      {canCreate && onAddTask && (
        <div className="flex justify-end">
          <Button onClick={onAddTask}>
            Add Task
          </Button>
        </div>
      )}

      {/* Task Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No tasks found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Task Name</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Project</th>
                    <th className="text-left p-3 font-medium">Assignee</th>
                    <th className="text-left p-3 font-medium">Deadline</th>
                    <th className="text-left p-3 font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{task.name}</div>
                      </td>
                      <td className="p-3">
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-gray-500" />
                          <span className="text-sm">{task.project_name || 'No Project'}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-500" />
                          <span className="text-sm">{task.assignee?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {task.deadline ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span className="text-sm">{format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No deadline</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span className="text-sm">{task.hours}h</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Permission Message */}
      {!canCreate && !canUpdate && !canDelete && (
        <div className="text-center py-8">
          <p className="text-gray-600">You don't have permission to create tasks.</p>
        </div>
      )}
    </div>
  );
};

export default TaskTable;
