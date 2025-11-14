import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Baby, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  category: string;
  activity_name: string;
  description: string;
  frequency: string;
  duration: string;
  tools_needed: string;
  goal: string;
  progress_notes: string | null;
  start_date: string;
}

export const KidsCalContent = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("kids_activities")
        .select("*")
        .order("category", { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const categories = Array.from(new Set(activities.map(a => a.category)));

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredActivities = selectedCategories.length > 0
    ? activities.filter(a => selectedCategories.includes(a.category))
    : activities;

  const shouldShowActivity = (activity: Activity, date: Date): boolean => {
    const activityStartDate = new Date(activity.start_date);
    activityStartDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Don't show activity before its start date
    if (checkDate < activityStartDate) return false;
    
    const frequency = activity.frequency.toLowerCase();
    const dayOfWeek = date.getDay();
    const daysDiff = Math.floor((checkDate.getTime() - activityStartDate.getTime()) / (1000 * 60 * 60 * 24));

    if (frequency.includes("daily")) return true;
    
    if (frequency.includes("weekly")) {
      // Show on same day of week as start date
      return dayOfWeek === activityStartDate.getDay();
    }
    
    if (frequency.includes("bi-weekly") || frequency.includes("biweekly")) {
      // Show every 2 weeks on the same day
      return dayOfWeek === activityStartDate.getDay() && Math.floor(daysDiff / 7) % 2 === 0;
    }
    
    if (frequency.includes("monthly")) {
      // Show on same date each month
      return date.getDate() === activityStartDate.getDate();
    }
    
    if (frequency.includes("weekday") && dayOfWeek >= 1 && dayOfWeek <= 5)
      return true;
      
    if (frequency.includes("weekend") && (dayOfWeek === 0 || dayOfWeek === 6))
      return true;

    return false;
  };

  const getActivitiesForDate = (date: Date) => {
    return filteredActivities.filter(activity => shouldShowActivity(activity, date));
  };

  const getDaysToShow = () => {
    if (viewMode === "weekly") {
      return eachDayOfInterval({
        start: startOfWeek(selectedDate),
        end: endOfWeek(selectedDate)
      });
    } else {
      return eachDayOfInterval({
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate)
      });
    }
  };

  const days = getDaysToShow();

  return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Baby className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Kids Calendar</h1>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === "monthly" ? "default" : "outline"}
              onClick={() => setViewMode("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={viewMode === "weekly" ? "default" : "outline"}
              onClick={() => setViewMode("weekly")}
            >
              Weekly
            </Button>
          </div>
        </div>

        {/* Category Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategories.includes(category) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Button>
              ))}
              {selectedCategories.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategories([])}
                >
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Date Picker */}
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === "weekly" ? "Week" : "Month"} View - {format(selectedDate, 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-4">Loading activities...</p>
            ) : (
              <div className={cn(
                "grid gap-2",
                viewMode === "weekly" ? "grid-cols-2 sm:grid-cols-7" : "grid-cols-2 sm:grid-cols-7"
              )}>
                {/* Day headers */}
                {[
                  { full: 'Sun', short: 'Su' },
                  { full: 'Mon', short: 'M' },
                  { full: 'Tue', short: 'Tu' },
                  { full: 'Wed', short: 'W' },
                  { full: 'Thu', short: 'Th' },
                  { full: 'Fri', short: 'F' },
                  { full: 'Sat', short: 'Sa' }
                ].map((day) => (
                  <div key={day.full} className="text-center font-semibold text-sm p-2 border-b">
                    <span className="hidden sm:inline">{day.full}</span>
                    <span className="sm:hidden">{day.short}</span>
                  </div>
                ))}
                
                {/* Calendar cells */}
                {days.map((day, index) => {
                  const dayActivities = getActivitiesForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-20 sm:min-h-32 border p-1 sm:p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                        isToday && "bg-blue-50 border-blue-300",
                        isSelected && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className={cn(
                        "text-xs sm:text-sm font-medium mb-1 sm:mb-2",
                        isToday && "text-blue-600"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayActivities.slice(0, 2).map((activity) => (
                          <Badge
                            key={activity.id}
                            variant="secondary"
                            className="text-xs block truncate"
                          >
                            {activity.activity_name}
                          </Badge>
                        ))}
                        {dayActivities.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{dayActivities.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card>
          <CardHeader>
            <CardTitle>Activities for {format(selectedDate, 'EEEE, MMMM d, yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            {getActivitiesForDate(selectedDate).length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                No activities scheduled for this day
              </p>
            ) : (
              <div className="space-y-4">
                {getActivitiesForDate(selectedDate).map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{activity.activity_name}</h3>
                        <Badge variant="outline">{activity.category}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Frequency:</span> {activity.frequency}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {activity.duration}
                      </div>
                      <div>
                        <span className="font-medium">Tools:</span> {activity.tools_needed}
                      </div>
                      <div>
                        <span className="font-medium">Goal:</span> {activity.goal}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
};

const KidsCal = () => (
  <Navigation>
    <KidsCalContent />
  </Navigation>
);

export default KidsCal;
