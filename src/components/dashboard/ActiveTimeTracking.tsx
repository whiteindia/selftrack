
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock } from 'lucide-react';

interface ActiveTimeTrackingProps {
  runningTasks: any[];
  isError: boolean;
  formatElapsedTime: (startTime: string) => string;
  onRunningTaskClick: () => void;
}

const ActiveTimeTracking: React.FC<ActiveTimeTrackingProps> = ({
  runningTasks,
  isError,
  formatElapsedTime,
  onRunningTaskClick
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Play className="h-5 w-5 mr-2 text-green-600" />
          Active Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {runningTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No tasks currently running</p>
            <p className="text-sm">Start a timer on any task to track your work</p>
          </div>
        ) : (
          <div className="space-y-3">
            {runningTasks.map((entry: any) => (
              <div
                key={entry.id}
                className="p-4 border rounded-lg bg-green-50 border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                onClick={onRunningTaskClick}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-900">{entry.tasks.name}</h4>
                    <p className="text-sm text-green-700">
                      {entry.tasks.projects.name} • {entry.tasks.projects.clients.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="bg-green-600">
                      Running
                    </Badge>
                    <div className="text-sm font-mono text-green-600 mt-1">
                      {formatElapsedTime(entry.start_time)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={onRunningTaskClick}
            >
              View All In Progress Tasks
            </Button>
          </div>
        )}
        {isError && <p className="text-xs text-red-500 mt-1">Error loading running tasks</p>}
      </CardContent>
    </Card>
  );
};

export default ActiveTimeTracking;
