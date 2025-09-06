import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Eye, Filter, Check } from 'lucide-react';
import LiveTimer from './LiveTimer';
import CompactTimerControls from './CompactTimerControls';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

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

  // Final filtered tasks based on all selections
  const filteredTasks = useMemo(() => {
    if (selectedProjects.length === 0) return tasksForSelectedClients;
    
    return tasksForSelectedClients.filter((entry: any) =>
      selectedProjects.includes(entry.tasks.projects?.id)
    );
  }, [tasksForSelectedClients, selectedProjects]);

  const toggleService = (serviceName: string) => {
    setSelectedServices(prev => {
      const newServices = prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName];
      
      // Clear dependent filters when services change
      setSelectedClients([]);
      setSelectedProjects([]);
      
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

  const isPaused = (entry: any) => {
    const pauseInfo = parsePauseInfo(entry.timer_metadata);
    return pauseInfo.isPaused;
  };

  const handleViewTask = (taskId: string) => {
    // Navigate to alltasks page with the specific task highlighted
    window.location.href = `/alltasks?highlight=${taskId}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Play className="h-5 w-5 mr-2 text-green-600" />
          Active Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Hierarchical Filter Section - Cascade: Services → Clients → Projects */}
        {runningTasks.length > 0 && (
          <div className="mb-4 space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filters (Cascade Mode):</span>
            </div>
            
            {/* Step 1: Service Filter */}
            {availableServices.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                  Services ({availableServices.length})
                </h3>
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
              </div>
            )}

            {/* Step 2: Client Filter - Only show when services are selected */}
            {selectedServices.length > 0 && availableClients.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                  Clients ({availableClients.length})
                </h3>
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
              </div>
            )}

            {/* Step 3: Project Filter - Only show when clients are selected */}
            {selectedClients.length > 0 && availableProjects.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                  Projects ({availableProjects.length})
                </h3>
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
              </div>
            )}

            {/* Filter Results Info */}
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
          <div className="space-y-3">
            {filteredTasks.map((entry: any) => (
              <div
                key={entry.id}
                className="p-3 border rounded-lg bg-green-50 border-green-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    <h4 className="font-medium text-green-900 text-sm leading-tight">{entry.tasks.name}</h4>
                    <p className="text-xs text-green-700 mt-1">
                      {entry.tasks.projects.name} • {entry.tasks.projects.clients.name}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="default" className={`text-xs ${isPaused(entry) ? "bg-yellow-600" : "bg-green-600"}`}>
                        {isPaused(entry) ? 'Paused' : 'Running'}
                      </Badge>
                      <LiveTimer 
                        startTime={entry.start_time} 
                        timerMetadata={entry.timer_metadata}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
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
                      onClick={() => handleViewTask(entry.tasks.id)}
                      className="h-6 px-2 text-xs"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {isError && <p className="text-xs text-red-500 mt-1">Error loading running tasks</p>}
      </CardContent>
    </Card>
  );
};

export default ActiveTimeTracking;
