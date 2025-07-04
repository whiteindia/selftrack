import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Search, Loader2 } from 'lucide-react';

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

interface AddTasksToSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprintId: string;
  sprintTitle: string;
  onSuccess: () => void;
}

const AddTasksToSprintDialog: React.FC<AddTasksToSprintDialogProps> = ({
  open,
  onOpenChange,
  sprintId,
  sprintTitle,
  onSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setSelectedTasks([]);
    }
  }, [open]);

  // Fetch available tasks that can be added to sprint
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['available-tasks-for-sprint', sprintId, searchTerm],
    queryFn: async () => {
      // First get tasks that are already in this sprint
      const { data: sprintTasks } = await supabase
        .from('sprint_tasks')
        .select('task_id')
        .eq('sprint_id', sprintId);

      const existingTaskIds = sprintTasks?.map(st => st.task_id) || [];

      // Then get all available tasks that are not in this sprint
      let query = supabase
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
        .in('status', ['Not Started', 'On-Head', 'Targeted', 'Imp'])
        .not('id', 'in', `(${existingTaskIds.join(',')})`);

      // Add search filter if search term is provided
      if (searchTerm.trim()) {
        query = query.ilike('name', `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: open
  });

  const addTasksToSprintMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (taskIds.length === 0) return;

      const sprintTasks = taskIds.map(taskId => ({
        sprint_id: sprintId,
        task_id: taskId
      }));

      const { error } = await supabase
        .from('sprint_tasks')
        .insert(sprintTasks);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedTasks.length} task(s) added to sprint successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add tasks to sprint",
        variant: "destructive",
      });
    }
  });

  const handleTaskToggle = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedTasks.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one task",
        variant: "destructive",
      });
      return;
    }

    addTasksToSprintMutation.mutate(selectedTasks);
  };

  const isAddingTasks = addTasksToSprintMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Tasks to Sprint</DialogTitle>
          <DialogDescription>
            Add tasks to "{sprintTitle}". Search and select tasks to add.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Available Tasks</h3>
              {selectedTasks.length > 0 && (
                <span className="text-sm text-gray-500">
                  {selectedTasks.length} selected
                </span>
              )}
            </div>
            
            <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
              {isLoadingTasks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading tasks...</span>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm.trim() ? 'No tasks found matching your search.' : 'No available tasks to add.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-gray-50">
                      <Checkbox
                        id={task.id}
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => handleTaskToggle(task.id)}
                        className="mt-1"
                      />
                      <label
                        htmlFor={task.id}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium text-sm">{task.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {task.projects?.name} • {task.projects?.clients?.name} • Status: {task.status}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAddingTasks}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAddingTasks || selectedTasks.length === 0}
            >
              {isAddingTasks ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedTasks.length} Task${selectedTasks.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTasksToSprintDialog; 