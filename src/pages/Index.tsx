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

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  console.log('Dashboard - Current user:', user?.email, 'Role:', userRole);

  const {
    statsQuery,
    upcomingDeadlinesQuery,
    runningTasksQuery
  } = useDashboardData();

  const { activityFeedQuery } = useActivityFeed();

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

        {/* Active Time Tracking Section */}
        <div className="mb-8">
          <ActiveTimeTracking
            runningTasks={runningTasksQuery.data || []}
            isError={!!runningTasksQuery.error}
            onRunningTaskClick={() => navigate('/tasks')}
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
    </Navigation>
  );
};

export default Index;
