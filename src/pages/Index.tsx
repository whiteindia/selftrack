import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import StatsCards from '@/components/dashboard/StatsCards';
import UpcomingDeadlines from '@/components/dashboard/UpcomingDeadlines';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import ActiveTimeTracking from '@/components/dashboard/ActiveTimeTracking';
import { QuickTasksSection } from '@/components/dashboard/QuickTasksSection';
import { PinnedUntilGoalsSection } from '@/components/dashboard/PinnedUntilGoalsSection';
import { CurrentShiftSection } from '@/components/dashboard/CurrentShiftSection';
import { DashboardWorkloadCal } from '@/components/dashboard/DashboardWorkloadCal';
import { HostlistSection } from '@/components/dashboard/HostlistSection';
import { HotProjSection } from '@/components/dashboard/HotProjSection';
import TodaysReminders from '@/components/dashboard/TodaysReminders';
import { FocusOnSection } from '@/components/dashboard/FocusOnSection';
import TaskCreateDialog from '@/components/TaskCreateDialog';
import AssignToSlotDialog from '@/components/AssignToSlotDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Play, Calendar, RotateCw, Clock, Target, CalendarCheck, AlarmClock, Bell, FileText, Users, CalendarPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();

  console.log('Dashboard - Current user:', user?.email, 'Role:', userRole);

  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isQuickTaskDialogOpen, setIsQuickTaskDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  // (kept for backward compatibility; global search now assigns directly to current slot)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedItemsForWorkload, setSelectedItemsForWorkload] = useState<any[]>([]);

  const addToWorkloadMutation = useMutation({
    mutationFn: async (task: any) => {
      // Always add to the *current running slot* (current hour), not any previously selected slot.
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeSlot = `${now.getHours().toString().padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('tasks')
        .update({
          date: dateStr,
          scheduled_time: timeSlot
        })
        .eq('id', task.id);

      if (error) throw error;
      return { dateStr, timeSlot };
    },
    onSuccess: ({ dateStr, timeSlot }) => {
      toast.success(`Added to workload: ${dateStr} @ ${timeSlot}`);
      // Stay on dashboard; just refresh relevant sections.
      queryClient.invalidateQueries({ queryKey: ['current-shift-workload'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-workload'] });
    },
    onError: (error) => {
      console.error('Error adding to workload:', error);
      toast.error('Failed to add to workload');
    }
  });

  const {
    statsQuery,
    upcomingDeadlinesQuery,
    runningTasksQuery
  } = useDashboardData();

  const { activityFeedQuery } = useActivityFeed();

  // Search tasks and subtasks functionality
  const searchTasks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:employees!assignee_id (name),
          assigner:employees!assigner_id (name)
        `)
        .ilike('name', `%${query}%`)
        .limit(5);

      if (tasksError) throw tasksError;

      // Search subtasks
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select(`
          *,
          assignee:employees!assignee_id (name),
          assigner:employees!assigner_id (name)
        `)
        .ilike('name', `%${query}%`)
        .limit(5);

      if (subtasksError) throw subtasksError;

      // Get project info for each task
      const tasksWithProjects = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: projectData } = await supabase
            .rpc('get_project_info_for_task', { 
              project_uuid: task.project_id 
            });
          
          const projectInfo = projectData?.[0];
          
          return {
            ...task,
            item_type: 'task',
            project_name: projectInfo?.name || null,
            project_service: projectInfo?.service || null,
            client_name: projectInfo?.client_name || null,
          };
        })
      );

      // Get parent task and project info for each subtask
      const subtasksWithProjects = await Promise.all(
        (subtasksData || []).map(async (subtask) => {
          // Get parent task info
          const { data: parentTask } = await supabase
            .from('tasks')
            .select('id, name, project_id')
            .eq('id', subtask.task_id)
            .single();

          let projectInfo = null;
          if (parentTask?.project_id) {
            const { data: projectData } = await supabase
              .rpc('get_project_info_for_task', { 
                project_uuid: parentTask.project_id 
              });
            projectInfo = projectData?.[0];
          }
          
          return {
            ...subtask,
            item_type: 'subtask',
            parent_task_name: parentTask?.name || null,
            project_id: parentTask?.project_id || null,
            project_name: projectInfo?.name || null,
            project_service: projectInfo?.service || null,
            client_name: projectInfo?.client_name || null,
          };
        })
      );

      // Combine and sort results (tasks first, then subtasks)
      const combinedResults = [...tasksWithProjects, ...subtasksWithProjects].slice(0, 10);
      setSearchResults(combinedResults);
    } catch (error) {
      console.error('Error searching tasks:', error);
      toast.error('Failed to search tasks');
    } finally {
      setIsSearching(false);
    }
  };

  // Start task functionality
  const startTaskMutation = useMutation({
    mutationFn: async ({ taskId, taskName }: { taskId: string; taskName: string }) => {
      // Get current employee ID
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single();

      if (empError || !employee) {
        throw new Error('Employee record not found');
      }

      const startTime = new Date().toISOString();

      // Start timer by creating a time entry
      const { data: timeEntry, error: timeError } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          employee_id: employee.id,
          start_time: startTime,
          entry_type: 'task',
          timer_metadata: `Timer started for task: ${taskName}`
        })
        .select()
        .single();

      if (timeError) throw timeError;

      // Ensure task status is set to In Progress
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'In Progress' })
        .eq('id', taskId);

      if (updateError) {
        console.error('Error updating task status:', updateError);
      }

      return timeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runningTasks'] });
      toast.success('Timer started!');
      setSearchTerm('');
      setSearchResults([]);
    },
    onError: (error) => {
      console.error('Error starting task:', error);
      toast.error('Failed to start task');
    }
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTasks(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Log all errors for debugging
  useEffect(() => {
    if (statsQuery.error) console.error('Stats error:', statsQuery.error);
    if (upcomingDeadlinesQuery.error) console.error('Upcoming deadlines error:', upcomingDeadlinesQuery.error);
    if (activityFeedQuery.error) console.error('Activity error:', activityFeedQuery.error);
    if (runningTasksQuery.error) console.error('Running tasks error:', runningTasksQuery.error);
  }, [statsQuery.error, upcomingDeadlinesQuery.error, activityFeedQuery.error, runningTasksQuery.error]);

  const handleBRDClick = (brdUrl: string) => {
    if (brdUrl) {
      window.open(brdUrl, '_blank');
    }
  };

  const getTimeUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    return `${Math.ceil(diffDays / 7)} weeks`;
  };

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return '✨';
      case 'updated':
        return '📝';
      case 'completed':
        return '✅';
      case 'logged_time':
        return '⏱️';
      case 'timer_started':
        return '▶️';
      case 'timer_stopped':
        return '⏹️';
      case 'logged_in':
        return '🔑';
      case 'status_changed_to_in_progress':
        return '🚀';
      case 'status_changed_to_completed':
        return '🎉';
      case 'status_changed_to_not_started':
        return '📋';
      default:
        return '📌';
    }
  };

  const handleAddToWorkload = (task: any) => {
    // Always add to current slot directly from dashboard search results.
    addToWorkloadMutation.mutate(task);
  };

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 py-8">
        {/* Focus ON Section - Time Until Goals */}
        <FocusOnSection />

        {/* Quick Actions Section */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
              <Button 
                variant="outline"
                size="icon"
                onClick={() => navigate('/time-until')}
                title="Time Until"
              >
                <Clock className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => navigate('/weekly-timetable')}
                title="Weekly Timetable"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => navigate('/reminders')}
                title="Reminders & Deadlines"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => navigate('/routines-tracker')}
                title="Routines Tracker"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => navigate('/followupcal')}
                title="Followup Calendar"
              >
                <CalendarCheck className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => navigate('/fixed-slots')}
                title="Fixed Slots"
              >
                <AlarmClock className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => navigate('/log-cal')}
                title="Log Calendar"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative w-full sm:w-96">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {(searchResults.length > 0 || isSearching) && searchTerm && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
                  <CardContent className="p-2">
                    {isSearching ? (
                      <div className="p-2 text-sm text-gray-500">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-1">
                        {searchResults.map((item: any) => (
                          <div
                            key={`${item.item_type}-${item.id}`}
                            className="flex items-center justify-between p-2 hover:bg-muted/50 rounded text-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                  item.item_type === 'task' 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {item.item_type === 'task' ? 'Task' : 'Subtask'}
                                </span>
                                <span className="font-medium truncate">{item.name}</span>
                              </div>
                              <div className="text-muted-foreground text-xs mt-0.5">
                                {item.item_type === 'subtask' && item.parent_task_name && (
                                  <span className="text-foreground/70">↳ {item.parent_task_name} • </span>
                                )}
                                {item.project_name} • {item.status}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startTaskMutation.mutate({ 
                                taskId: item.item_type === 'task' ? item.id : item.task_id, 
                                taskName: item.name 
                              })}
                              disabled={item.status === 'Completed' || item.status === 'In Progress'}
                              className="ml-2"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                            {item.item_type === 'task' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAddToWorkload(item)}
                                title="Add to Workload"
                                className="ml-1"
                              >
                                <CalendarPlus className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 text-sm text-gray-500">No tasks found</div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Workload Calendar - Next 6 Hours */}
        <div className="mb-8">
          <DashboardWorkloadCal />
        </div>

        {/* Current Shift Section */}
        <div className="mb-8">
          <CurrentShiftSection />
        </div>

        {/* Pinned for Next UntilGoals Section */}
        <div className="mb-8">
          <PinnedUntilGoalsSection />
        </div>

        {/* Active Time Tracking Section */}
        <div className="mb-8">
          <ActiveTimeTracking
            runningTasks={runningTasksQuery.data || []}
            isError={!!runningTasksQuery.error}
            onRunningTaskClick={() => { /* stay on dashboard after timer actions */ }}
          />
        </div>

        {/* Quick Tasks Section */}
        <div className="mb-8">
          <QuickTasksSection />
        </div>

        {/* Quick Show Tasks Section */}
        <div className="mb-8">
          <QuickTasksSection title="QuickShowTasks" defaultOpen={false} showProjectFilters projectScope="all" />
        </div>

        {/* Hostlist Section */}
        <div className="mb-8">
          <HostlistSection />
        </div>

        {/* HotProj Section */}
        <div className="mb-8">
          <HotProjSection />
        </div>

        {/* Today's Reminders Section */}
        <div className="mb-8">
          <TodaysReminders />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <UpcomingDeadlines
            upcomingDeadlines={upcomingDeadlinesQuery.data || []}
            isError={!!upcomingDeadlinesQuery.error}
            onBRDClick={handleBRDClick}
            onViewAllProjects={() => navigate('/projects')}
            onViewAllSprints={() => navigate('/sprints')}
            getTimeUntilDeadline={getTimeUntilDeadline}
          />

          <ActivityFeed
            activityFeed={activityFeedQuery.data || []}
            isLoading={activityFeedQuery.isLoading}
            isError={!!activityFeedQuery.error}
            error={activityFeedQuery.error}
            formatActivityTime={formatActivityTime}
            getActivityIcon={getActivityIcon}
          />
        </div>

        <StatsCards 
          stats={statsQuery.data} 
          isError={!!statsQuery.error} 
        />
      </div>

      {/* Task Create Dialog */}
      <TaskCreateDialog
        isOpen={isCreateTaskDialogOpen}
        onClose={() => setIsCreateTaskDialogOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['runningTasks'] });
          setIsCreateTaskDialogOpen(false);
        }}
      />

      {/* QuickTask Dialog */}
      <TaskCreateDialog
        isOpen={isQuickTaskDialogOpen}
        onClose={() => setIsQuickTaskDialogOpen(false)}
        onSuccess={() => {
          setIsQuickTaskDialogOpen(false);
          navigate('/workload-cal');
        }}
        defaultProjectName="Miscellanious-Quick-Temp-Orglater"
      />

      {/* Assign to Workload Dialog */}
      <AssignToSlotDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        selectedItems={selectedItemsForWorkload}
        onAssigned={() => {
          setIsAssignDialogOpen(false);
          setSelectedItemsForWorkload([]);
          toast.success('Item added to workload calendar');
        }}
      />
    </Navigation>
  );
};

export default Index;
