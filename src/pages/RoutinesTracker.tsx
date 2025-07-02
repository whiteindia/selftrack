
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, ChevronDown, ChevronRight, ChevronLeft, Filter } from 'lucide-react';
import { format, subDays, addDays, startOfWeek, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import RoutineFormDialog from '@/components/routines/RoutineFormDialog';
import RoutineMatrix from '@/components/routines/RoutineMatrix';
import RoutineTable from '@/components/routines/RoutineTable';
import RoutineCalendar from '@/components/routines/RoutineCalendar';

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

interface RoutineCompletion {
  routine_id: string;
  completion_date: string;
}

const RoutinesTracker = () => {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());
  const [dateOffset, setDateOffset] = useState(0); // 0 = current week, -1 = previous week, etc.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'matrix' | 'table' | 'calendar'>('calendar'); // Changed default to calendar
  
  const queryClient = useQueryClient();

  // Generate last 7 days array based on offset
  const last7Days = useMemo(() => {
    const baseDate = addDays(new Date(), dateOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      return subDays(baseDate, 6 - i);
    });
  }, [dateOffset]);

  // Fetch routines
  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routines')
        .select(`
          *,
          client:clients!routines_client_id_fkey(id, name),
          project:projects!routines_project_id_fkey(id, name)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Routine[];
    }
  });

  // Fetch routine completions for the current 7 days period
  const { data: completions = [] } = useQuery({
    queryKey: ['routine-completions', last7Days[0].toISOString().split('T')[0], last7Days[6].toISOString().split('T')[0]],
    queryFn: async () => {
      const startDate = last7Days[0].toISOString().split('T')[0];
      const endDate = last7Days[6].toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('routine_completions')
        .select('routine_id, completion_date')
        .gte('completion_date', startDate)
        .lte('completion_date', endDate);

      if (error) throw error;
      return data as RoutineCompletion[];
    }
  });

  // Fetch clients for filter
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Toggle completion mutation
  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ routineId, date, isCompleted }: { routineId: string; date: string; isCompleted: boolean }) => {
      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from('routine_completions')
          .delete()
          .eq('routine_id', routineId)
          .eq('completion_date', date);
        if (error) throw error;
      } else {
        // Add completion
        const { error } = await supabase
          .from('routine_completions')
          .insert({
            routine_id: routineId,
            completion_date: date,
            user_id: (await supabase.auth.getUser()).data.user?.id || ''
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-completions'] });
      toast.success('Routine updated successfully');
    },
    onError: (error) => {
      console.error('Toggle completion error:', error);
      toast.error('Failed to update routine');
    }
  });

  // Delete routine mutation
  const deleteRoutineMutation = useMutation({
    mutationFn: async (routineId: string) => {
      const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', routineId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      toast.success('Routine deleted successfully');
    },
    onError: (error) => {
      console.error('Delete routine error:', error);
      toast.error('Failed to delete routine');
    }
  });

  // Get available clients and projects based on routines
  const availableClients = useMemo(() => {
    const clientMap = new Map();
    routines.forEach(routine => {
      if (!clientMap.has(routine.client.id)) {
        clientMap.set(routine.client.id, routine.client);
      }
    });
    return Array.from(clientMap.values());
  }, [routines]);

  const availableProjects = useMemo(() => {
    if (!selectedClient) return [];
    const projectMap = new Map();
    routines
      .filter(routine => routine.client.id === selectedClient)
      .forEach(routine => {
        if (!projectMap.has(routine.project.id)) {
          projectMap.set(routine.project.id, routine.project);
        }
      });
    return Array.from(projectMap.values());
  }, [routines, selectedClient]);

  // Base filter for all views
  const baseFilteredRoutines = useMemo(() => {
    return routines.filter(routine => {
      if (selectedClient && routine.client.id !== selectedClient) return false;
      if (selectedProject && routine.project.id !== selectedProject) return false;
      if (searchTerm && !routine.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [routines, selectedClient, selectedProject, searchTerm]);

  // Calendar view: Show only events with time slots
  const calendarRoutines = useMemo(() => {
    return baseFilteredRoutines.filter(routine => 
      routine.preferred_slot_start && routine.preferred_slot_end
    );
  }, [baseFilteredRoutines]);

  // Matrix view: Show only events with preferred days
  const matrixRoutines = useMemo(() => {
    return baseFilteredRoutines.filter(routine => 
      routine.preferred_days && routine.preferred_days.length > 0
    );
  }, [baseFilteredRoutines]);

  // Table view: Show all events
  const tableRoutines = baseFilteredRoutines;

  // Group routines by client for matrix view
  const routinesByClient = useMemo(() => {
    return matrixRoutines.reduce((acc, routine) => {
      const clientName = routine.client.name;
      if (!acc[clientName]) acc[clientName] = [];
      acc[clientName].push(routine);
      return acc;
    }, {} as Record<string, Routine[]>);
  }, [matrixRoutines]);

  const handleClientClick = (clientId: string) => {
    if (selectedClient === clientId) {
      setSelectedClient(null);
      setSelectedProject(null);
    } else {
      setSelectedClient(clientId);
      setSelectedProject(null);
    }
  };

  const handleProjectClick = (projectId: string) => {
    if (selectedProject === projectId) {
      setSelectedProject(null);
    } else {
      setSelectedProject(projectId);
    }
  };

  const toggleClient = (clientName: string) => {
    const newCollapsed = new Set(collapsedClients);
    if (newCollapsed.has(clientName)) {
      newCollapsed.delete(clientName);
    } else {
      newCollapsed.add(clientName);
    }
    setCollapsedClients(newCollapsed);
  };

  const handleToggleCompletion = (routineId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const isCompleted = completions.some(c => c.routine_id === routineId && c.completion_date === dateStr);
    toggleCompletionMutation.mutate({ routineId, date: dateStr, isCompleted });
  };

  const handleEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setIsFormOpen(true);
  };

  const handleDeleteRoutine = (routineId: string) => {
    if (confirm('Are you sure you want to delete this routine?')) {
      deleteRoutineMutation.mutate(routineId);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingRoutine(null);
  };

  const handlePreviousWeek = () => {
    setDateOffset(dateOffset - 1);
  };

  const handleNextWeek = () => {
    setDateOffset(dateOffset + 1);
  };

  const handleCurrentWeek = () => {
    setDateOffset(0);
  };

  const isCurrentWeek = dateOffset === 0;
  const isFutureWeek = dateOffset > 0;

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Routines Tracker</h1>
          <Button onClick={() => setIsFormOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Routine
          </Button>
        </div>

        {/* Collapsible Filters */}
        <Card>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <CardTitle className="text-lg">Filters</CardTitle>
                  </div>
                  {filtersOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {/* Client Filter Buttons */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Clients</h4>
                  <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                    {availableClients.map(client => (
                      <Button
                        key={client.id}
                        variant={selectedClient === client.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleClientClick(client.id)}
                        className="whitespace-nowrap"
                      >
                        {client.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Project Filter Buttons - Only show if client is selected */}
                {selectedClient && availableProjects.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Projects</h4>
                    <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                      {availableProjects.map(project => (
                        <Button
                          key={project.id}
                          variant={selectedProject === project.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleProjectClick(project.id)}
                          className="whitespace-nowrap"
                        >
                          {project.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search routines..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* View Mode Tabs */}
        <Card>
          <CardContent className="p-4">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'matrix' | 'table' | 'calendar')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="matrix">Matrix View</TabsTrigger>
                <TabsTrigger value="table">Table View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="calendar" className="mt-6">
                <RoutineCalendar
                  routines={calendarRoutines}
                  completions={completions}
                  onToggleCompletion={handleToggleCompletion}
                  onEditRoutine={handleEditRoutine}
                  onDeleteRoutine={handleDeleteRoutine}
                />
              </TabsContent>
              
              <TabsContent value="matrix" className="mt-6">
                {/* Date Navigation for Matrix View */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousWeek}
                        className="flex items-center gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous Week
                      </Button>
                      
                      <div className="text-center flex-1">
                        <div className="text-sm text-gray-600">
                          {format(last7Days[0], 'MMM d')} - {format(last7Days[6], 'MMM d, yyyy')}
                        </div>
                        {!isCurrentWeek && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCurrentWeek}
                            className="h-6 w-6 p-0 mt-1"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextWeek}
                        className="flex items-center gap-2"
                      >
                        Next Week
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Matrix View Content */}
                <div className="space-y-4">
                  {Object.keys(routinesByClient).length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-gray-500">
                        No routines found. Click "Add Routine" to get started.
                      </CardContent>
                    </Card>
                  ) : (
                    Object.entries(routinesByClient).map(([clientName, clientRoutines]) => (
                      <Card key={clientName}>
                        <Collapsible
                          open={!collapsedClients.has(clientName)}
                          onOpenChange={() => toggleClient(clientName)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <CardTitle className="text-lg">
                                    Client: {clientName}
                                  </CardTitle>
                                  <span className="text-sm text-gray-500">
                                    {clientRoutines.length} routine{clientRoutines.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {collapsedClients.has(clientName) ? (
                                  <ChevronRight className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <RoutineMatrix
                                routines={clientRoutines}
                                last7Days={last7Days}
                                completions={completions}
                                onToggleCompletion={handleToggleCompletion}
                                onEditRoutine={handleEditRoutine}
                                onDeleteRoutine={handleDeleteRoutine}
                              />
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="table" className="mt-6">
                <RoutineTable
                  routines={tableRoutines}
                  last7Days={last7Days}
                  completions={completions}
                  onToggleCompletion={handleToggleCompletion}
                  onEditRoutine={handleEditRoutine}
                  onDeleteRoutine={handleDeleteRoutine}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <RoutineFormDialog
          open={isFormOpen}
          onOpenChange={handleFormClose}
          clients={clients}
          editingRoutine={editingRoutine}
        />
      </div>
    </Navigation>
  );
};

export default RoutinesTracker;
