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
import { Plus, Calendar, Clock, User, Building } from 'lucide-react';
import { convertISTToUTC } from '@/utils/timezoneUtils';

interface TaskCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentTaskId?: string;
  onSuccess?: () => void;
  defaultProjectName?: string;
}

const statusOptions = [
  'Not Started',
  'In Progress', 
  'On-Head',
  'Targeted',
  'Imp',
  'Completed'
];

const TaskCreateDialog = ({ isOpen, onClose, parentTaskId, onSuccess, defaultProjectName }: TaskCreateDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    status: 'Not Started',
    service: '',
    client_id: '',
    project_id: '',
    assignee_id: '',
    deadline: '',
    estimated_duration: '',
    reminder_datetime: '',
    slot_start_datetime: '',
    slot_end_datetime: ''
  });

  const queryClient = useQueryClient();

  // Fetch all services
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      console.log('Fetching services...');
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching services:', error);
        throw error;
      }
      console.log('Services fetched:', data);
      return data || [];
    },
  });

  // Fetch clients based on selected service
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-service', formData.service],
    queryFn: async () => {
      if (!formData.service) return [];
      
      console.log('Fetching clients for service:', formData.service);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          clients!inner(id, name)
        `)
        .eq('service', formData.service);

      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }

      // Extract unique clients properly
      const uniqueClientsMap = new Map();
      data?.forEach((project: any) => {
        const client = project.clients;
        if (client && !uniqueClientsMap.has(client.id)) {
          uniqueClientsMap.set(client.id, client);
        }
      });

      const uniqueClients = Array.from(uniqueClientsMap.values());
      console.log('Unique clients fetched for service:', uniqueClients);
      return uniqueClients;
    },
    enabled: !!formData.service,
  });

  // Fetch projects based on selected service and client OR default project
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-service-client', formData.service, formData.client_id, defaultProjectName],
    queryFn: async () => {
      // If defaultProjectName is provided, fetch that specific project
      if (defaultProjectName && !formData.service) {
        console.log('Fetching default project:', defaultProjectName);
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            clients!inner(name)
          `)
          .eq('name', defaultProjectName)
          .order('name');

        if (error) {
          console.error('Error fetching default project:', error);
          throw error;
        }
        console.log('Default project fetched:', data);
        return data || [];
      }

      if (!formData.service || !formData.client_id) return [];
      
      console.log('Fetching projects for service and client:', formData.service, formData.client_id);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          clients!inner(name)
        `)
        .eq('service', formData.service)
        .eq('client_id', formData.client_id)
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      console.log('Projects fetched:', data);
      return data || [];
    },
    enabled: !!formData.service && !!formData.client_id || !!defaultProjectName,
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

  // Set default project when defaultProjectName is provided and projects are loaded
  useEffect(() => {
    if (defaultProjectName && projects.length > 0 && !formData.project_id) {
      const defaultProject = projects.find(project => 
        project.name === defaultProjectName
      );
      
      if (defaultProject) {
        console.log('Setting default project:', defaultProject);
        setFormData(prev => ({
          ...prev,
          project_id: defaultProject.id
        }));
      }
    }
  }, [defaultProjectName, projects, formData.project_id]);
  // Set default assignee to "yugandhar" when employees are loaded
  useEffect(() => {
    if (employees.length > 0 && !formData.assignee_id) {
      const yugandharEmployee = employees.find(emp => 
        emp.name.toLowerCase().includes('yugandhar') || 
        emp.email.toLowerCase().includes('yugandhar')
      );
      
      if (yugandharEmployee) {
        console.log('Setting default assignee to yugandhar:', yugandharEmployee);
        setFormData(prev => ({
          ...prev,
          assignee_id: yugandharEmployee.id
        }));
      }
    }
  }, [employees, formData.assignee_id]);

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
        // Creating a main task - convert IST to UTC for storage
        const taskPayload = {
          name: taskData.name,
          status: taskData.status,
          project_id: taskData.project_id,
          assignee_id: taskData.assignee_id || null,
          deadline: taskData.deadline || null,
          estimated_duration: taskData.estimated_duration || null,
          reminder_datetime: taskData.reminder_datetime ? convertISTToUTC(taskData.reminder_datetime) : null,
          slot_start_datetime: taskData.slot_start_datetime ? convertISTToUTC(taskData.slot_start_datetime) : null,
          slot_end_datetime: taskData.slot_end_datetime ? convertISTToUTC(taskData.slot_end_datetime) : null,
        };

        console.log('Task payload with UTC conversion:', taskPayload);

        const { data, error } = await supabase
          .from('tasks')
          .insert([taskPayload])
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
      queryClient.invalidateQueries({ queryKey: ['todays-reminders'] });
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
    
    console.log('Form submitted with data (IST):', formData);
    
    if (!formData.name.trim()) {
      toast.error('Task name is required');
      return;
    }

    if (!parentTaskId && !formData.project_id) {
      toast.error('Project is required for main tasks');
      return;
    }

    // Validate time slot if both start and end are provided
    if (formData.slot_start_datetime && formData.slot_end_datetime) {
      if (new Date(formData.slot_start_datetime) >= new Date(formData.slot_end_datetime)) {
        toast.error('End time must be after start time');
        return;
      }
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

    console.log('Processed task data (before UTC conversion):', taskData);
    createTaskMutation.mutate(taskData);
  };

  const handleClose = () => {
    // Reset form but keep yugandhar as default assignee
    const yugandharEmployee = employees.find(emp => 
      emp.name.toLowerCase().includes('yugandhar') || 
      emp.email.toLowerCase().includes('yugandhar')
    );

    setFormData({
      name: '',
      status: 'Not Started',
      service: '',
      client_id: '',
      project_id: '',
      assignee_id: yugandharEmployee?.id || '',
      deadline: '',
      estimated_duration: '',
      reminder_datetime: '',
      slot_start_datetime: '',
      slot_end_datetime: ''
    });
    onClose();
  };

  // Handle service selection and reset dependent fields
  const handleServiceChange = (value: string) => {
    setFormData({
      ...formData,
      service: value,
      client_id: '',
      project_id: ''
    });
  };

  // Handle client selection and reset project
  const handleClientChange = (value: string) => {
    setFormData({
      ...formData,
      client_id: value,
      project_id: ''
    });
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
          {/* Cascading Filters - Only for main tasks WITHOUT default project */}
          {!parentTaskId && !defaultProjectName && (
            <>
              {/* Service Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Service *
                </Label>
                <Select 
                  value={formData.service} 
                  onValueChange={handleServiceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.name}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client *
                </Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={handleClientChange}
                  disabled={!formData.service}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.service ? "Select service first" : "Select client"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Project *
                </Label>
                <Select 
                  value={formData.project_id} 
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  disabled={!formData.service || !formData.client_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.service || !formData.client_id ? "Select service & client first" : "Select project"} />
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
            </>
          )}

          {/* Project Selection for QuickTask - simplified */}
          {defaultProjectName && !parentTaskId && (
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
          {!parentTaskId && (
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
                ? `Creating ${parentTaskId ? 'Subtask' : 'Task'}` 
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
