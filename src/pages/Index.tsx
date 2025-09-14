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
import TodaysReminders from '@/components/dashboard/TodaysReminders';
import TaskCreateDialog from '@/components/TaskCreateDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Play, Calendar, RotateCw, Clock, Target, CalendarCheck, AlarmClock, Bell, FileText, Users } from 'lucide-react';
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

  const {
    statsQuery,
    upcomingDeadlinesQuery,
    runningTasksQuery
  } = useDashboardData();

  const { activityFeedQuery } = useActivityFeed();

  // Search tasks functionality
  const searchTasks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:employees!assignee_id (name),
          assigner:employees!assigner_id (name)
        `)
        .ilike('name', `%${query}%`)
        .limit(5);

      if (error) throw error;

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
            project_name: projectInfo?.name || null,
            project_service: projectInfo?.service || null,
            client_name: projectInfo?.client_name || null,
          };
        })
      );

      setSearchResults(tasksWithProjects);
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

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back!</p>
        </div>

        {/* Quick Actions Section */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
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
                onClick={() => navigate('/sprints')}
                title="Sprints"
              >
                <Target className="h-4 w-4" />
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
                onClick={() => setIsCreateTaskDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Task
              </Button>
              <Button 
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setIsQuickTaskDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Quick
              </Button>
              <div className="flex items-center gap-1 flex-wrap">
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('/workload-cal')}
                  title="Workload Calendar"
                >
                  <Calendar className="h-4 w-4" />
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
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('/team-slots')}
                  title="Team Slots"
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>
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
                        {searchResults.map((task: any) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{task.name}</div>
                              <div className="text-gray-500 text-xs">
                                {task.project_name} • {task.status}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startTaskMutation.mutate({ taskId: task.id, taskName: task.name })}
                              disabled={task.status === 'Completed' || task.status === 'In Progress'}
                              className="ml-2"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
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

        {/* Active Time Tracking Section */}
        <div className="mb-8">
          <ActiveTimeTracking
            runningTasks={runningTasksQuery.data || []}
            isError={!!runningTasksQuery.error}
            onRunningTaskClick={() => { /* stay on dashboard after timer actions */ }}
          />
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
    </Navigation>
  );
};

export default Index;
