import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Eye, Filter } from 'lucide-react';
import LiveTimer from './LiveTimer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');

  // Get available projects from running tasks based on selected service
  const availableProjects = useMemo(() => {
    if (!selectedService || !runningTasks) return [];
    
    const projectsSet = new Set();
    
    runningTasks.forEach((entry: any) => {
      const task = entry.tasks;
      if (task.projects.service === selectedService) {
        projectsSet.add(JSON.stringify({
          id: task.projects.id,
          name: task.projects.name
        }));
      }
    });
    
    return Array.from(projectsSet).map(p => JSON.parse(p as string));
  }, [selectedService, runningTasks]);

  // Get unique services from running tasks only
  const availableServices = useMemo(() => {
    if (!runningTasks) return [];
    const servicesSet = new Set<string>();
    
    runningTasks.forEach((entry: any) => {
      const task = entry.tasks;
      if (task.projects.service) {
        servicesSet.add(task.projects.service);
      }
    });
    
    return Array.from(servicesSet).sort();
  }, [runningTasks]);

  // Filter running tasks based on selected filters
  const filteredTasks = useMemo(() => {
    let filtered = runningTasks;
    
    if (selectedService) {
      filtered = filtered.filter((entry: any) => {
        return entry.tasks.projects.service === selectedService;
      });
    }
    
    if (selectedProject) {
      filtered = filtered.filter((entry: any) => {
        return entry.tasks.projects.id === selectedProject;
      });
    }
    
    return filtered;
  }, [runningTasks, selectedService, selectedProject]);

  const handleServiceChange = (value: string) => {
    setSelectedService(value);
    setSelectedProject(''); // Reset project when service changes
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
        {/* Filter Section */}
        {runningTasks.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filters:</span>
            </div>
            
            {/* Service Filter Buttons */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedService === '' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleServiceChange('')}
                  className="text-xs"
                >
                  All Services
                </Button>
                {availableServices.map((service) => (
                  <Button
                    key={service}
                    variant={selectedService === service ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleServiceChange(service)}
                    className="text-xs"
                  >
                    {service}
                  </Button>
                ))}
              </div>

              {/* Project Filter Buttons - Only show when service is selected */}
              {selectedService && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedProject === '' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedProject('')}
                    className="text-xs"
                  >
                    All Projects
                  </Button>
                  {availableProjects.map((project) => (
                    <Button
                      key={project.id}
                      variant={selectedProject === project.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedProject(project.id)}
                      className="text-xs"
                    >
                      {project.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Results Info */}
            {(selectedService || selectedProject) && (
              <div className="text-xs text-muted-foreground">
                Showing {filteredTasks.length} of {runningTasks.length} running tasks
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewTask(entry.tasks.id)}
                    className="h-7 px-2 text-xs flex-shrink-0"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
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
