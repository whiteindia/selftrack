import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  service: string;
  clients: {
    name: string;
  };
}

interface TimetableAssignment {
  id: string;
  day_of_week: number;
  shift_number: number;
  project_id: string;
  project: Project;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHIFT_TIMES = [
  '00:00 - 04:00',
  '04:00 - 08:00', 
  '08:00 - 12:00',
  '12:00 - 16:00',
  '16:00 - 20:00',
  '20:00 - 24:00'
];

export default function WeeklyTimetable() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<{ day: number; shift: number } | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mobileDayOffset, setMobileDayOffset] = useState(0); // For mobile 2-day navigation
  
  const queryClient = useQueryClient();
  const weekStart = startOfWeek(currentWeek);

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          service,
          clients!inner(name)
        `)
        .eq('status', 'Active');
      
      if (error) throw error;
      return data as Project[];
    }
  });

  // Fetch timetable assignments for current week
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['timetable-assignments', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      // First get assignments
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('timetable_assignments')
        .select('*')
        .eq('week_start_date', format(weekStart, 'yyyy-MM-dd'));
      
      if (assignmentError) throw assignmentError;
      if (!assignmentData || assignmentData.length === 0) return [];

      // Then get projects for those assignments
      const projectIds = assignmentData.map(a => a.project_id);
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          service,
          clients!inner(name)
        `)
        .in('id', projectIds);
      
      if (projectError) throw projectError;

      // Combine the data
      const result = assignmentData.map(assignment => ({
        ...assignment,
        project: projectData?.find(p => p.id === assignment.project_id) || {
          id: assignment.project_id,
          name: 'Unknown Project',
          service: 'Unknown',
          clients: { name: 'Unknown' }
        }
      }));

      return result as TimetableAssignment[];
    }
  });

  // Create/update assignment mutation
  const assignmentMutation = useMutation({
    mutationFn: async ({ dayOfWeek, shiftNumber, projectId }: { dayOfWeek: number; shiftNumber: number; projectId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('timetable_assignments')
        .upsert({
          user_id: user.id,
          week_start_date: format(weekStart, 'yyyy-MM-dd'),
          day_of_week: dayOfWeek,
          shift_number: shiftNumber,
          project_id: projectId
        }, {
          onConflict: 'user_id,week_start_date,day_of_week,shift_number'
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-assignments'] });
      toast.success('Assignment updated successfully');
      setIsDialogOpen(false);
      setSelectedProject('');
    },
    onError: (error) => {
      toast.error('Failed to update assignment: ' + error.message);
    }
  });

  // Delete assignment mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ dayOfWeek, shiftNumber }: { dayOfWeek: number; shiftNumber: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('timetable_assignments')
        .delete()
        .eq('user_id', user.id)
        .eq('week_start_date', format(weekStart, 'yyyy-MM-dd'))
        .eq('day_of_week', dayOfWeek)
        .eq('shift_number', shiftNumber);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-assignments'] });
      toast.success('Assignment removed successfully');
    },
    onError: (error) => {
      toast.error('Failed to remove assignment: ' + error.message);
    }
  });

  const handleCellClick = (dayOfWeek: number, shiftNumber: number) => {
    const existingAssignment = assignments.find(
      a => a.day_of_week === dayOfWeek && a.shift_number === shiftNumber
    );

    if (existingAssignment) {
      // If there's an existing assignment, ask user if they want to remove or change it
      setSelectedCell({ day: dayOfWeek, shift: shiftNumber });
      setSelectedProject(existingAssignment.project_id);
      setIsDialogOpen(true);
    } else {
      // If no assignment, open dialog to select project
      setSelectedCell({ day: dayOfWeek, shift: shiftNumber });
      setSelectedProject('');
      setIsDialogOpen(true);
    }
  };

  const handleSaveAssignment = () => {
    if (selectedCell && selectedProject) {
      assignmentMutation.mutate({
        dayOfWeek: selectedCell.day,
        shiftNumber: selectedCell.shift,
        projectId: selectedProject
      });
    }
  };

  const handleRemoveAssignment = () => {
    if (selectedCell) {
      deleteMutation.mutate({
        dayOfWeek: selectedCell.day,
        shiftNumber: selectedCell.shift
      });
      setIsDialogOpen(false);
    }
  };

  const getAssignmentForCell = (dayOfWeek: number, shiftNumber: number) => {
    return assignments.find(
      a => a.day_of_week === dayOfWeek && a.shift_number === shiftNumber
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    setMobileDayOffset(0); // Reset mobile offset when changing weeks
  };

  const navigateMobileDays = (direction: 'prev' | 'next') => {
    setMobileDayOffset(prev => {
      const newOffset = direction === 'next' ? prev + 2 : prev - 2;
      // Keep within bounds (0-6 for days of week)
      return Math.max(0, Math.min(5, newOffset));
    });
  };

  // Get days to display based on viewport
  const getDisplayDays = () => {
    return DAYS_OF_WEEK.slice(mobileDayOffset, mobileDayOffset + 2);
  };

  const getMobileDayIndices = () => {
    return [mobileDayOffset, mobileDayOffset + 1].filter(i => i < 7);
  };

  if (projectsLoading || assignmentsLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Weekly Timetable</h1>
              <p className="text-muted-foreground mt-2">
                Week of {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </p>
            </div>
            
            {/* Desktop week navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>
                Today
              </Button>
              <Button variant="outline" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile navigation controls */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Mobile day navigation */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateMobileDays('prev')}
                disabled={mobileDayOffset === 0}
              >
                ←
              </Button>
              <span className="text-sm font-medium px-2">
                {getDisplayDays().map((day, index) => (
                  <span key={day}>
                    {day.slice(0, 3)}
                    {index < getDisplayDays().length - 1 && ' • '}
                  </span>
                ))}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateMobileDays('next')}
                disabled={mobileDayOffset >= 5}
              >
                →
              </Button>
            </div>
          </div>
        </div>

        {/* Timetable Grid */}
        <Card className="p-3 md:p-6">
          {/* Desktop Grid - 7 days */}
          <div className="hidden md:grid grid-cols-8 gap-1">
            {/* Header Row */}
            <div className="p-3 font-medium text-center bg-muted rounded">
              Time
            </div>
            {DAYS_OF_WEEK.map((day, dayIndex) => (
              <div key={day} className="p-3 font-medium text-center bg-muted rounded">
                <div className="text-sm">{day}</div>
                <div className="text-xs text-muted-foreground">
                  {format(addDays(weekStart, dayIndex), 'MMM d')}
                </div>
              </div>
            ))}

            {/* Shift Rows */}
            {SHIFT_TIMES.map((time, shiftIndex) => (
              <React.Fragment key={shiftIndex}>
                {/* Time Label */}
                <div className="p-3 text-sm font-medium text-center bg-muted rounded flex items-center justify-center">
                  {time}
                </div>
                
                {/* Day Cells */}
                {DAYS_OF_WEEK.map((_, dayIndex) => {
                  const assignment = getAssignmentForCell(dayIndex, shiftIndex + 1);
                  
                  return (
                    <div
                      key={`${dayIndex}-${shiftIndex}`}
                      className="min-h-[80px] border-2 border-dashed border-border rounded cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors p-2 flex flex-col"
                      onClick={() => handleCellClick(dayIndex, shiftIndex + 1)}
                    >
                      {assignment ? (
                        <div className="text-xs space-y-1">
                          <Badge variant="secondary" className="text-[10px] px-1 py-0.5">
                            {assignment.project.service}
                          </Badge>
                          <div className="font-medium text-[10px] text-muted-foreground">
                            {assignment.project.clients.name}
                          </div>
                          <div className="font-semibold text-[11px] text-foreground">
                            {assignment.project.name}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile Grid - 2 days */}
          <div className="md:hidden grid grid-cols-3 gap-1">
            {/* Header Row */}
            <div className="p-2 font-medium text-center bg-muted rounded text-xs">
              Time
            </div>
            {getMobileDayIndices().map((dayIndex) => (
              <div key={dayIndex} className="p-2 font-medium text-center bg-muted rounded">
                <div className="text-xs">{DAYS_OF_WEEK[dayIndex]}</div>
                <div className="text-[10px] text-muted-foreground">
                  {format(addDays(weekStart, dayIndex), 'MMM d')}
                </div>
              </div>
            ))}

            {/* Shift Rows */}
            {SHIFT_TIMES.map((time, shiftIndex) => (
              <React.Fragment key={shiftIndex}>
                {/* Time Label */}
                <div className="p-2 text-[10px] font-medium text-center bg-muted rounded flex items-center justify-center">
                  {time}
                </div>
                
                {/* Day Cells */}
                {getMobileDayIndices().map((dayIndex) => {
                  const assignment = getAssignmentForCell(dayIndex, shiftIndex + 1);
                  
                  return (
                    <div
                      key={`${dayIndex}-${shiftIndex}`}
                      className="min-h-[70px] border-2 border-dashed border-border rounded cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors p-1 flex flex-col"
                      onClick={() => handleCellClick(dayIndex, shiftIndex + 1)}
                    >
                      {assignment ? (
                        <div className="text-[9px] space-y-0.5">
                          <Badge variant="secondary" className="text-[8px] px-0.5 py-0">
                            {assignment.project.service.slice(0, 8)}...
                          </Badge>
                          <div className="font-medium text-[8px] text-muted-foreground">
                            {assignment.project.clients.name.slice(0, 10)}...
                          </div>
                          <div className="font-semibold text-[9px] text-foreground">
                            {assignment.project.name.slice(0, 15)}...
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Plus className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* Project Selection Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCell ? 
                  `Assign Project - ${DAYS_OF_WEEK[selectedCell.day]} ${SHIFT_TIMES[selectedCell.shift - 1]}` :
                  'Assign Project'
                }
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex flex-col">
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {project.service} • {project.clients.name}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                {selectedProject && selectedCell && getAssignmentForCell(selectedCell.day, selectedCell.shift) && (
                  <Button 
                    variant="destructive" 
                    onClick={handleRemoveAssignment}
                    disabled={deleteMutation.isPending}
                  >
                    Remove
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveAssignment}
                  disabled={!selectedProject || assignmentMutation.isPending}
                >
                  {assignmentMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Navigation>
  );
}