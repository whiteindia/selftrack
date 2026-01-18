import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Eye, Filter, Check, ChevronDown, ChevronRight, Pin, CalendarPlus } from 'lucide-react';
import LiveTimer from './LiveTimer';
import CompactTimerControls from './CompactTimerControls';
import { Button } from '@/components/ui/button';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import TaskDetailsDialog from '@/components/TaskDetailsDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserPins } from '@/hooks/useUserPins';
import { assignToCurrentSlot } from '@/utils/assignToCurrentSlot';
import { toast } from 'sonner';

interface ActiveTimeTrackingProps {
  runningTasks: any[];
  isError: boolean;
  onRunningTaskClick: () => void;
}

const ActiveTimeTracking: React.FC<ActiveTimeTrackingProps> = ({
  runningTasks,
  isError,
  onRunningTaskClick
}) => {
  const queryClient = useQueryClient();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<"services" | "clients" | "projects">("services");
  
  // Use database-backed pins instead of localStorage
  const { pinnedIds: pinnedTaskIds, togglePin, isToggling } = useUserPins('active_task');

  // Get unique services from running/paused tasks
  const availableServices = useMemo(() => {
    if (!runningTasks || runningTasks.length === 0) return [];
    
    const servicesSet = new Set<string>();
    runningTasks.forEach((entry: any) => {
      const task = entry.tasks;
      if (task.projects?.service) {
        servicesSet.add(task.projects.service);
      }
    });
    
    return Array.from(servicesSet).sort();
  }, [runningTasks]);

  // Filter tasks by selected services and get available clients
  const tasksForSelectedServices = useMemo(() => {
    if (selectedServices.length === 0) return runningTasks;
    
    return runningTasks.filter((entry: any) => 
      selectedServices.includes(entry.tasks.projects?.service)
    );
  }, [runningTasks, selectedServices]);

  const availableClients = useMemo(() => {
    if (!tasksForSelectedServices.length) return [];
    
    const clientMap = new Map<string, { id: string; name: string }>();
    tasksForSelectedServices.forEach((entry: any) => {
      const task = entry.tasks;
      if (task.projects?.clients?.id && task.projects?.clients?.name) {
        clientMap.set(task.projects.clients.id, {
          id: task.projects.clients.id,
          name: task.projects.clients.name
        });
      }
    });
    
    return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasksForSelectedServices]);

  // Filter tasks by selected clients and get available projects
  const tasksForSelectedClients = useMemo(() => {
    if (selectedClients.length === 0) return tasksForSelectedServices;
    
    return tasksForSelectedServices.filter((entry: any) =>
      selectedClients.includes(entry.tasks.projects?.clients?.id)
    );
  }, [tasksForSelectedServices, selectedClients]);

  const availableProjects = useMemo(() => {
    if (!tasksForSelectedClients.length) return [];
    
    const projectMap = new Map<string, { id: string; name: string }>();
    tasksForSelectedClients.forEach((entry: any) => {
      const task = entry.tasks;
      if (task.projects?.id && task.projects?.name) {
        projectMap.set(task.projects.id, {
          id: task.projects.id,
          name: task.projects.name
        });
      }
    });
    
    return Array.from(projectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasksForSelectedClients]);

  // Helper function to parse pause information from timer_metadata
  const parsePauseInfo = (timerMetadata: string | null) => {
    if (!timerMetadata) return { isPaused: false, totalPausedMs: 0, lastPauseTime: undefined };
    
    const pauseMatches = [...timerMetadata.matchAll(/Timer paused at ([^,\n]+)/g)];
    const resumeMatches = [...timerMetadata.matchAll(/Timer resumed at ([^,\n]+)/g)];
    
    let totalPausedMs = 0;
    let isPaused = false;
    let lastPauseTime: Date | undefined;
    
    // Calculate total paused time from completed pause/resume cycles
    for (let i = 0; i < Math.min(pauseMatches.length, resumeMatches.length); i++) {
      const pauseTime = new Date(pauseMatches[i][1]);
      const resumeTime = new Date(resumeMatches[i][1]);
      totalPausedMs += resumeTime.getTime() - pauseTime.getTime();
    }
    
    // Check if currently paused (more pauses than resumes)
    if (pauseMatches.length > resumeMatches.length) {
      isPaused = true;
      lastPauseTime = new Date(pauseMatches[pauseMatches.length - 1][1]);
    }
    
    return { isPaused, totalPausedMs, lastPauseTime };
  };

  // Final filtered tasks based on all selections
  const filteredTasks = useMemo(() => {
    let tasks = selectedProjects.length === 0 
      ? tasksForSelectedClients 
      : tasksForSelectedClients.filter((entry: any) =>
          selectedProjects.includes(entry.tasks.projects?.id)
        );
    
    // Sort tasks: Pinned first, then running timers, then paused timers
    return tasks.sort((a: any, b: any) => {
      const aTaskId = a.tasks?.id;
      const bTaskId = b.tasks?.id;
      const aPinned = pinnedTaskIds.includes(aTaskId);
      const bPinned = pinnedTaskIds.includes(bTaskId);
      
      // Pinned tasks come first
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      const aPaused = parsePauseInfo(a.timer_metadata).isPaused;
      const bPaused = parsePauseInfo(b.timer_metadata).isPaused;
      
      // Running (not paused) tasks come before paused
      if (!aPaused && bPaused) return -1;
      if (aPaused && !bPaused) return 1;
      
      // If both have same pin and pause status, maintain original order
      return 0;
    });
  }, [tasksForSelectedClients, selectedProjects, pinnedTaskIds]);

  const toggleService = (serviceName: string) => {
    setSelectedServices(prev => {
      const newServices = prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName];
      
      // Clear dependent filters when services change
      setSelectedClients([]);
      setSelectedProjects([]);
      setActiveFilterTab(newServices.length > 0 ? "clients" : "services");
      
      return newServices;
    });
  };

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const newClients = prev.includes(clientId)
        ? prev.filter(c => c !== clientId)
        : [...prev, clientId];
      
      // Clear dependent filters when clients change
      setSelectedProjects([]);
      setActiveFilterTab(newClients.length > 0 ? "projects" : "clients");
      
      return newClients;
    });
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(p => p !== projectId)
        : [...prev, projectId]
    );
  };

  const isPaused = (entry: any) => {
    const pauseInfo = parsePauseInfo(entry.timer_metadata);
    return pauseInfo.isPaused;
  };

  const handleViewTask = (taskId: string) => {
    // Open task details dialog instead of redirecting
    console.log('Opening task details for taskId:', taskId);
    setSelectedTaskId(taskId);
    setIsTaskDetailsOpen(true);
  };

  const handleCloseTaskDetails = () => {
    setIsTaskDetailsOpen(false);
    setSelectedTaskId(null);
  };

  // Mutation to assign task to current workload slot
  const assignToWorkloadMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await assignToCurrentSlot(taskId, 'task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-workload'] });
      queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
      queryClient.invalidateQueries({ queryKey: ['workload-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['runningTasks'] });
      toast.success('Added to workload calendar');
    },
    onError: () => {
      toast.error('Failed to add to workload calendar');
    }
  });

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="px-6 py-4">
          <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="flex items-center text-base font-semibold">
                    <Play className="h-4 w-4 mr-2 text-green-600" />
                    Active Time Tracking
                  </CardTitle>
                </div>
              </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-2 py-4 sm:px-6 sm:py-6">
            {/* Global Filter (Cascade) with tab-style buttons: Services → Clients → Projects */}
            {runningTasks.length > 0 && (
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Global Filters:</span>
                </div>

                <Tabs value={activeFilterTab} onValueChange={(v) => setActiveFilterTab(v as any)}>
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="services">Services</TabsTrigger>
                    {selectedServices.length > 0 && <TabsTrigger value="clients">Clients</TabsTrigger>}
                    {selectedClients.length > 0 && <TabsTrigger value="projects">Projects</TabsTrigger>}
                  </TabsList>

                  <TabsContent value="services" className="mt-3">
                    {availableServices.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableServices.map((service) => (
                          <Button
                            key={service}
                            variant={selectedServices.includes(service) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleService(service)}
                            className="flex items-center gap-2 text-xs"
                          >
                            {selectedServices.includes(service) && <Check className="h-3 w-3" />}
                            {service}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No services found for running tasks</div>
                    )}
                  </TabsContent>

                  <TabsContent value="clients" className="mt-3">
                    {selectedServices.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Select a service to see clients.</div>
                    ) : availableClients.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableClients.map((client) => (
                          <Button
                            key={client.id}
                            variant={selectedClients.includes(client.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleClient(client.id)}
                            className="flex items-center gap-2 text-xs"
                          >
                            {selectedClients.includes(client.id) && <Check className="h-3 w-3" />}
                            {client.name}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No clients found for selected services</div>
                    )}
                  </TabsContent>

                  <TabsContent value="projects" className="mt-3">
                    {selectedClients.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Select a client to see projects.</div>
                    ) : availableProjects.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableProjects.map((project) => (
                          <Button
                            key={project.id}
                            variant={selectedProjects.includes(project.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleProject(project.id)}
                            className="flex items-center gap-2 text-xs"
                          >
                            {selectedProjects.includes(project.id) && <Check className="h-3 w-3" />}
                            {project.name}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No projects found for selected clients</div>
                    )}
                  </TabsContent>
                </Tabs>

                {(selectedServices.length > 0 || selectedClients.length > 0 || selectedProjects.length > 0) && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    Showing {filteredTasks.length} of {runningTasks.length} running tasks
                    {selectedServices.length > 0 && ` | Services: ${selectedServices.length}`}
                    {selectedClients.length > 0 && ` | Clients: ${selectedClients.length}`}
                    {selectedProjects.length > 0 && ` | Projects: ${selectedProjects.length}`}
                  </div>
                )}
              </div>
            )}

            {runningTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No tasks currently running</p>
                <p className="text-sm">Start a timer on any task to track your work</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No tasks match the selected filters</p>
                <p className="text-sm">Try adjusting your filter criteria</p>
              </div>
            ) : (
              <div className="divide-y rounded-md border bg-green-50 border-green-200">
                {filteredTasks.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="px-3 py-2 hover:bg-green-100/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-green-900 leading-tight break-words" title={entry.tasks.name}>
                          {entry.tasks.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-green-700 truncate" title={`${entry.tasks.projects.name} • ${entry.tasks.projects.clients.name}`}>
                          <span className="truncate">{entry.tasks.projects.name} • {entry.tasks.projects.clients.name}</span>
                          <Badge variant="default" className={`text-[10px] px-1.5 py-0.5 ${isPaused(entry) ? "bg-yellow-600" : "bg-green-600"}`}>
                            {isPaused(entry) ? 'Paused' : 'Running'}
                          </Badge>
                          <LiveTimer
                            startTime={entry.start_time}
                            timerMetadata={entry.timer_metadata}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <CompactTimerControls
                          taskId={entry.tasks.id}
                          taskName={entry.tasks.name}
                          entryId={entry.id}
                          timerMetadata={entry.timer_metadata}
                          onTimerUpdate={onRunningTaskClick}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleViewTask(entry.tasks.id);
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            assignToWorkloadMutation.mutate(entry.tasks.id);
                          }}
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                          title="Assign to workload calendar"
                          disabled={assignToWorkloadMutation.isPending}
                        >
                          <CalendarPlus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePin(entry.tasks.id);
                          }}
                          className={`h-6 px-2 text-xs ${pinnedTaskIds.includes(entry.tasks.id) ? 'text-amber-600' : 'text-muted-foreground'}`}
                          title={pinnedTaskIds.includes(entry.tasks.id) ? 'Unpin' : 'Pin to top'}
                        >
                          <Pin className={`h-3 w-3 ${pinnedTaskIds.includes(entry.tasks.id) ? 'fill-amber-600' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isError && <p className="text-xs text-red-500 mt-1">Error loading running tasks</p>}
          </CardContent>
        </CollapsibleContent>

      {/* Task Details Dialog */}
      <TaskDetailsDialog
        isOpen={isTaskDetailsOpen}
        onClose={handleCloseTaskDetails}
        taskId={selectedTaskId}
        onTimeUpdate={onRunningTaskClick}
      />
      </Collapsible>
    </Card>
  );
};

export default ActiveTimeTracking;
