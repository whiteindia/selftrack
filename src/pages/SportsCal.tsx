import Navigation from "@/components/Navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

export const SportsCalContent = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
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
      <div className="container mx-auto px-3 py-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Sports Calendar</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sports Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
              initialView={isMobile ? 'timeGridThreeDay' : 'dayGridMonth'}
              views={{
                timeGridThreeDay: { type: 'timeGrid', duration: { days: 3 } }
              }}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridThreeDay,listWeek'
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
