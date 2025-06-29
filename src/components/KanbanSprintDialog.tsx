
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface KanbanSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTaskIds: string[];
  projectId?: string;
  onSuccess: () => void;
}

const KanbanSprintDialog: React.FC<KanbanSprintDialogProps> = ({ 
  open, 
  onOpenChange, 
  selectedTaskIds,
  projectId,
  onSuccess 
}) => {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState<Date>();
  const [sprintLeaderId, setSprintLeaderId] = useState<string>('unassigned');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTitle('');
      setDeadline(undefined);
      setSprintLeaderId('unassigned');
    }
  }, [open]);

  // Fetch available employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email')
        .order('name');

      if (error) throw error;
      return data as Employee[];
    },
    enabled: open
  });

  const createSprintMutation = useMutation({
    mutationFn: async (sprintData: { title: string; deadline: string; sprintLeaderId: string; projectId?: string; taskIds: string[] }) => {
      // Create sprint
      const { data: sprint, error: sprintError } = await supabase
        .from('sprints')
        .insert({
          title: sprintData.title,
          deadline: sprintData.deadline,
          sprint_leader_id: sprintData.sprintLeaderId === 'unassigned' ? null : sprintData.sprintLeaderId,
          project_id: sprintData.projectId || null,
          status: 'Not Started'
        })
        .select()
        .single();

      if (sprintError) throw sprintError;

      // Add tasks to sprint
      if (sprintData.taskIds.length > 0) {
        const sprintTasks = sprintData.taskIds.map(taskId => ({
          sprint_id: sprint.id,
          task_id: taskId
        }));

        const { error: tasksError } = await supabase
          .from('sprint_tasks')
          .insert(sprintTasks);

        if (tasksError) throw tasksError;
      }

      return sprint;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sprint created successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create sprint",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a sprint title",
        variant: "destructive",
      });
      return;
    }

    if (!deadline) {
      toast({
        title: "Error",
        description: "Please select a deadline",
        variant: "destructive",
      });
      return;
    }

    const sprintData = {
      title: title.trim(),
      deadline: format(deadline, 'yyyy-MM-dd'),
      sprintLeaderId: sprintLeaderId,
      projectId: projectId,
      taskIds: selectedTaskIds
    };

    createSprintMutation.mutate(sprintData);
  };

  const isLoading = createSprintMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Sprint</DialogTitle>
          <DialogDescription>
            Create a new sprint with {selectedTaskIds.length} selected task(s).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Sprint Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter sprint title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : "Pick a deadline"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sprintLeader">Sprint Leader</Label>
            <Select value={sprintLeaderId} onValueChange={setSprintLeaderId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select sprint leader" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">No Leader Assigned</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Sprint'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default KanbanSprintDialog;
