
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Calendar } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  deadline?: string;
  estimated_duration?: number;
  hours: number;
  assignee?: {
    name: string;
  };
  assigner?: {
    name: string;
  };
}

interface TaskKanbanProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, newStatus: 'Not Started' | 'In Progress' | 'Completed') => void;
}

const TaskKanban: React.FC<TaskKanbanProps> = ({ tasks, onTaskStatusChange }) => {
  const statuses: Array<'Not Started' | 'In Progress' | 'Completed'> = [
    'Not Started',
    'In Progress', 
    'Completed'
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: 'Not Started' | 'In Progress' | 'Completed') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    onTaskStatusChange(taskId, status);
  };

  const getTasksByStatus = (status: 'Not Started' | 'In Progress' | 'Completed') => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {statuses.map((status) => (
        <div
          key={status}
          className="space-y-4"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, status)}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>{status}</span>
                <Badge variant="secondary" className={getStatusColor(status)}>
                  {getTasksByStatus(status).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getTasksByStatus(status).map((task) => (
                <Card
                  key={task.id}
                  className="cursor-move hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                >
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm mb-2">{task.name}</h4>
                    
                    <div className="space-y-2 text-xs text-gray-600">
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Assigned: {task.assignee.name}</span>
                        </div>
                      )}
                      
                      {task.deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {task.estimated_duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Est: {task.estimated_duration}h</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Logged: {task.hours}h</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {getTasksByStatus(status).length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm">No tasks in {status.toLowerCase()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default TaskKanban;
