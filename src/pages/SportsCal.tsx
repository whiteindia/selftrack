import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

export const SportsCalContent = () => {
  // Placeholder events - will be populated when sport_activities table is created
  const events = [
    {
      id: '1',
      title: 'Sample Sport Activity',
      start: new Date().toISOString(),
      backgroundColor: '#10b981',
      borderColor: '#059669',
    }
  ];

  return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Sports Calendar</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sports Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
              }}
              events={events}
              height="auto"
              eventDisplay="block"
            />
          </CardContent>
        </Card>
      </div>
  );
};

const SportsCal = () => (
  <Navigation>
    <SportsCalContent />
  </Navigation>
);

export default SportsCal;
