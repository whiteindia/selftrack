import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, TrendingUp, Eye, Heart, Leaf, BookOpen, Award } from "lucide-react";
import { format } from "date-fns";

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

export const MPPFTracker = () => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['mppf-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mppf_activities')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as MPPFActivity[];
    }
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🌍 MPPF Tracker</h1>
          <p className="text-muted-foreground">Media & Public Focus Activities</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <TrendingUp className="h-4 w-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Activities</p>
              <p className="text-2xl font-bold text-blue-900">{activities?.length || 0}</p>
            </div>
            <Award className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">High Impact</p>
              <p className="text-2xl font-bold text-red-900">
                {activities?.filter(a => a.public_impact_visibility.includes('High')).length || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">This Month</p>
              <p className="text-2xl font-bold text-green-900">
                {activities?.filter(a => {
                  const activityDate = new Date(a.start_date);
                  const currentMonth = new Date().getMonth();
                  const currentYear = new Date().getFullYear();
                  return activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear;
                }).length || 0}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activities?.map((activity) => {
          const IconComponent = categoryIcons[activity.activity_category] || Award;
          
          return (
            <Card key={activity.id} className="p-6 hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{activity.specific_action}</h3>
                      <p className="text-sm text-muted-foreground">{activity.activity_category}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getImpactColor(activity.public_impact_visibility)}`}>
                    {activity.public_impact_visibility}
                  </span>
                </div>

                {/* Description */}
                <p className="text-gray-700 leading-relaxed">{activity.description}</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(activity.start_date), 'dd MMM yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm">
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {activities?.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <Award className="h-16 w-16 text-muted-foreground mx-auto" />
            <h3 className="text-xl font-semibold">No MPPF Activities Yet</h3>
            <p className="text-muted-foreground">Start tracking your media and public focus activities to make a difference!</p>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              Record First Activity
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};