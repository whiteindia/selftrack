import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar as CalendarIcon, Clock, Filter, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface TimeEvent {
  id: string;
  title: string;
  deadline: Date;
  project_id?: string;
  client_id?: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
  clients: {
    id: string;
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
}

const TimeUntil = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimeEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    deadline: new Date(),
    project_id: '',
    client_id: ''
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEditCalendar, setShowEditCalendar] = useState(false);

  // Fetch time events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['time-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_events')
        .select('*')
        .order('deadline', { ascending: true });
      
      if (error) throw error;
      
      return data.map(event => ({
        ...event,
        deadline: new Date(event.deadline)
      })) as TimeEvent[];
    },
    enabled: !!user
  });

  // Fetch all clients for the add dialog
  const { data: allClients = [] } = useQuery({
    queryKey: ['all-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as Client[];
    }
  });

  // Fetch all projects for the add dialog
  const { data: allProjects = [] } = useQuery({
    queryKey: ['all-projects-with-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          client_id,
          clients (
            id,
            name
          )
        `)
        .order('name');
      if (error) throw error;
      return data as Project[];
    }
  });

  // Get unique clients that have events
  const clientsWithEvents = React.useMemo(() => {
    const clientIds = new Set(events.filter(e => e.client_id).map(e => e.client_id));
    return allClients.filter(client => clientIds.has(client.id));
  }, [events, allClients]);

  // Get unique projects that have events
  const projectsWithEvents = React.useMemo(() => {
    const projectIds = new Set(events.filter(e => e.project_id).map(e => e.project_id));
    return allProjects.filter(project => projectIds.has(project.id));
  }, [events, allProjects]);

  // Add event mutation
  const addEventMutation = useMutation({
    mutationFn: async (eventData: typeof newEvent) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('time_events')
        .insert({
          title: eventData.title,
          deadline: eventData.deadline.toISOString(),
          project_id: eventData.project_id || null,
          client_id: eventData.client_id || null,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-events'] });
      toast.success('Event added successfully!');
      setShowAddDialog(false);
      setNewEvent({
        title: '',
        deadline: new Date(),
        project_id: '',
        client_id: ''
      });
    },
    onError: (error) => {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('time_events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-events'] });
      toast.success('Event deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, eventData }: { id: string; eventData: typeof newEvent }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('time_events')
        .update({
          title: eventData.title,
          deadline: eventData.deadline.toISOString(),
          project_id: eventData.project_id || null,
          client_id: eventData.client_id || null
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-events'] });
      toast.success('Event updated successfully!');
      setShowEditDialog(false);
      setEditingEvent(null);
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  });

  // Filter projects based on selected client (for add dialog)
  const filteredAllProjects = newEvent.client_id 
    ? allProjects.filter(p => p.client_id === newEvent.client_id)
    : allProjects;

  // Filter projects with events based on selected client (for filters)
  const filteredProjectsWithEvents = selectedClient 
    ? projectsWithEvents.filter(p => p.client_id === selectedClient)
    : projectsWithEvents;

  // Filter and sort events based on selected filters
  const filteredEvents = React.useMemo(() => {
    let filtered = events.filter(event => {
      if (selectedClient && event.client_id !== selectedClient) return false;
      if (selectedProject && event.project_id !== selectedProject) return false;
      return true;
    });

    // Sort events: overdue first, then by deadline
    return filtered.sort((a, b) => {
      const now = new Date();
      const aOverdue = a.deadline.getTime() < now.getTime();
      const bOverdue = b.deadline.getTime() < now.getTime();
      
      // If one is overdue and the other isn't, overdue comes first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // If both have same overdue status, sort by deadline
      return a.deadline.getTime() - b.deadline.getTime();
    });
  }, [events, selectedClient, selectedProject]);

  const calculateTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const isPast = diff < 0;
    const absDiff = Math.abs(diff);

    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      isPast,
      formatted: `${days}D ${hours}H ${minutes}M ${seconds}S`
    };
  };

  const handleAddEvent = () => {
    if (!newEvent.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    addEventMutation.mutate(newEvent);
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteEventMutation.mutate(eventId);
  };

  const handleEditEvent = (event: TimeEvent) => {
    setEditingEvent(event);
    // Pre-populate the form with existing event data
    setNewEvent({
      title: event.title,
      deadline: event.deadline,
      project_id: event.project_id || '',
      client_id: event.client_id || ''
    });
    setShowEditDialog(true);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent) return;
    if (!newEvent.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    updateEventMutation.mutate({ id: editingEvent.id, eventData: newEvent });
  };

  const getEventProject = (event: TimeEvent) => {
    return allProjects.find(p => p.id === event.project_id);
  };

  const getEventClient = (event: TimeEvent) => {
    return allClients.find(c => c.id === event.client_id);
  };

  const getCardGradient = (index: number, isOverdue: boolean) => {
    if (isOverdue) {
      return 'from-red-500 to-red-600 shadow-lg shadow-red-200';
    }
    
    const gradients = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-orange-500 to-orange-600',
      'from-yellow-500 to-yellow-600',
      'from-green-500 to-green-600',
      'from-teal-500 to-teal-600'
    ];
    return gradients[index % gradients.length];
  };

  // Update timers every second but don't invalidate the entire query
  useEffect(() => {
    const interval = setInterval(() => {
      // Force component re-render to update timers without refetching data
      queryClient.invalidateQueries({ queryKey: ['time-events-timer'] });
    }, 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  if (!user) {
    return (
      <Navigation>
        <div className="flex items-center justify-center min-h-96">
          <p className="text-gray-500">Please log in to view your events.</p>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="container mx-auto px-4 py-6 max-w-full overflow-hidden">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Time Until</h1>
          <p className="text-muted-foreground">Track countdown timers for your important events</p>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters:</span>
          </div>
          
          {/* Client Filter - only show clients with events */}
          <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto pb-2">
            <Button
              variant={selectedClient === '' ? 'default' : 'outline'}
              size="sm"
              className="flex-shrink-0"
              onClick={() => {
                setSelectedClient('');
                setSelectedProject('');
              }}
            >
              All Clients
            </Button>
            {clientsWithEvents.map((client) => (
              <Button
                key={client.id}
                variant={selectedClient === client.id ? 'default' : 'outline'}
                size="sm"
                className="flex-shrink-0"
                onClick={() => {
                  setSelectedClient(client.id);
                  setSelectedProject('');
                }}
              >
                {client.name}
              </Button>
            ))}
          </div>

          {/* Project Filter - only show projects with events */}
          {selectedClient && (
            <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto pb-2">
              <Button
                variant={selectedProject === '' ? 'default' : 'outline'}
                size="sm"
                className="flex-shrink-0"
                onClick={() => setSelectedProject('')}
              >
                All Projects
              </Button>
              {filteredProjectsWithEvents.map((project) => (
                <Button
                  key={project.id}
                  variant={selectedProject === project.id ? 'default' : 'outline'}
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => setSelectedProject(project.id)}
                >
                  {project.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Add Event Button */}
        <div className="mb-6">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="Enter event title"
                  />
                </div>

                <div>
                  <Label>Deadline</Label>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newEvent.deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newEvent.deadline ? format(newEvent.deadline, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newEvent.deadline}
                        onSelect={(date) => {
                          if (date) {
                            setNewEvent({...newEvent, deadline: date});
                            setShowCalendar(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="client">Client (Optional)</Label>
                  <select
                    id="client"
                    value={newEvent.client_id}
                    onChange={(e) => {
                      setNewEvent({
                        ...newEvent, 
                        client_id: e.target.value,
                        project_id: '' // Reset project when client changes
                      });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Client</option>
                    {allClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                {newEvent.client_id && (
                  <div>
                    <Label htmlFor="project">Project (Optional)</Label>
                    <select
                      id="project"
                      value={newEvent.project_id}
                      onChange={(e) => setNewEvent({...newEvent, project_id: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Project</option>
                      {filteredAllProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Button 
                  onClick={handleAddEvent} 
                  className="w-full"
                  disabled={addEventMutation.isPending}
                >
                  {addEventMutation.isPending ? 'Adding...' : 'Add Event'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Event Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Event Title</Label>
                <Input
                  id="edit-title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <Label>Deadline</Label>
                <Popover open={showEditCalendar} onOpenChange={setShowEditCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newEvent.deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newEvent.deadline ? format(newEvent.deadline, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newEvent.deadline}
                      onSelect={(date) => {
                        if (date) {
                          setNewEvent({...newEvent, deadline: date});
                          setShowEditCalendar(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="edit-client">Client (Optional)</Label>
                <select
                  id="edit-client"
                  value={newEvent.client_id}
                  onChange={(e) => {
                    setNewEvent({
                      ...newEvent, 
                      client_id: e.target.value,
                      project_id: '' // Reset project when client changes
                    });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Client</option>
                  {allClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {newEvent.client_id && (
                <div>
                  <Label htmlFor="edit-project">Project (Optional)</Label>
                  <select
                    id="edit-project"
                    value={newEvent.project_id}
                    onChange={(e) => setNewEvent({...newEvent, project_id: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Project</option>
                    {filteredAllProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button 
                onClick={handleUpdateEvent} 
                className="w-full"
                disabled={updateEventMutation.isPending}
              >
                {updateEventMutation.isPending ? 'Updating...' : 'Update Event'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Loading State */}
        {eventsLoading && (
          <div className="text-center py-12">
            <div className="text-sm text-gray-600">Loading events...</div>
          </div>
        )}

        {/* Events Grid */}
        {!eventsLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            {filteredEvents.map((event, index) => {
              const timeData = calculateTimeRemaining(event.deadline);
              const project = getEventProject(event);
              const client = getEventClient(event);
              const isOverdue = timeData.isPast;

              return (
                 <Card 
                  key={event.id} 
                  className={cn(
                    "bg-gradient-to-br text-white border-0 relative transition-all duration-300 w-full max-w-full",
                    getCardGradient(index, isOverdue),
                    isOverdue && "ring-2 ring-red-400 transform scale-105"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base md:text-lg font-semibold text-white truncate">
                          {event.title}
                        </CardTitle>
                        {(project || client) && (
                          <div className="mt-1 space-y-1">
                            {client && (
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-white/80">
                                  Client: {client.name}
                                </p>
                                {isOverdue && (
                                  <Badge className="bg-white text-red-600 font-bold animate-pulse text-xs">
                                    OVERDUE
                                  </Badge>
                                )}
                              </div>
                            )}
                            {project && (
                              <p className="text-xs text-white/80">
                                Project: {project.name}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Clock className="h-5 w-5 text-white/80" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
                          onClick={() => handleEditEvent(event)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={deleteEventMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className={cn(
                        "text-2xl font-bold text-white mb-1",
                        isOverdue && "animate-pulse"
                      )}>
                        {timeData.formatted}
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          isOverdue 
                            ? 'bg-white text-red-600 font-bold' 
                            : 'bg-white/20 text-white'
                        )}
                      >
                        {timeData.isPast ? 'Overdue' : 'Remaining'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!eventsLoading && filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500">
              {events.length === 0 
                ? "Create your first event to start tracking time" 
                : "No events match the selected filters"}
            </p>
          </div>
        )}
      </div>
    </Navigation>
  );
};

export default TimeUntil;
