import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Global Calendar</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Global Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-64">
              <Select value={selected} onValueChange={(v) => setSelected(v as CalendarKey)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select calendar page" />
                </SelectTrigger>
                <SelectContent>
                  {CALENDARS.map((c) => (
                    <SelectItem key={c.label} value={c.label}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <CurrentCalendar />
      </div>
    </Navigation>
  );
}
