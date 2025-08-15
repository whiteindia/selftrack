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
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  
  // Fetch employees for roles filter
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, role')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch projects for projects filter (when role is selected)
  const { data: projects } = useQuery({
    queryKey: ['projects', selectedRole],
    queryFn: async () => {
      if (!selectedRole) return [];
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, 
          name,
          assignee_employee_id,
          tasks!inner(
            assignee_id,
            assigner_id
          )
        `)
        .order('name');
      if (error) throw error;
      
      // Filter projects based on role
      const roleEmployees = employees?.filter(emp => emp.role === selectedRole).map(emp => emp.id) || [];
      return data.filter(project => 
        roleEmployees.includes(project.assignee_employee_id) ||
        project.tasks.some((task: any) => 
          roleEmployees.includes(task.assignee_id) || roleEmployees.includes(task.assigner_id)
        )
      );
    },
    enabled: !!selectedRole && !!employees
  });

  // Get unique roles from employees
  const availableRoles = useMemo(() => {
    if (!employees) return [];
    const roles = [...new Set(employees.map(emp => emp.role))];
    return roles.filter(role => role && role !== '');
  }, [employees]);

  // Filter running tasks based on selected filters
  const filteredTasks = useMemo(() => {
    let filtered = runningTasks;
    
    if (selectedRole) {
      const roleEmployees = employees?.filter(emp => emp.role === selectedRole).map(emp => emp.id) || [];
      filtered = filtered.filter((entry: any) => {
        // Check if the task assignee or assigner belongs to the selected role
        const task = entry.tasks;
        return roleEmployees.includes(task.assignee_id) || roleEmployees.includes(task.assigner_id);
      });
    }
    
    if (selectedProject) {
      filtered = filtered.filter((entry: any) => {
        return entry.tasks.projects.id === selectedProject;
      });
    }
    
    return filtered;
  }, [runningTasks, selectedRole, selectedProject, employees]);

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    setSelectedProject(''); // Reset project when role changes
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
            
            <div className="flex flex-wrap gap-2">
              {/* Role Filter */}
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Roles</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Project Filter - Only show when role is selected */}
              {selectedRole && (
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Projects</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Clear Filters Button */}
              {(selectedRole || selectedProject) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRole('');
                    setSelectedProject('');
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Filter Results Info */}
            {(selectedRole || selectedProject) && (
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
