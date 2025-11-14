import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KidsCalContent } from "@/pages/KidsCal";
import { SocialBeingCalContent } from "@/pages/SocialBeingCal";
import { ClubCareCalContent } from "@/pages/ClubCareCal";
import { SportsCalContent } from "@/pages/SportsCal";
import { TheatricalArtsCalContent } from "@/pages/TheatricalArtsCal";
import { NetworkTouchCalContent } from "@/pages/NetworkTouchCal";

type CalendarKey =
  | "Kids Cal"
  | "Social Being Cal"
  | "ClubCare Cal"
  | "Sports Cal"
  | "Theatrical Arts Cal"
  | "Network Touch Cal";

const CALENDARS: { label: CalendarKey; render: () => JSX.Element }[] = [
  { label: "Kids Cal", render: () => <KidsCalContent /> },
  { label: "Social Being Cal", render: () => <SocialBeingCalContent /> },
  { label: "ClubCare Cal", render: () => <ClubCareCalContent /> },
  { label: "Sports Cal", render: () => <SportsCalContent /> },
  { label: "Theatrical Arts Cal", render: () => <TheatricalArtsCalContent /> },
  { label: "Network Touch Cal", render: () => <NetworkTouchCalContent /> },
];

export default function GlobalCalendar() {
  const [selected, setSelected] = useState<CalendarKey>("Kids Cal");

  const CurrentCalendar = CALENDARS.find(c => c.label === selected)?.render ?? (() => null);

  return (
    <Navigation>
      <div className="container mx-auto px-3 py-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Global Calendar</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Global Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selected} onValueChange={(v) => setSelected(v as CalendarKey)}>
              <TabsList className="flex w-full overflow-x-auto whitespace-nowrap gap-1">
                {CALENDARS.map((c) => (
                  <TabsTrigger key={c.label} value={c.label} className="px-3 py-1 text-sm">
                    {c.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <CurrentCalendar />
      </div>
    </Navigation>
  );
}
