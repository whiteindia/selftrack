
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { logTimeEntry } from '@/utils/activityLogger';

interface ManualTimeLogProps {
  taskId: string;
  onSuccess: () => void;
}

const ManualTimeLog: React.FC<ManualTimeLogProps> = ({ taskId, onSuccess }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    hours: '',
    comment: '',
    date: new Date().toISOString().split('T')[0]
  });

  const logTimeMutation = useMutation({
    mutationFn: async ({ hours, comment, date }: { hours: number; comment: string; date: string }) => {
      // Get current user's employee record
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();
      
      if (empError || !employee) {
        throw new Error('Employee record not found. Please contact admin.');
      }

      // Get task and project details for activity logging
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select(`
          name,
          projects(name)
        `)
        .eq('id', taskId)
        .single();

      if (taskError) {
        throw new Error('Failed to fetch task details');
      }

      // Create a completed time entry
      const startTime = new Date(`${date}T09:00:00`);
      const endTime = new Date(startTime.getTime() + (hours * 60 * 60 * 1000));
      
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          task_id: taskId,
          employee_id: employee.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: Math.floor(hours * 60),
          comment
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Log the activity
      const durationText = hours === 1 ? '1 hour' : `${hours} hours`;
      await logTimeEntry(
        task.name,
        taskId,
        durationText,
        comment,
        task.projects?.name
      );
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onSuccess();
      setFormData({ hours: '', comment: '', date: new Date().toISOString().split('T')[0] });
      setIsOpen(false);
      toast.success('Time logged successfully!');
    },
    onError: (error) => {
      toast.error('Failed to log time: ' + error.message);
    }
  });

  const handleSubmit = () => {
    if (!formData.hours || !formData.comment) {
      toast.error('Please fill in all fields');
      return;
    }
    
    const hours = parseFloat(formData.hours);
    if (hours <= 0) {
      toast.error('Please enter a valid number of hours');
      return;
    }
    
    logTimeMutation.mutate({ 
      hours, 
      comment: formData.comment.trim(), 
      date: formData.date 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Log Time
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Work Time</DialogTitle>
          <DialogDescription>
            Manually log time spent on this task.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hours">Hours</Label>
            <Input
              id="hours"
              type="number"
              step="0.25"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              placeholder="0.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Work Description</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Describe what work was completed..."
              rows={4}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={logTimeMutation.isPending}
            >
              {logTimeMutation.isPending ? 'Logging...' : 'Log Time'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualTimeLog;
