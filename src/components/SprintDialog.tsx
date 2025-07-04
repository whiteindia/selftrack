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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
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

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
  clients?: {
    name: string;
  };
}

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  sprint_leader_id: string | null;
  project_id: string | null;
  start_time?: string | null;
  end_time?: string | null;
  slot_date?: string | null;
  estimated_hours?: number | null;
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
  const [sprintLeaderId, setSprintLeaderId] = useState<string>('unassigned');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('none');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [slotDate, setSlotDate] = useState<Date>();
  const [estimatedHours, setEstimatedHours] = useState<string>('');

  // Reset form when dialog opens/closes or editing sprint changes
  useEffect(() => {
    if (open) {
      if (editingSprint) {
        setTitle(editingSprint.title);
        setDeadline(new Date(editingSprint.deadline));
        setSprintLeaderId(editingSprint.sprint_leader_id || 'unassigned');
        setSelectedProjectId(editingSprint.project_id || 'none');
        setStartTime(editingSprint.start_time || '');
        setEndTime(editingSprint.end_time || '');
        setSlotDate(editingSprint.slot_date ? new Date(editingSprint.slot_date) : undefined);
        setEstimatedHours(editingSprint.estimated_hours?.toString() || '');
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
      .select(`
        task_id,
        tasks (
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
        )
      `)
      .eq('sprint_id', sprintId);
    
    if (!error && sprintTasks) {
      const taskIds = sprintTasks.map(st => st.task_id);
      setSelectedTasks(taskIds);
      
      // Get unique project IDs from existing tasks
      const projectIds = [...new Set(sprintTasks
        .filter(st => st.tasks)
        .map(st => (st.tasks as any).project_id)
      )];
      setSelectedProjects(projectIds);
    }
  };

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

  // Fetch available projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          client_id,
          clients (
            name
          )
        `)
        .order('name');

      if (error) throw error;
      return data as Project[];
    },
    enabled: open
  });

  // Fetch available tasks based on selected projects - include multiple statuses
  const { data: tasks = [] } = useQuery({
    queryKey: ['available-tasks', selectedProjects],
    queryFn: async () => {
      if (selectedProjects.length === 0) return [];
      
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
        .in('status', ['Not Started', 'On-Head', 'Targeted', 'Imp'])
        .in('project_id', selectedProjects)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: open && selectedProjects.length > 0
  });

  const createSprintMutation = useMutation({
    mutationFn: async (sprintData: { title: string; deadline: string; sprintLeaderId: string; projectId: string; taskIds: string[]; startTime: string | null; endTime: string | null; slotDate: string | null; estimatedHours: number | null }) => {
      // Create sprint
      const { data: sprint, error: sprintError } = await supabase
        .from('sprints')
        .insert({
          title: sprintData.title,
          deadline: sprintData.deadline,
          sprint_leader_id: sprintData.sprintLeaderId === 'unassigned' ? null : sprintData.sprintLeaderId,
          project_id: sprintData.projectId === 'none' ? null : sprintData.projectId,
          start_time: sprintData.startTime,
          end_time: sprintData.endTime,
          slot_date: sprintData.slotDate,
          estimated_hours: sprintData.estimatedHours,
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
    mutationFn: async (sprintData: { id: string; title: string; deadline: string; sprintLeaderId: string; projectId: string; taskIds: string[]; startTime: string | null; endTime: string | null; slotDate: string | null; estimatedHours: number | null }) => {
      // Update sprint
      const { error: sprintError } = await supabase
        .from('sprints')
        .update({
          title: sprintData.title,
          deadline: sprintData.deadline,
          sprint_leader_id: sprintData.sprintLeaderId === 'unassigned' ? null : sprintData.sprintLeaderId,
          project_id: sprintData.projectId === 'none' ? null : sprintData.projectId,
          start_time: sprintData.startTime,
          end_time: sprintData.endTime,
          slot_date: sprintData.slotDate,
          estimated_hours: sprintData.estimatedHours,
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
    setSprintLeaderId('unassigned');
    setSelectedProjectId('none');
    setSelectedProjects([]);
    setSelectedTasks([]);
    setStartTime('');
    setEndTime('');
    setSlotDate(undefined);
    setEstimatedHours('');
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
      sprintLeaderId: sprintLeaderId,
      projectId: selectedProjectId,
      taskIds: selectedTasks,
      startTime: startTime || null,
      endTime: endTime || null,
      slotDate: slotDate ? format(slotDate, 'yyyy-MM-dd') : null,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null
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

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId !== 'none' && !selectedProjects.includes(projectId)) {
      setSelectedProjects(prev => [...prev, projectId]);
    }
  };

  const removeProject = (projectId: string) => {
    setSelectedProjects(prev => prev.filter(id => id !== projectId));
    // Remove tasks from this project from selected tasks
    const tasksToRemove = tasks.filter(task => task.project_id === projectId).map(task => task.id);
    setSelectedTasks(prev => prev.filter(id => !tasksToRemove.includes(id)));
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

          {/* Time Slot Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <Label className="text-sm font-medium">Time Slot (for Workload Calendar)</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slotDate">Slot Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !slotDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {slotDate ? format(slotDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={slotDate}
                      onSelect={setSlotDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g., 8.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="09:00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="17:00"
                />
              </div>
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="project">Add Project</Label>
            <Select value={selectedProjectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project to add" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a project</SelectItem>
                {projects
                  .filter(project => !selectedProjects.includes(project.id))
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {project.clients?.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Projects */}
          {selectedProjects.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Projects</Label>
              <div className="flex flex-wrap gap-2">
                {selectedProjects.map(projectId => {
                  const project = projects.find(p => p.id === projectId);
                  return (
                    <div key={projectId} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-md">
                      <span className="text-sm">{project?.name} - {project?.clients?.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-blue-100"
                        onClick={() => removeProject(projectId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Select Tasks (Not Started, On-Head, Targeted, Imp)</Label>
            {selectedProjects.length === 0 ? (
              <p className="text-sm text-gray-500">Please add at least one project to see available tasks</p>
            ) : (
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-sm text-gray-500">No available tasks for selected projects (statuses: Not Started, On-Head, Targeted, Imp)</p>
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
                            {task.projects?.name} - {task.projects?.clients?.name} • Status: {task.status}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
