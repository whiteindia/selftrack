
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, Calendar, Edit, Trash2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import TimeTrackerWithComment from '@/components/TimeTrackerWithComment';
import TaskHistory from '@/components/TaskHistory';
import ManualTimeLog from '@/components/ManualTimeLog';
import { useTimeEntryCount } from '@/hooks/useTimeEntryCount';

interface Subtask {
  id: string;
  name: string;
  status: string;
  hours: number;
  date: string;
  deadline: string | null;
  estimated_duration: number | null;
  completion_date: string | null;
  assignee_id: string | null;
  assigner_id: string | null;
  task_id: string;
  assignee: {
    name: string;
  } | null;
  assigner: {
    name: string;
  } | null;
  total_logged_hours?: number;
}

interface SubtaskCardProps {
  subtask: Subtask;
  onEdit: (subtask: Subtask) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onTimeUpdate: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}

const SubtaskCard: React.FC<SubtaskCardProps> = ({
  subtask,
  onEdit,
  onDelete,
  onStatusChange,
  onTimeUpdate,
  canUpdate,
  canDelete
}) => {
  const [expandedSubtask, setExpandedSubtask] = useState<string | null>(null);
  const { data: timeEntryCount = 0 } = useTimeEntryCount(subtask.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Completed': return 'bg-green-500';
      case 'On Hold': return 'bg-yellow-500';
      case 'On-Head': return 'bg-purple-500';
      case 'Targeted': return 'bg-orange-500';
      case 'Imp': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow ml-4 border-l-4 border-l-blue-300">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4">
          {/* Subtask Title and Basic Info - Always on top */}
          <div className="flex flex-col gap-2">
            <CardTitle className="text-base leading-tight break-words whitespace-pre-line overflow-hidden">{subtask.name}</CardTitle>
            
            {/* Subtask Details - Stack on mobile, wrap on larger screens */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{subtask.assignee?.name || 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{subtask.total_logged_hours?.toFixed(2) || '0.00'}h logged</span>
                {subtask.estimated_duration && <span> / {subtask.estimated_duration}h estimated</span>}
              </div>
              {subtask.deadline && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>Due: {format(new Date(subtask.deadline), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Status Badge and Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            {/* Status Badge - Full width on mobile */}
            <div className="flex items-start">
              <Badge className={`${getStatusColor(subtask.status)} w-full sm:w-auto justify-center sm:justify-start`}>
                {subtask.status}
              </Badge>
            </div>
            
            {/* Action Buttons - Stack on mobile, align right on larger screens */}
            <div className="flex flex-wrap gap-2 justify-start sm:justify-end items-start">
              <TimeTrackerWithComment 
                task={{ id: subtask.id, name: subtask.name }}
                onSuccess={onTimeUpdate}
                isSubtask={true}
              />
              <ManualTimeLog 
                taskId={subtask.id}
                onSuccess={onTimeUpdate}
                isSubtask={true}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedSubtask(expandedSubtask === subtask.id ? null : subtask.id)}
                className="flex-shrink-0"
              >
                <MessageSquare className="h-4 w-4" />
                {timeEntryCount > 0 && (
                  <span className="ml-1 text-xs">({timeEntryCount})</span>
                )}
              </Button>
              {canUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(subtask)}
                  className="flex-shrink-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(subtask.id)}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      {expandedSubtask === subtask.id && (
        <CardContent className="border-t pt-4">
          <div className="space-y-4">
            {canUpdate && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label htmlFor="status" className="text-sm font-medium">Status:</Label>
                <Select value={subtask.status} onValueChange={(value) => onStatusChange(subtask.id, value)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <TaskHistory taskId={subtask.id} onUpdate={onTimeUpdate} isSubtask={true} />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default SubtaskCard;
