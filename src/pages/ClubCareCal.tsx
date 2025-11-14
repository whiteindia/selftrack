import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface ClubCareConnection {
  id: string;
  relation_type: string;
  person_contact: string;
  description: string;
  frequency: string;
  start_date: string;
}

export const ClubCareCalContent = () => {
  const [connections, setConnections] = useState<ClubCareConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from("club_care")
        .select("*")
        .order("relation_type", { ascending: true });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load connections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const relationTypes = Array.from(new Set(connections.map(c => c.relation_type)));

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const filteredConnections = selectedTypes.length > 0
    ? connections.filter(c => selectedTypes.includes(c.relation_type))
    : connections;

  const shouldShowConnection = (connection: ClubCareConnection, date: Date): boolean => {
    const connectionStartDate = new Date(connection.start_date);
    connectionStartDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Don't show connection before its start date
    if (checkDate < connectionStartDate) return false;
    
    const frequency = connection.frequency.toLowerCase();
    const dayOfWeek = date.getDay();
    const daysDiff = Math.floor((checkDate.getTime() - connectionStartDate.getTime()) / (1000 * 60 * 60 * 24));

    if (frequency.includes("daily")) return true;
    
    if (frequency.includes("weekly")) {
      // Show on same day of week as start date
      return dayOfWeek === connectionStartDate.getDay();
    }
    
    if (frequency.includes("bi-weekly") || frequency.includes("biweekly")) {
      // Show every 2 weeks on the same day
      return dayOfWeek === connectionStartDate.getDay() && Math.floor(daysDiff / 7) % 2 === 0;
    }
    
    if (frequency.includes("monthly")) {
      // Show on same date each month
      return date.getDate() === connectionStartDate.getDate();
    }
    
    if (frequency.includes("weekday") && dayOfWeek >= 1 && dayOfWeek <= 5)
      return true;
      
    if (frequency.includes("weekend") && (dayOfWeek === 0 || dayOfWeek === 6))
      return true;

    return false;
  };

  const getConnectionsForDate = (date: Date) => {
    return filteredConnections.filter(connection => shouldShowConnection(connection, date));
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
      <div className="container mx-auto px-3 py-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">ClubCare Calendar</h1>
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

        {/* Relation Type Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter by Relation Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {relationTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedTypes.includes(type) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleType(type)}
                >
                  {type}
                </Button>
              ))}
              {selectedTypes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTypes([])}
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
              <p className="text-center py-4">Loading connections...</p>
            ) : (
              <div className={cn(
                "grid gap-2",
                viewMode === "weekly" ? "grid-cols-3 sm:grid-cols-7" : "grid-cols-3 sm:grid-cols-7"
              )}>
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-semibold text-sm p-2 border-b">
                    {day}
                  </div>
                ))}
                
                {/* Calendar cells */}
                {days.map((day, index) => {
                  const dayConnections = getConnectionsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-32 border p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                        isToday && "bg-blue-50 border-blue-300",
                        isSelected && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className={cn(
                        "text-sm font-medium mb-2",
                        isToday && "text-blue-600"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayConnections.slice(0, 3).map((connection) => (
                          <Badge
                            key={connection.id}
                            variant="secondary"
                            className="text-xs block truncate"
                          >
                            {connection.person_contact}
                          </Badge>
                        ))}
                        {dayConnections.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{dayConnections.length - 3} more
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
            <CardTitle>Connections for {format(selectedDate, 'EEEE, MMMM d, yyyy')}</CardTitle>
          </CardHeader>
          <CardContent>
            {getConnectionsForDate(selectedDate).length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                No connections scheduled for this day
              </p>
            ) : (
              <div className="space-y-4">
                {getConnectionsForDate(selectedDate).map((connection) => (
                  <div key={connection.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{connection.person_contact}</h3>
                        <Badge variant="outline">{connection.relation_type}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{connection.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Frequency:</span> {connection.frequency}
                      </div>
                      <div>
                        <span className="font-medium">Start Date:</span>{' '}
                        {new Date(connection.start_date).toLocaleDateString()}
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

const ClubCareCal = () => (
  <Navigation>
    <ClubCareCalContent />
  </Navigation>
);

export default ClubCareCal;
