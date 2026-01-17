
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Activity, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityFeedProps {
  activityFeed: any[];
  isLoading: boolean;
  isError: boolean;
  error: any;
  formatActivityTime: (timestamp: string) => string;
  getActivityIcon: (actionType: string) => string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activityFeed,
  isLoading,
  isError,
  error,
  formatActivityTime,
  getActivityIcon
}) => {
  const queryClient = useQueryClient();

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      console.log('Deleting activity:', activityId);
      const { error, data } = await supabase
        .from('activity_feed')
        .delete()
        .eq('id', activityId)
        .select();

      console.log('Delete result:', { error, data });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success('Activity deleted');
      await queryClient.refetchQueries({ queryKey: ['activity-feed'] });
    },
    onError: (error) => {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    }
  });

  const deleteAllActivitiesMutation = useMutation({
    mutationFn: async () => {
      console.log('Deleting all activities');
      // Get all activity IDs first
      const { data: activities, error: fetchError } = await supabase
        .from('activity_feed')
        .select('id');
      
      if (fetchError) throw fetchError;
      
      if (!activities || activities.length === 0) {
        return [];
      }

      // Delete each one
      const { error, data } = await supabase
        .from('activity_feed')
        .delete()
        .in('id', activities.map(a => a.id))
        .select();

      console.log('Delete all result:', { error, data });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success('All activities deleted');
      await queryClient.refetchQueries({ queryKey: ['activity-feed'] });
    },
    onError: (error) => {
      console.error('Error deleting all activities:', error);
      toast.error('Failed to delete activities');
    }
  });

  // Helper to format entity display - show task title for subtasks
  const formatEntityDisplay = (activity: any) => {
    if (activity.entity_type === 'subtask' && activity.comment) {
      // Extract task name from comment if it contains "Task ID:" or "Parent task:"
      if (activity.comment.includes('Parent task:')) {
        const taskName = activity.comment.replace('Parent task:', '').trim();
        return `${activity.entity_type} • ${activity.entity_name} (${taskName})`;
      }
    }
    return `${activity.entity_type} • ${activity.entity_name}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-purple-600" />
            Recent Activity
            {isLoading && <span className="ml-2 text-sm text-gray-500">(Loading...)</span>}
            {isError && <span className="ml-2 text-sm text-red-500">(Error)</span>}
          </div>
          {activityFeed.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteAllActivitiesMutation.mutate()}
                    disabled={deleteAllActivitiesMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete all activities</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="text-center py-8 text-red-500">
            <p>Error loading activity feed</p>
            <p className="text-sm">{error?.message}</p>
          </div>
        ) : activityFeed.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
            <p className="text-sm">Activity will appear here as team members work</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4 pr-4">
              {activityFeed.map((activity: any) => (
                <div key={activity.id} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">{getActivityIcon(activity.action_type)}</span>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.profiles?.full_name || 'Unknown User'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 break-words">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {formatEntityDisplay(activity)}
                      </p>
                      {activity.comment && !activity.comment.includes('Parent task:') && !activity.comment.includes('Task ID:') && (
                        <p className="text-xs text-gray-500 mt-2 italic break-words">
                          "{activity.comment}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatActivityTime(activity.created_at)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteActivityMutation.mutate(activity.id)}
                        disabled={deleteActivityMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
