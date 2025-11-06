import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Activity {
  id: string;
  category: string;
  activity_practice: string;
  purpose_goal: string;
  frequency: string;
  how_to_do: string;
  expected_impact: string;
  start_date: string;
}

const SocialBeingCal = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("social_activities")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const shouldShowActivity = (activity: Activity, date: Date): boolean => {
    const activityStartDate = new Date(activity.start_date);
    activityStartDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < activityStartDate) return false;

    const daysDiff = Math.floor((checkDate.getTime() - activityStartDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (activity.frequency.toLowerCase()) {
      case "daily":
        return true;
      case "weekly":
        return daysDiff % 7 === 0;
      case "bi-weekly":
        return daysDiff % 14 === 0;
      case "monthly":
        return checkDate.getDate() === activityStartDate.getDate();
      case "weekdays":
        const day = checkDate.getDay();
        return day > 0 && day < 6;
      case "weekends":
        const weekendDay = checkDate.getDay();
        return weekendDay === 0 || weekendDay === 6;
      default:
        return false;
    }
  };

  const getActivitiesForDay = (date: Date) => {
    return activities.filter(activity => {
      if (categoryFilter !== "all" && activity.category !== categoryFilter) {
        return false;
      }
      return shouldShowActivity(activity, date);
    });
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const weekDays = getWeekDays();
  const uniqueCategories = Array.from(new Set(activities.map(a => a.category)));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Social Being Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View your social activities schedule
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle>
                {weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Loading activities...</p>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const dayActivities = getActivitiesForDay(day);
                  const isToday = new Date().toDateString() === day.toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 min-h-[200px] ${
                        isToday ? "bg-primary/5 border-primary" : ""
                      }`}
                    >
                      <div className="font-semibold text-sm mb-2">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        <br />
                        {day.getDate()}
                      </div>
                      <div className="space-y-2">
                        {dayActivities.map(activity => (
                          <div
                            key={activity.id}
                            className="text-xs p-2 rounded bg-secondary hover:bg-secondary/80 cursor-pointer transition-colors"
                            title={`${activity.activity_practice}\n${activity.purpose_goal}`}
                          >
                            <div className="font-medium truncate">{activity.activity_practice}</div>
                            <div className="text-muted-foreground truncate">{activity.category}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SocialBeingCal;
