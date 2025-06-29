import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import StatsCards from '@/components/dashboard/StatsCards';
import UpcomingDeadlines from '@/components/dashboard/UpcomingDeadlines';
import ActiveTimeTracking from '@/components/dashboard/ActiveTimeTracking';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import TodaysReminders from '@/components/dashboard/TodaysReminders';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useActivityFeed } from '@/hooks/useActivityFeed';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const {
    runningTasksQuery,
    statsQuery,
    upcomingDeadlinesQuery
  } = useDashboardData();

  const { activityFeedQuery } = useActivityFeed();

  // Extract data from queries
  const stats = statsQuery.data;
  const upcomingDeadlines = upcomingDeadlinesQuery.data || [];
  const runningTasks = runningTasksQuery.data || [];
  const isError = statsQuery.isError || upcomingDeadlinesQuery.isError || runningTasksQuery.isError;
  
  const activityFeed = activityFeedQuery.data || [];
  const activityLoading = activityFeedQuery.isLoading;
  const activityError = activityFeedQuery.isError;
  const activityErrorDetails = activityFeedQuery.error;

  // Helper functions for activity feed
  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return '✨';
      case 'updated':
        return '📝';
      case 'completed':
        return '✅';
      case 'started':
        return '▶️';
      case 'paused':
        return '⏸️';
      case 'resumed':
        return '⏯️';
      case 'stopped':
        return '⏹️';
      default:
        return '📌';
    }
  };

  const handleBRDClick = (brdUrl: string) => {
    window.open(brdUrl, '_blank');
  };

  const handleViewAllProjects = () => {
    navigate('/projects');
  };

  const handleViewAllSprints = () => {
    navigate('/sprints');
  };

  const handleRunningTaskClick = () => {
    navigate('/tasks');
  };

  const getTimeUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffInMs = deadlineDate.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return `${Math.abs(diffInDays)} days overdue`;
    } else if (diffInDays === 0) {
      return 'Due today';
    } else if (diffInDays === 1) {
      return 'Due tomorrow';
    } else {
      return `${diffInDays} days left`;
    }
  };

  return (
    <Navigation>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="text-sm text-gray-600">
            Welcome back, {user?.email}
          </div>
        </div>

        <ActiveTimeTracking 
          runningTasks={runningTasks}
          isError={isError}
          onRunningTaskClick={handleRunningTaskClick}
        />

        <StatsCards stats={stats} isError={isError} />
        
        <div className="grid gap-6 md:grid-cols-2">
          <UpcomingDeadlines 
            upcomingDeadlines={upcomingDeadlines}
            isError={isError}
            onBRDClick={handleBRDClick}
            onViewAllProjects={handleViewAllProjects}
            onViewAllSprints={handleViewAllSprints}
            getTimeUntilDeadline={getTimeUntilDeadline}
          />
          <TodaysReminders />
        </div>

        <ActivityFeed 
          activityFeed={activityFeed}
          isLoading={activityLoading}
          isError={activityError}
          error={activityErrorDetails}
          formatActivityTime={formatActivityTime}
          getActivityIcon={getActivityIcon}
        />
      </div>
    </Navigation>
  );
};

export default Index;
