
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
}

interface Routine {
  id: string;
  title: string;
  frequency: string;
  preferred_days: string[] | null;
  start_date: string;
  preferred_slot_start?: string | null;
  preferred_slot_end?: string | null;
  client: { name: string; id: string };
  project: { name: string; id: string };
}

interface RoutineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  editingRoutine?: Routine | null;
}

const DAYS_OF_WEEK = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

// Period options for frequency
const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'halfyearly', label: 'Half-yearly' },
  { value: 'annually', label: 'Annually' }
];

const RoutineFormDialog = ({ open, onOpenChange, clients, editingRoutine }: RoutineFormDialogProps) => {
  const [formData, setFormData] = useState({
    title: '',
    frequency_times: '1',
    frequency_period: 'weekly',
    client_id: '',
    project_id: '',
    preferred_days: [] as string[],
    start_date: new Date().toISOString().split('T')[0],
    preferred_slot_start: '',
    preferred_slot_end: ''
  });

  const queryClient = useQueryClient();

  // Reset form when dialog opens/closes or when editing routine changes
  useEffect(() => {
    console.log('Effect triggered - editingRoutine:', editingRoutine);
    console.log('Effect triggered - open:', open);
    
    if (editingRoutine) {
      console.log('Full editingRoutine object:', JSON.stringify(editingRoutine, null, 2));
      console.log('editingRoutine.client:', editingRoutine.client);
      console.log('editingRoutine.project:', editingRoutine.project);
      
      // Check if we have client and project data
      const clientId = editingRoutine.client?.id || '';
      const projectId = editingRoutine.project?.id || '';
      
      console.log('Extracted clientId:', clientId);
      console.log('Extracted projectId:', projectId);
      
      // Parse existing frequency format (e.g., "2_weekly" -> times: "2", period: "weekly")
      const frequencyParts = editingRoutine.frequency?.split('_') || ['1', 'weekly'];
      const times = frequencyParts[0] || '1';
      const period = frequencyParts[1] || 'weekly';
      
      const newFormData = {
        title: editingRoutine.title || '',
        frequency_times: times,
        frequency_period: period,
        client_id: clientId,
        project_id: projectId,
        preferred_days: editingRoutine.preferred_days || [],
        start_date: editingRoutine.start_date || new Date().toISOString().split('T')[0],
        preferred_slot_start: editingRoutine.preferred_slot_start || '',
        preferred_slot_end: editingRoutine.preferred_slot_end || ''
      };
      
      console.log('Setting form data to:', newFormData);
      setFormData(newFormData);
    } else if (open) {
      console.log('Opening form for new routine - resetting form data');
      setFormData({
        title: '',
        frequency_times: '1',
        frequency_period: 'weekly',
        client_id: '',
        project_id: '',
        preferred_days: [],
        start_date: new Date().toISOString().split('T')[0],
        preferred_slot_start: '',
        preferred_slot_end: ''
      });
    }
  }, [editingRoutine, open]);

  // Fetch projects based on selected client
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-routine', formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return [];
      console.log('Fetching projects for client_id:', formData.client_id);
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('client_id', formData.client_id)
        .order('name');
      if (error) throw error;
      console.log('Fetched projects:', data);
      return data as Project[];
    },
    enabled: !!formData.client_id
  });

  // Create/Update routine mutation
  const saveRoutineMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('Saving routine with data:', data);
      
      // Combine frequency_times and frequency_period into the format "2_weekly"
      const frequency = `${data.frequency_times}_${data.frequency_period}`;
      
      const routineData = {
        title: data.title,
        frequency: frequency,
        client_id: data.client_id,
        project_id: data.project_id,
        preferred_days: data.preferred_days.length > 0 ? data.preferred_days : null,
        start_date: data.start_date,
        preferred_slot_start: data.preferred_slot_start || null,
        preferred_slot_end: data.preferred_slot_end || null
      };

      console.log('Processed routine data:', routineData);

      if (editingRoutine) {
        // Update existing routine
        const { data: result, error } = await supabase
          .from('routines')
          .update(routineData)
          .eq('id', editingRoutine.id)
          .select()
          .single();
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        return result;
      } else {
        // Create new routine
        const { data: result, error } = await supabase
          .from('routines')
          .insert(routineData)
          .select()
          .single();
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      toast.success(editingRoutine ? 'Routine updated successfully!' : 'Routine created successfully!');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Save routine error:', error);
      toast.error(editingRoutine ? 'Failed to update routine' : 'Failed to create routine');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission with data:', formData);
    
    if (!formData.title.trim()) {
      toast.error('Please enter a routine title');
      return;
    }
    if (!formData.frequency_times.trim() || parseInt(formData.frequency_times) < 1) {
      toast.error('Please enter a valid number of times');
      return;
    }
    if (!formData.frequency_period.trim()) {
      toast.error('Please select a period');
      return;
    }
    if (!formData.client_id) {
      toast.error('Please select a client');
      return;
    }
    if (!formData.project_id) {
      toast.error('Please select a project');
      return;
    }
    
    console.log('Validation passed, calling mutation');
    saveRoutineMutation.mutate(formData);
  };

  const handlePreferredDayToggle = (day: string) => {
    const newDays = formData.preferred_days.includes(day)
      ? formData.preferred_days.filter(d => d !== day)
      : [...formData.preferred_days, day];
    
    setFormData({ ...formData, preferred_days: newDays });
  };

  // Convert string date to Date object for Calendar component
  const selectedDate = formData.start_date ? new Date(formData.start_date) : undefined;

  console.log('Current formData state:', formData);

  // Force re-render key when formData changes significantly (excluding title to prevent cursor issues)
  const formKey = `${formData.client_id}-${formData.project_id}-${editingRoutine?.id || 'new'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRoutine ? 'Edit Routine' : 'Add New Routine'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4" key={formKey}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select 
                value={formData.client_id} 
                onValueChange={(value) => {
                  console.log('Client changed to:', value);
                  setFormData({ ...formData, client_id: value, project_id: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select 
                value={formData.project_id} 
                onValueChange={(value) => {
                  console.log('Project changed to:', value);
                  setFormData({ ...formData, project_id: value });
                }} 
                disabled={!formData.client_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Routine Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                console.log('Title changed to:', e.target.value);
                setFormData({ ...formData, title: e.target.value });
              }}
              placeholder="Enter routine title"
            />
          </div>

          <div className="space-y-2">
            <Label>Frequency *</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency-times" className="text-sm text-gray-600">Number of times</Label>
                <Input
                  id="frequency-times"
                  type="number"
                  min="1"
                  value={formData.frequency_times}
                  onChange={(e) => {
                    console.log('Frequency times changed to:', e.target.value);
                    setFormData({ ...formData, frequency_times: e.target.value });
                  }}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency-period" className="text-sm text-gray-600">Period</Label>
                <Select 
                  value={formData.frequency_period} 
                  onValueChange={(value) => {
                    console.log('Frequency period changed to:', value);
                    setFormData({ ...formData, frequency_period: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Choose how often this routine should be performed (e.g., 2 times weekly)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Preferred Days (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={day}
                    checked={formData.preferred_days.includes(day)}
                    onCheckedChange={() => handlePreferredDayToggle(day)}
                  />
                  <Label htmlFor={day} className="text-sm">
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500">Select specific days when this routine should be performed</p>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.start_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.start_date ? format(new Date(formData.start_date), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setFormData({ ...formData, start_date: date.toISOString().split('T')[0] })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Preferred Time Slot (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slot-start" className="text-sm text-gray-600">Start Time</Label>
                <Input
                  id="slot-start"
                  type="time"
                  value={formData.preferred_slot_start}
                  onChange={(e) => setFormData({ ...formData, preferred_slot_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-end" className="text-sm text-gray-600">End Time</Label>
                <Input
                  id="slot-end"
                  type="time"
                  value={formData.preferred_slot_end}
                  onChange={(e) => setFormData({ ...formData, preferred_slot_end: e.target.value })}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">Set a preferred time window for this routine</p>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saveRoutineMutation.isPending}
            >
              {saveRoutineMutation.isPending 
                ? (editingRoutine ? 'Updating...' : 'Creating...') 
                : (editingRoutine ? 'Update Routine' : 'Create Routine')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoutineFormDialog;
