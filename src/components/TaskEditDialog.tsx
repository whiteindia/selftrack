
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, User, Building, Edit } from 'lucide-react';
import { convertISTToUTC, formatUTCToISTInput } from '@/utils/timezoneUtils';

interface TaskEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    name: string;
    status?: string;
    project_id?: string;
    assignee_id?: string;
    deadline?: string;
    estimated_duration?: number;
    reminder_datetime?: string;
    slot_start_datetime?: string;
    slot_end_datetime?: string;
  };
  mode?: 'reminder' | 'slot' | 'full';
  isSubtask?: boolean;
}

const statusOptions = [
  'Not Started',
  'In Progress', 
  'On-Head',
  'Targeted',
  'Imp',
  'Completed'
];

const TaskEditDialog = ({ isOpen, onClose, task, mode = 'full', isSubtask = false }: TaskEditDialogProps) => {
  const [formData, setFormData] = useState({
    name: task.name || '',
    status: task.status || 'Not Started',
    project_id: task.project_id || '',
    assignee_id: task.assignee_id || '',
    deadline: task.deadline || '',
    estimated_duration: task.estimated_duration?.toString() || '',
    reminder_datetime: formatUTCToISTInput(task.reminder_datetime),
    slot_start_datetime: formatUTCToISTInput(task.slot_start_datetime),
    slot_end_datetime: formatUTCToISTInput(task.slot_end_datetime),
  });

  const queryClient = useQueryClient();

  // Fetch projects for main tasks
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          clients!inner(name)
        `)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !isSubtask,
  });

  // Fetch employees
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

  useEffect(() => {
    console.log('TaskEditDialog - Task data updated:', task);
    setFormData({
      name: task.name || '',
      status: task.status || 'Not Started',
      project_id: task.project_id || '',
      assignee_id: task.assignee_id || '',
      deadline: task.deadline || '',
      estimated_duration: task.estimated_duration?.toString() || '',
      reminder_datetime: formatUTCToISTInput(task.reminder_datetime),
      slot_start_datetime: formatUTCToISTInput(task.slot_start_datetime),
      slot_end_datetime: formatUTCToISTInput(task.slot_end_datetime),
    });
    console.log('TaskEditDialog - Form data after conversion:', {
      reminder_datetime: formatUTCToISTInput(task.reminder_datetime),
      slot_start_datetime: formatUTCToISTInput(task.slot_start_datetime),
      slot_end_datetime: formatUTCToISTInput(task.slot_end_datetime),
    });
  }, [task]);

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      const tableName = isSubtask ? 'subtasks' : 'tasks';
      
      // Convert IST datetime inputs to UTC for storage
      const processedUpdates = { ...updates };
      if (updates.reminder_datetime !== undefined) {
        processedUpdates.reminder_datetime = updates.reminder_datetime ? convertISTToUTC(updates.reminder_datetime) : null;
      }
      if (updates.slot_start_datetime !== undefined) {
        processedUpdates.slot_start_datetime = updates.slot_start_datetime ? convertISTToUTC(updates.slot_start_datetime) : null;
      }
      if (updates.slot_end_datetime !== undefined) {
        processedUpdates.slot_end_datetime = updates.slot_end_datetime ? convertISTToUTC(updates.slot_end_datetime) : null;
      }

      console.log('Updating task with processed data (UTC):', processedUpdates);

      const { error } = await supabase
        .from(tableName)
        .update(processedUpdates)
        .eq('id', task.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['todays-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reminder-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-slot-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-slots'] });
      toast.success(`${isSubtask ? 'Subtask' : 'Task'} updated successfully`);
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to update ${isSubtask ? 'subtask' : 'task'}`);
      console.error('Error updating task:', error);
    },
  });

  const handleSave = () => {
    if (mode === 'reminder') {
      const updates = {
        reminder_datetime: formData.reminder_datetime || null,
      };
      updateTaskMutation.mutate(updates);
    } else if (mode === 'slot') {
      if (formData.slot_start_datetime && formData.slot_end_datetime) {
        if (new Date(formData.slot_start_datetime) >= new Date(formData.slot_end_datetime)) {
          toast.error('End time must be after start time');
          return;
        }
      }
      
      const updates = {
        slot_start_datetime: formData.slot_start_datetime || null,
        slot_end_datetime: formData.slot_end_datetime || null,
      };
      updateTaskMutation.mutate(updates);
    } else {
      // Full edit mode
      if (!formData.name.trim()) {
        toast.error(`${isSubtask ? 'Subtask' : 'Task'} name is required`);
        return;
      }

      const updates: any = {
        name: formData.name,
        status: formData.status,
        assignee_id: formData.assignee_id || null,
        deadline: formData.deadline || null,
        estimated_duration: formData.estimated_duration ? parseFloat(formData.estimated_duration) : null,
        reminder_datetime: formData.reminder_datetime || null,
        slot_start_datetime: formData.slot_start_datetime || null,
        slot_end_datetime: formData.slot_end_datetime || null,
      };

      // Only include project_id for main tasks
      if (!isSubtask && formData.project_id) {
        updates.project_id = formData.project_id;
      }

      updateTaskMutation.mutate(updates);
    }
  };

  const handleRemove = () => {
    if (mode === 'reminder') {
      updateTaskMutation.mutate({ reminder_datetime: null });
    } else if (mode === 'slot') {
      updateTaskMutation.mutate({
        slot_start_datetime: null,
        slot_end_datetime: null,
      });
    }
  };

  const getDialogTitle = () => {
    if (mode === 'reminder') return `Edit Reminder`;
    if (mode === 'slot') return `Edit Time Slot`;
    return `Edit ${isSubtask ? 'Subtask' : 'Task'}`;
  };

  const getDialogIcon = () => {
    if (mode === 'reminder') return <Clock className="h-5 w-5" />;
    if (mode === 'slot') return <Calendar className="h-5 w-5" />;
    return <Edit className="h-5 w-5" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDialogIcon()}
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {mode === 'full' ? (
            // Full edit form - matches create dialog structure
            <>
              {/* Task/Subtask Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {isSubtask ? 'Subtask' : 'Task'} Name *
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={`Enter ${isSubtask ? 'subtask' : 'task'} name`}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project - Only for main tasks */}
              {!isSubtask && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Project
                  </Label>
                  <Select 
                    value={formData.project_id} 
                    onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} - {project.clients?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Assignee */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assignee
                </Label>
                <Select 
                  value={formData.assignee_id} 
                  onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline and Estimated Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Deadline
                  </Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Estimated Hours
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                    placeholder="0.0"
                  />
                </div>
              </div>

              {/* Reminder - Only for main tasks */}
              {!isSubtask && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reminder Date & Time (IST)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.reminder_datetime}
                    onChange={(e) => setFormData({ ...formData, reminder_datetime: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Times will be stored and displayed in Indian Standard Time</p>
                </div>
              )}

              {/* Time Slot - Only for main tasks */}
              {!isSubtask && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Time Slot (Optional) - IST</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600">Start Time (IST)</Label>
                      <Input
                        type="datetime-local"
                        value={formData.slot_start_datetime}
                        onChange={(e) => setFormData({ ...formData, slot_start_datetime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600">End Time (IST)</Label>
                      <Input
                        type="datetime-local"
                        value={formData.slot_end_datetime}
                        onChange={(e) => setFormData({ ...formData, slot_end_datetime: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Times will be stored and displayed in Indian Standard Time</p>
                </div>
              )}
            </>
          ) : mode === 'reminder' ? (
            // Reminder edit mode
            <>
              <div>
                <Label className="text-sm font-medium text-gray-700">Task</Label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{task.name}</p>
              </div>
              <div>
                <Label htmlFor="reminder" className="text-sm font-medium text-gray-700">
                  Reminder Date & Time (IST)
                </Label>
                <Input
                  id="reminder"
                  type="datetime-local"
                  value={formData.reminder_datetime}
                  onChange={(e) => setFormData({ ...formData, reminder_datetime: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Times will be stored and displayed in Indian Standard Time</p>
              </div>
            </>
          ) : (
            // Slot edit mode
            <>
              <div>
                <Label className="text-sm font-medium text-gray-700">Task</Label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{task.name}</p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="start" className="text-sm font-medium text-gray-700">
                    Start Date & Time (IST)
                  </Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={formData.slot_start_datetime}
                    onChange={(e) => setFormData({ ...formData, slot_start_datetime: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end" className="text-sm font-medium text-gray-700">
                    End Date & Time (IST)
                  </Label>
                  <Input
                    id="end"
                    type="datetime-local"
                    value={formData.slot_end_datetime}
                    onChange={(e) => setFormData({ ...formData, slot_end_datetime: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <p className="text-xs text-gray-500">Times will be stored and displayed in Indian Standard Time</p>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className={`flex ${mode === 'full' ? 'justify-end' : 'justify-between'} gap-3 pt-4`}>
            {mode !== 'full' && (
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={updateTaskMutation.isPending}
              >
                Remove {mode === 'reminder' ? 'Reminder' : 'Slot'}
              </Button>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateTaskMutation.isPending}
              >
                {updateTaskMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskEditDialog;
