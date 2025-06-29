
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { Calendar, Clock } from 'lucide-react';

interface TaskEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    name: string;
    reminder_datetime?: string;
    slot_start_datetime?: string;
    slot_end_datetime?: string;
  };
  mode: 'reminder' | 'slot';
}

const TaskEditDialog = ({ isOpen, onClose, task, mode }: TaskEditDialogProps) => {
  const [reminderDateTime, setReminderDateTime] = useState(
    task.reminder_datetime ? task.reminder_datetime.slice(0, 16) : ''
  );
  const [slotStartDateTime, setSlotStartDateTime] = useState(
    task.slot_start_datetime ? task.slot_start_datetime.slice(0, 16) : ''
  );
  const [slotEndDateTime, setSlotEndDateTime] = useState(
    task.slot_end_datetime ? task.slot_end_datetime.slice(0, 16) : ''
  );

  const queryClient = useQueryClient();

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-slot-tasks'] });
      toast.success('Task updated successfully');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to update task');
      console.error('Error updating task:', error);
    },
  });

  const handleSave = () => {
    if (mode === 'reminder') {
      const updates = {
        reminder_datetime: reminderDateTime || null,
      };
      updateTaskMutation.mutate(updates);
    } else {
      if (slotStartDateTime && slotEndDateTime) {
        if (new Date(slotStartDateTime) >= new Date(slotEndDateTime)) {
          toast.error('End time must be after start time');
          return;
        }
      }
      
      const updates = {
        slot_start_datetime: slotStartDateTime || null,
        slot_end_datetime: slotEndDateTime || null,
      };
      updateTaskMutation.mutate(updates);
    }
  };

  const handleRemove = () => {
    if (mode === 'reminder') {
      updateTaskMutation.mutate({ reminder_datetime: null });
    } else {
      updateTaskMutation.mutate({
        slot_start_datetime: null,
        slot_end_datetime: null,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'reminder' ? <Clock className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
            Edit {mode === 'reminder' ? 'Reminder' : 'Time Slot'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Task</Label>
            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{task.name}</p>
          </div>

          {mode === 'reminder' ? (
            <div>
              <Label htmlFor="reminder" className="text-sm font-medium text-gray-700">
                Reminder Date & Time
              </Label>
              <Input
                id="reminder"
                type="datetime-local"
                value={reminderDateTime}
                onChange={(e) => setReminderDateTime(e.target.value)}
                className="mt-1"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="start" className="text-sm font-medium text-gray-700">
                  Start Date & Time
                </Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={slotStartDateTime}
                  onChange={(e) => setSlotStartDateTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end" className="text-sm font-medium text-gray-700">
                  End Date & Time
                </Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={slotEndDateTime}
                  onChange={(e) => setSlotEndDateTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-4">
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={updateTaskMutation.isPending}
              size="sm"
            >
              Remove {mode === 'reminder' ? 'Reminder' : 'Slot'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} size="sm">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateTaskMutation.isPending}
                size="sm"
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
