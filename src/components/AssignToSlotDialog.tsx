
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Building, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SelectedItem {
  id: string;
  originalId: string;
  type: string;
  title: string;
  date: string;
  client: string;
  project: string;
  assigneeId: string | null;
  projectId: string;
  itemType: string;
}

interface AssignToSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: SelectedItem[];
  onAssigned: () => void;
}

const AssignToSlotDialog: React.FC<AssignToSlotDialogProps> = ({
  open,
  onOpenChange,
  selectedItems,
  onAssigned,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  // Generate time slots (24-hour format)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return {
      value: `${hour}:00`,
      label: `${hour}:00 - ${(i + 1).toString().padStart(2, '0')}:00`,
      display: i === 0 ? '12:00 AM - 1:00 AM' :
               i === 12 ? '12:00 PM - 1:00 PM' :
               i < 12 ? `${i}:00 AM - ${i + 1}:00 AM` :
               `${i - 12}:00 PM - ${i - 11}:00 PM`
    };
  });

  const assignToSlotMutation = useMutation({
    mutationFn: async ({ items, date, slot }: { 
      items: SelectedItem[]; 
      date: Date; 
      slot: string; 
    }) => {
      console.log('Starting assignment process:', { items: items.length, date, slot });
      
      // Get current user's employee record
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();
      
      if (empError) {
        console.error('Employee lookup error:', empError);
        throw new Error('Could not find employee record. Please contact admin.');
      }

      if (!employee) {
        throw new Error('Employee record not found');
      }

      console.log('Found employee:', employee.id);

      // Debug: Check what WorkloadCal is expecting by querying existing data
      const { data: existingSubtasks, error: queryError } = await supabase
        .from('subtasks')
        .select(`
          id,
          name,
          scheduled_time,
          date,
          hours,
          assignee_id,
          task:tasks(
            name,
            project:projects(
              name,
              client:clients(name)
            )
          )
        `)
        .eq('date', format(date, 'yyyy-MM-dd'))
        .not('scheduled_time', 'is', null);
      
      console.log('Existing subtasks for this date:', existingSubtasks);

      const promises = items.map(async (item) => {
        try {
          // Create the scheduled time in the format expected by workload calendar
          const scheduledDateTime = new Date(date);
          const [hour] = slot.split(':');
          scheduledDateTime.setHours(parseInt(hour), 0, 0, 0);
          
          console.log('Creating subtask with scheduled time:', scheduledDateTime.toISOString());
          
          // Check if we should insert into tasks table instead for certain types
          if (item.type === 'reminder' || item.type === 'task-deadline') {
            // For reminders and task deadlines, update the existing task's scheduled_time
            const { data: taskData, error: taskError } = await supabase
              .from('tasks')
              .update({
                scheduled_time: `${format(date, 'yyyy-MM-dd')} ${slot}:00`
              })
              .eq('id', item.originalId)
              .select()
              .single();

            if (taskError) {
              console.error('Task update error:', taskError);
              // Fall back to creating subtask
            } else {
              console.log('Successfully updated task:', taskData);
              return taskData;
            }
          }
          
          // Insert into subtasks table with proper datetime format
          const { data, error } = await supabase
            .from('subtasks')
            .insert({
              name: item.title,
              task_id: item.originalId,
              scheduled_time: scheduledDateTime.toISOString(),
              assignee_id: item.assigneeId || employee.id,
              assigner_id: employee.id,
              status: 'Not Started',
              date: format(date, 'yyyy-MM-dd'),
              hours: 1 // Default to 1 hour duration
            })
            .select()
            .single();

          if (error) {
            console.error('Subtask creation error:', error);
            throw error;
          }
          
          console.log('Successfully created subtask:', data);
          return data;
        } catch (itemError) {
          console.error('Error processing item:', item.title, itemError);
          throw itemError;
        }
      });

      const results = await Promise.all(promises);
      console.log('All assignments completed:', results.length);

      // Debug: Query the data again to see what was actually stored
      const { data: newSubtasks, error: newQueryError } = await supabase
        .from('subtasks')
        .select(`
          id,
          name,
          scheduled_time,
          date,
          hours,
          assignee_id,
          task:tasks(
            name,
            project:projects(
              name,
              client:clients(name)
            )
          )
        `)
        .eq('date', format(date, 'yyyy-MM-dd'))
        .not('scheduled_time', 'is', null);
      
      console.log('Subtasks after assignment:', newSubtasks);

      return results;
    },
    onSuccess: (results) => {
      console.log('Assignment successful:', results);
      toast.success(`${selectedItems.length} items assigned to workload calendar`);
      
      // Invalidate all relevant queries to refresh the workload calendar
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['workload-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['workload-data'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-items'] });
      
      onAssigned();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Assignment failed:', error);
      const errorMessage = error?.message || 'Failed to assign items to workload calendar';
      toast.error(errorMessage);
    },
  });

  const handleAssign = () => {
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }

    console.log('Starting assignment:', {
      items: selectedItems.length,
      date: selectedDate,
      slot: selectedSlot
    });

    assignToSlotMutation.mutate({
      items: selectedItems,
      date: selectedDate,
      slot: selectedSlot,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Assign to Workload Calendar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Items Preview */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Selected Items ({selectedItems.length})
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
              {selectedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-gray-600 flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {item.client}
                      </span>
                      <span>{item.project}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.type.replace('-', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Select Date
            </Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
            <div className="mt-2 text-center text-sm text-gray-600">
              Selected: {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
            </div>
          </div>

          {/* Time Slot Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Select Time Slot
            </Label>
            <Select value={selectedSlot} onValueChange={setSelectedSlot}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {slot.display}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Summary */}
          {selectedSlot && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="text-sm">
                <div className="font-medium text-blue-800 mb-1">Assignment Summary:</div>
                <div className="text-blue-700">
                  {selectedItems.length} items will be assigned to{' '}
                  <span className="font-medium">
                    {format(selectedDate, 'MMM dd, yyyy')} at{' '}
                    {timeSlots.find(slot => slot.value === selectedSlot)?.display}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedSlot || assignToSlotMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {assignToSlotMutation.isPending ? 'Assigning...' : 'Assign to Slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignToSlotDialog;
