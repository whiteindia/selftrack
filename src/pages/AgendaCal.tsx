
import React from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

const AgendaCal = () => {
  return (
    <Navigation>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Agenda Calendar</h1>
            <p className="text-gray-600">Schedule and manage your agenda</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Agenda calendar functionality will be implemented here to manage schedules and appointments.
            </p>
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default AgendaCal;
