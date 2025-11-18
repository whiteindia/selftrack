import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Award, Eye, Heart, Users, Leaf, BookOpen, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import Navigation from "@/components/Navigation";

interface MPPFActivity {
  id: string;
  activity_category: string;
  specific_action: string;
  description: string;
  public_impact_visibility: string;
  start_date: string;
}

const categoryIcons: Record<string, any> = {
  'Social Help': Heart,
  'Local Support': Users,
  'Charity': Heart,
  'Environmental': Leaf,
  'Animal Welfare': Heart,
  'Community Welfare': Users,
  'Education': BookOpen,
  'Cleanliness': Leaf,
  'Inclusion': Users,
  'Fundraising': TrendingUp,
  'Youth Awareness': Award,
  'Public Responsibility': Eye,
  'Festival Cause': Calendar,
  'Mental Health': Heart,
  'Women Empowerment': Users
};

const getImpactColor = (impact: string) => {
  if (impact.includes('High')) return 'bg-red-100 text-red-800 border-red-200';
  if (impact.includes('Medium')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (impact.includes('Low')) return 'bg-green-100 text-green-800 border-green-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

export const MPPFCalContent = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: activities } = useQuery({
    queryKey: ['mppf-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mppf_activities')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data as MPPFActivity[];
    }
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const activitiesByDate = activities?.reduce((acc, activity) => {
    const date = format(new Date(activity.start_date), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, MPPFActivity[]>);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const selectedActivities = selectedDate ? activitiesByDate?.[format(selectedDate, 'yyyy-MM-dd')] || [] : [];

  return (
    <div className="space-y-6">
      {/* Calendar Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
          {days.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayActivities = activitiesByDate?.[dayKey] || [];
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const hasActivities = dayActivities.length > 0;

            return (
              <div
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative p-2 text-center cursor-pointer rounded-lg transition-all duration-200
                  ${!isSameMonth(day, currentDate) ? 'text-muted-foreground opacity-50' : ''}
                  ${isToday ? 'bg-blue-100 border-2 border-blue-300' : 'hover:bg-gray-100'}
                  ${isSelected ? 'bg-purple-100 border-2 border-purple-300' : 'border border-gray-200'}
                  ${hasActivities ? 'bg-gradient-to-br from-green-50 to-green-100' : ''}
                `}
              >
                <div className="text-sm font-medium">{format(day, 'd')}</div>
                {hasActivities && (
                  <div className="mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full mx-auto"></div>
                    <div className="text-xs text-green-700 font-medium mt-1">
                      {dayActivities.length} activity{dayActivities.length > 1 ? 'ies' : ''}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Selected Date Activities */}
      {selectedDate && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Activities for {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          
          {selectedActivities.length > 0 ? (
            <div className="space-y-4">
              {selectedActivities.map((activity) => {
                const IconComponent = categoryIcons[activity.activity_category] || Award;
                
                return (
                  <div key={activity.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{activity.specific_action}</h4>
                            <p className="text-sm text-muted-foreground">{activity.activity_category}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getImpactColor(activity.public_impact_visibility)}`}>
                            {activity.public_impact_visibility}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">{activity.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activities scheduled for this date</p>
            </div>
          )}
        </Card>
      )}

      {/* Recent Activities Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent MPPF Activities</h3>
        <div className="space-y-3">
          {activities?.slice(0, 5).map((activity) => {
            const IconComponent = categoryIcons[activity.activity_category] || Award;
            
            return (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-1 bg-gradient-to-br from-primary/10 to-primary/20 rounded">
                  <IconComponent className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.specific_action}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.activity_category} • {format(new Date(activity.start_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getImpactColor(activity.public_impact_visibility)}`}>
                  {activity.public_impact_visibility.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default function MPPFCal() {
  return (
    <Navigation>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🌍 MPPF Calendar</h1>
            <p className="text-muted-foreground">Media & Public Focus Activities Calendar</p>
          </div>
        </div>
        <MPPFCalContent />
      </div>
    </Navigation>
  );
}