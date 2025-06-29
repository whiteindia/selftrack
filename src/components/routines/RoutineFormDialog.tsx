
import React, { useState } from 'react';
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
}

interface RoutineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
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

const RoutineFormDialog: React.FC<RoutineFormDialogProps> = ({
  open,
  onOpenChange,
  clients
}) => {
  const [formData, setFormData] = useState({
    client_id: '',
    project_id: '',
    title: '',
    frequency: '',
    preferred_days: [] as string[],
    start_date: new Date()
  });

  const queryClient = useQueryClient();

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

  // Create routine mutation
  const createRoutineMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('routines')
        .insert({
          client_id: data.client_id,
          project_id: data.project_id,
          title: data.title,
          frequency: data.frequency,
          preferred_days: data.preferred_days.length > 0 ? data.preferred_days : null,
          start_date: data.start_date.toISOString().split('T')[0]
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      toast.success('Routine created successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Create routine error:', error);
      toast.error('Failed to create routine');
    }
  });

  const resetForm = () => {
    setFormData({
      client_id: '',
      project_id: '',
      title: '',
      frequency: '',
      preferred_days: [],
      start_date: new Date()
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.project_id || !formData.title || !formData.frequency) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate preferred days based on frequency
    if (['weekly_once', 'weekly_twice', 'monthly_once', 'monthly_twice'].includes(formData.frequency) && formData.preferred_days.length === 0) {
      toast.error('Please select preferred days for this frequency');
      return;
    }

    if (formData.frequency === 'weekly_twice' && formData.preferred_days.length !== 2) {
      toast.error('Please select exactly 2 days for Weekly Twice frequency');
      return;
    }

    createRoutineMutation.mutate(formData);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Routine</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
                  {formData.start_date ? format(formData.start_date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.start_date}
                  onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRoutineMutation.isPending}>
              {createRoutineMutation.isPending ? 'Creating...' : 'Create Routine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoutineFormDialog;
