
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity } from 'lucide-react';

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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="h-5 w-5 mr-2 text-purple-600" />
          Recent Activity
          {isLoading && <span className="ml-2 text-sm text-gray-500">(Loading...)</span>}
          {isError && <span className="ml-2 text-sm text-red-500">(Error)</span>}
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
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">{getActivityIcon(activity.action_type)}</span>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.profiles?.full_name || 'Unknown User'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {activity.entity_type} • {activity.entity_name}
                      </p>
                      {activity.comment && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          "{activity.comment}"
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 ml-2">
                      {formatActivityTime(activity.created_at)}
                    </span>
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
