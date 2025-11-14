import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { Badge } from "@/components/ui/badge";

interface TouchEventRow {
  person_id: string;
  person_name: string;
  event_type: "follow_up" | "last_conversation";
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  title: string;
}

const typeStyles: Record<string, { bg: string; border: string }> = {
  follow_up: { bg: "#60a5fa", border: "#2563eb" },
  last_conversation: { bg: "#34d399", border: "#059669" }
};

export function NetworkTouchCal() {
  const [activeView, setActiveView] = useState<string>("month");
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["network-touch-cal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("network_touch_cal")
        .select("person_id, person_name, event_type, start_at, end_at, all_day, title")
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data || []) as TouchEventRow[];
    }
  });

  const events = rows.map((r) => ({
    id: `${r.event_type}-${r.person_id}-${r.start_at}`,
    title: r.title,
    start: r.start_at,
    end: r.end_at || undefined,
    allDay: r.all_day,
    backgroundColor: typeStyles[r.event_type].bg,
    borderColor: typeStyles[r.event_type].border,
    extendedProps: {
      type: r.event_type,
      person: r.person_name
    }
  }));

  const renderEventContent = (info: any) => {
    const { event } = info;
    const type = event.extendedProps.type;
    return (
      <div className="p-1 text-xs">
        <div className="font-medium truncate">{event.title}</div>
        <div className="opacity-80">{type === "follow_up" ? "Follow-up" : "Last conversation"}</div>
      </div>
    );
  };

  return (
    <Card className="mt-4 sm:mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Network Touch Calendar</CardTitle>
          <Badge variant="secondary">{events.length} items</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="mt-4">
            <FullCalendar
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              events={events}
              eventContent={renderEventContent}
              height={600}
              headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            />
          </TabsContent>

          <TabsContent value="week" className="mt-4">
            <FullCalendar
              plugins={[timeGridPlugin]}
              initialView={isMobile ? 'timeGridThreeDay' : 'timeGridWeek'}
              views={{
                timeGridThreeDay: { type: 'timeGrid', duration: { days: 3 } }
              }}
              events={events}
              eventContent={renderEventContent}
              height={600}
              headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            />
          </TabsContent>

          <TabsContent value="day" className="mt-4">
            <FullCalendar
              plugins={[timeGridPlugin]}
              initialView="timeGridDay"
              events={events}
              eventContent={renderEventContent}
              height={600}
              headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <FullCalendar
              plugins={[listPlugin]}
              initialView="listWeek"
              events={events}
              height={600}
              headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default NetworkTouchCal;
