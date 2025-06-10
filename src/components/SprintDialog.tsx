
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  name: string;
  status: string;
  project_id: string;
  projects?: {
    name: string;
    clients: {
      name: string;
    };
  };
}

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  created_at: string;
  updated_at: string;
}

interface SprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSprint?: Sprint | null;
  onSuccess: () => void;
}

const SprintDialog: React.FC<SprintDialogProps> = ({ 
  open, 
  onOpenChange, 
  editingSprint, 
  onSuccess 
}) => {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState<Date>();
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Reset form when dialog opens/closes or editing sprint changes
  useEffect(() => {
    if (open) {
      if (editingSprint) {
        setTitle(editingSprint.title);
        setDeadline(new Date(editingSprint.deadline));
        // Load existing tasks for this sprint
        loadSprintTasks(editingSprint.id);
      } else {
        resetForm();
      }
    }
  }, [open, editingSprint]);

  const loadSprintTasks = async (sprintId: string) => {
    const { data: sprintTasks, error } = await supabase
      .from('sprint_tasks')
      .select('task_id')
      .eq('sprint_id', sprintId);
    
    if (!error && sprintTasks) {
      setSelectedTasks(sprintTasks.map(st => st.task_id));
    }
  };

  // Fetch available tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['available-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          project_id,
          projects (
            name,
            clients (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: open
  });

  const createSprintMutation = useMutation({
    mutationFn: async (sprintData: { title: string; deadline: string; taskIds: string[] }) => {
      // Create sprint
      const { data: sprint, error: sprintError } = await supabase
        .from('sprints')
        .insert({
          title: sprintData.title,
          deadline: sprintData.deadline,
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
      resetForm();
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

  const updateSprintMutation = useMutation({
    mutationFn: async (sprintData: { id: string; title: string; deadline: string; taskIds: string[] }) => {
      // Update sprint
      const { error: sprintError } = await supabase
        .from('sprints')
        .update({
          title: sprintData.title,
          deadline: sprintData.deadline,
        })
        .eq('id', sprintData.id);

      if (sprintError) throw sprintError;

      // Remove existing sprint tasks
      const { error: deleteError } = await supabase
        .from('sprint_tasks')
        .delete()
        .eq('sprint_id', sprintData.id);

      if (deleteError) throw deleteError;

      // Add new tasks to sprint
      if (sprintData.taskIds.length > 0) {
        const sprintTasks = sprintData.taskIds.map(taskId => ({
          sprint_id: sprintData.id,
          task_id: taskId
        }));

        const { error: tasksError } = await supabase
          .from('sprint_tasks')
          .insert(sprintTasks);

        if (tasksError) throw tasksError;
      }

      return sprintData;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sprint updated successfully",
      });
      resetForm();
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sprint",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setTitle('');
    setDeadline(undefined);
    setSelectedTasks([]);
  };

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
      taskIds: selectedTasks
    };

    if (editingSprint) {
      updateSprintMutation.mutate({
        id: editingSprint.id,
        ...sprintData
      });
    } else {
      createSprintMutation.mutate(sprintData);
    }
  };

  const handleTaskToggle = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const isLoading = createSprintMutation.isPending || updateSprintMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSprint ? 'Edit Sprint' : 'Create New Sprint'}
          </DialogTitle>
          <DialogDescription>
            {editingSprint ? 'Update sprint details and task assignments.' : 'Create a new sprint and assign tasks to it.'}
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
            <Label>Select Tasks</Label>
            <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500">No tasks available</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={task.id}
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => handleTaskToggle(task.id)}
                      />
                      <label
                        htmlFor={task.id}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <div className="font-medium">{task.name}</div>
                        <div className="text-xs text-gray-500">
                          {task.projects?.name} - {task.projects?.clients?.name}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Selected {selectedTasks.length} task(s)
            </p>
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
              {isLoading ? (editingSprint ? 'Updating...' : 'Creating...') : (editingSprint ? 'Update Sprint' : 'Create Sprint')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SprintDialog;
