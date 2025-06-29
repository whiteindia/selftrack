
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
  client: { name: string; id: string };
  project: { name: string; id: string };
}

interface RoutineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  editingRoutine?: Routine | null;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly_once', label: 'Weekly Once' },
  { value: 'weekly_twice', label: 'Weekly Twice' },
  { value: 'monthly_once', label: 'Monthly Once' },
  { value: 'monthly_twice', label: 'Monthly Twice' },
  { value: 'yearly_once', label: 'Yearly Once' }
];

const DAYS_OF_WEEK = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

const RoutineFormDialog = ({ open, onOpenChange, clients, editingRoutine }: RoutineFormDialogProps) => {
  const [formData, setFormData] = useState({
    title: '',
    frequency: 'daily',
    client_id: '',
    project_id: '',
    preferred_days: [] as string[],
    start_date: new Date().toISOString().split('T')[0]
  });

  const queryClient = useQueryClient();

  // Reset form when dialog opens/closes or when editing routine changes
  useEffect(() => {
    if (editingRoutine) {
      console.log('Setting form data for editing routine:', editingRoutine);
      setFormData({
        title: editingRoutine.title,
        frequency: editingRoutine.frequency,
        client_id: editingRoutine.client.id,
        project_id: editingRoutine.project.id,
        preferred_days: editingRoutine.preferred_days || [],
        start_date: editingRoutine.start_date
      });
    } else if (open) {
      setFormData({
        title: '',
        frequency: 'daily',
        client_id: '',
        project_id: '',
        preferred_days: [],
        start_date: new Date().toISOString().split('T')[0]
      });
    }
  }, [editingRoutine, open]);

  // Fetch projects based on selected client
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-routine', formData.client_id],
    queryFn: async () => {
      if (!formData.client_id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('client_id', formData.client_id)
        .order('name');
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!formData.client_id
  });

  // Create/Update routine mutation
  const saveRoutineMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const routineData = {
        title: data.title,
        frequency: data.frequency,
        client_id: data.client_id,
        project_id: data.project_id,
        preferred_days: data.preferred_days.length > 0 ? data.preferred_days : null,
        start_date: data.start_date
      };

      if (editingRoutine) {
        // Update existing routine
        const { data: result, error } = await supabase
          .from('routines')
          .update(routineData)
          .eq('id', editingRoutine.id)
          .select()
          .single();
        if (error) throw error;
        return result;
      } else {
        // Create new routine
        const { data: result, error } = await supabase
          .from('routines')
          .insert(routineData)
          .select()
          .single();
        if (error) throw error;
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
    if (!formData.title.trim()) {
      toast.error('Please enter a routine title');
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
    saveRoutineMutation.mutate(formData);
  };

  const handlePreferredDayToggle = (day: string) => {
    const maxDays = formData.frequency === 'weekly_twice' ? 2 : 
                   formData.frequency === 'monthly_twice' ? 2 : 1;
    
    const newDays = formData.preferred_days.includes(day)
      ? formData.preferred_days.filter(d => d !== day)
      : formData.preferred_days.length < maxDays
        ? [...formData.preferred_days, day]
        : formData.preferred_days;
    
    setFormData({ ...formData, preferred_days: newDays });
  };

  const shouldShowPreferredDays = ['weekly_once', 'weekly_twice', 'monthly_once', 'monthly_twice'].includes(formData.frequency);

  // Convert string date to Date object for Calendar component
  const selectedDate = formData.start_date ? new Date(formData.start_date) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingRoutine ? 'Edit Routine' : 'Add New Routine'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value, project_id: '' })}>
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
              <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })} disabled={!formData.client_id}>
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
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter routine title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency *</Label>
            <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value, preferred_days: [] })}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {shouldShowPreferredDays && (
            <div className="space-y-2">
              <Label>Preferred Days *</Label>
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
              {formData.frequency === 'weekly_twice' && (
                <p className="text-sm text-gray-500">Select exactly 2 days</p>
              )}
            </div>
          )}

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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="w-full"
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
