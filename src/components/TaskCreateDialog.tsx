import React, { useState } from 'react';
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
import { Plus, Calendar, Clock, User, Building } from 'lucide-react';

interface TaskCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentTaskId?: string;
  onSuccess?: () => void;
}

const statusOptions = [
  'Not Started',
  'In Progress', 
  'On-Head',
  'Targeted',
  'Imp',
  'Completed'
];

const TaskCreateDialog = ({ isOpen, onClose, parentTaskId, onSuccess }: TaskCreateDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    status: 'Not Started',
    project_id: '',
    assignee_id: '',
    deadline: '',
    estimated_duration: '',
    reminder_datetime: '',
    slot_start_datetime: '',
    slot_end_datetime: ''
  });

  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      console.log('Fetching projects...');
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          clients!inner(name)
        `)
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      console.log('Projects fetched:', data);
      return data || [];
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      console.log('Fetching employees...');
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email')
        .order('name');

      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }
      console.log('Employees fetched:', data);
      return data || [];
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      console.log('Creating task with data:', taskData);
      console.log('Parent task ID:', parentTaskId);
      
      if (parentTaskId) {
        // Creating a subtask
        const { data, error } = await supabase
          .from('subtasks')
          .insert([{
            name: taskData.name,
            status: taskData.status,
            task_id: parentTaskId,
            assignee_id: taskData.assignee_id || null,
            deadline: taskData.deadline || null,
            estimated_duration: taskData.estimated_duration || null,
          }])
          .select();
        
        if (error) {
          console.error('Error creating subtask:', error);
          throw error;
        }
        console.log('Subtask created successfully:', data);
      } else {
        // Creating a main task
        const { data, error } = await supabase
          .from('tasks')
          .insert([{
            name: taskData.name,
            status: taskData.status,
            project_id: taskData.project_id,
            assignee_id: taskData.assignee_id || null,
            deadline: taskData.deadline || null,
            estimated_duration: taskData.estimated_duration || null,
            reminder_datetime: taskData.reminder_datetime || null,
            slot_start_datetime: taskData.slot_start_datetime || null,
            slot_end_datetime: taskData.slot_end_datetime || null,
          }])
          .select();
        
        if (error) {
          console.error('Error creating task:', error);
          throw error;
        }
        console.log('Task created successfully:', data);
      }
    },
    onSuccess: () => {
      console.log('Task creation successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(parentTaskId ? 'Subtask created successfully' : 'Task created successfully');
      handleClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Task creation failed:', error);
      toast.error('Failed to create task: ' + (error.message || 'Unknown error'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', formData);
    
    if (!formData.name.trim()) {
      toast.error('Task name is required');
      return;
    }

    if (!parentTaskId && !formData.project_id) {
      toast.error('Project is required for main tasks');
      return;
    }

    const taskData = {
      name: formData.name.trim(),
      status: formData.status,
      project_id: formData.project_id || null,
      assignee_id: formData.assignee_id || null,
      deadline: formData.deadline || null,
      estimated_duration: formData.estimated_duration ? parseFloat(formData.estimated_duration) : null,
      reminder_datetime: formData.reminder_datetime || null,
      slot_start_datetime: formData.slot_start_datetime || null,
      slot_end_datetime: formData.slot_end_datetime || null,
    };

    console.log('Processed task data:', taskData);
    createTaskMutation.mutate(taskData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      status: 'Not Started',
      project_id: '',
      assignee_id: '',
      deadline: '',
      estimated_duration: '',
      reminder_datetime: '',
      slot_start_datetime: '',
      slot_end_datetime: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create {parentTaskId ? 'Subtask' : 'Task'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              {parentTaskId ? 'Subtask' : 'Task'} Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={`Enter ${parentTaskId ? 'subtask' : 'task'} name`}
              required
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

          {/* Project Selection - Only for main tasks */}
          {!parentTaskId && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Project *
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

          {/* Deadline and Duration */}
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
          {!parentTaskId && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reminder Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.reminder_datetime}
                onChange={(e) => setFormData({ ...formData, reminder_datetime: e.target.value })}
              />
            </div>
          )}

          {/* Time Slot - Only for main tasks */}
          {!parentTaskId && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Time Slot (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.slot_start_datetime}
                    onChange={(e) => setFormData({ ...formData, slot_start_datetime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">End Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.slot_end_datetime}
                    onChange={(e) => setFormData({ ...formData, slot_end_datetime: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending 
                ? `Creating ${parentTaskId ? 'Subtask' : 'Task'}...` 
                : `Create ${parentTaskId ? 'Subtask' : 'Task'}`
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskCreateDialog;
