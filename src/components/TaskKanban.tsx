
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Plus, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
}

interface TaskKanbanProps {
  tasks: Task[];
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onTaskStatusChange: (taskId: string, newStatus: string) => void;
  onAddTask?: () => void;
}

const TaskKanban: React.FC<TaskKanbanProps> = ({ 
  tasks, 
  canCreate = false,
  canUpdate = false,
  canDelete = false,
  onTaskStatusChange,
  onAddTask 
}) => {
  const isMobile = useIsMobile();
  
  const statuses = [
    'Not Started',
    'In Progress', 
    'On Hold',
    'On-Head',
    'Targeted',
    'Imp',
    'Completed'
  ];

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
      case 'Completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!canUpdate) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canUpdate) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    if (!canUpdate) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    onTaskStatusChange(taskId, status);
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="space-y-6">
      {/* Add Task Button */}
      {canCreate && onAddTask && (
        <div className="flex justify-end">
          <Button onClick={onAddTask}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        {statuses.map((status) => (
          <div
            key={status}
            className="space-y-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <Card className="min-h-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="truncate">{status}</span>
                  <Badge variant="secondary" className={`${getStatusColor(status)} text-xs`}>
                    {getTasksByStatus(status).length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getTasksByStatus(status).map((task) => (
                  <Card
                    key={task.id}
                    className={`${canUpdate ? 'cursor-move' : 'cursor-default'} hover:shadow-md transition-shadow border-l-4 border-l-blue-500`}
                    draggable={canUpdate}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                  >
                    <CardContent className="p-3 space-y-2">
                      {/* Task Name */}
                      <h4 className="font-medium text-sm mb-2 break-words line-clamp-2">{task.name}</h4>
                      
                      {/* Project Info with Status */}
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <span className="truncate">Project</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{task.hours}h logged</span>
                        </span>
                        {task.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                          </span>
                        )}
                        <Badge variant="secondary" className={`${getStatusColor(task.status)} text-xs px-2 py-0 rounded-full`}>
                          {task.status}
                        </Badge>
                      </div>
                      
                      {/* Action Icons Row */}
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-100">
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-100">
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-gray-400 px-1">(2)</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-100">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-100">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {getTasksByStatus(status).length === 0 && (
                  <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-xs">No tasks</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* No Permission Message */}
      {!canCreate && !canUpdate && !canDelete && (
        <div className="text-center py-8">
          <p className="text-gray-600">You don't have permission to create tasks.</p>
        </div>
      )}
    </div>
  );
};

export default TaskKanban;
