
import React from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock } from 'lucide-react';

const LogCal = () => {
  return (
    <Navigation>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Log Calendar</h1>
            <p className="text-gray-600">Time tracking and activity logs</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Log calendar functionality will be implemented here to track time and view activity logs.
            </p>
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default LogCal;
