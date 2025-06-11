
import React from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartGantt } from 'lucide-react';

const GanttView = () => {
  return (
    <Navigation>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ChartGantt className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Gantt View</h1>
            <p className="text-gray-600">Project timeline and task visualization</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Gantt chart functionality will be implemented here to visualize project timelines and task dependencies.
            </p>
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default GanttView;
