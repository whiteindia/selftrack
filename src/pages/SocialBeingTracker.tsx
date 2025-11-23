import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trash2, Edit, Award, Calendar, Heart, BookOpen, Plus, Filter, Search, X, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Navigation from "@/components/Navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface SocialActivity {
  id: string;
  category: string;
  activity_practice: string;
  purpose_goal: string;
  frequency: string;
  how_to_do: string;
  expected_impact: string;
  start_date: string;
}

const categoryIcons: Record<string, React.ComponentType> = {
  'Community Building': Users,
  'Social Skills': Heart,
  'Networking': Users,
  'Cultural Activities': BookOpen,
  'Volunteering': Heart,
  'Professional Development': Award,
  'Personal Growth': TrendingUp,
  'Relationship Building': Users,
  'Social Awareness': Target,
  'Communication Skills': BookOpen
};

const getFrequencyColor = (frequency: string) => {
  if (frequency.includes('Daily')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (frequency.includes('Weekly')) return 'bg-green-100 text-green-800 border-green-200';
  if (frequency.includes('Monthly')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (frequency.includes('Occasional')) return 'bg-purple-100 text-purple-800 border-purple-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const SocialBeingTracker = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  // Form state for adding new activity
  const [formData, setFormData] = useState({
    category: 'Community Building',
    activity_practice: '',
    purpose_goal: '',
    frequency: 'Weekly',
    how_to_do: '',
    expected_impact: '',
    start_date: format(new Date(), 'yyyy-MM-dd')
  });

  const { data: activities, isLoading } = useQuery({
    queryKey: ['social-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_activities')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as SocialActivity[];
    }
  });

  // Mutation for adding new activity
  const addActivityMutation = useMutation({
    mutationFn: async (newActivity: Omit<SocialActivity, 'id'>) => {
      const { data, error } = await supabase
        .from('social_activities')
        .insert([newActivity])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-activities'] });
      setShowAddModal(false);
      // Reset form
      setFormData({
        category: 'Community Building',
        activity_practice: '',
        purpose_goal: '',
        frequency: 'Weekly',
        how_to_do: '',
        expected_impact: '',
        start_date: format(new Date(), 'yyyy-MM-dd')
      });
    },
    onError: (error) => {
      console.error('Error adding activity:', error);
      alert('Failed to add activity. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addActivityMutation.mutate(formData);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;

    try {
      const { error } = await supabase
        .from("social_activities")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['social-activities'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
    }
  };

  // Get unique categories for filter from actual data, fallback to hardcoded if no data
  const categories = activities && activities.length > 0 
    ? ["All", ...Array.from(new Set(activities.map(activity => activity.category)))]
    : ["All", ...Object.keys(categoryIcons)];
  
  // Filter activities based on search and category
  const filteredActivities = activities?.filter(activity => {
    const matchesSearch = activity.activity_practice.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.purpose_goal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || activity.category === selectedCategory;
    return matchesSearch && matchesCategory;
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
    <Navigation>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">🤝 Social Being Tracker</h1>
            <p className="text-muted-foreground">Social Activities & Community Engagement Tracker</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Activities</p>
                <p className="text-2xl font-bold text-blue-900">{filteredActivities?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Daily Activities</p>
                <p className="text-2xl font-bold text-green-900">
                  {filteredActivities?.filter(a => a.frequency.includes('Daily')).length || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-600">Weekly Activities</p>
                <p className="text-2xl font-bold text-teal-900">
                  {filteredActivities?.filter(a => a.frequency.includes('Weekly')).length || 0}
                </p>
              </div>
              <Target className="h-8 w-8 text-teal-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">This Month</p>
                <p className="text-2xl font-bold text-purple-900">
                  {filteredActivities?.filter(a => {
                    const activityDate = new Date(a.start_date);
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    return activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear;
                  }).length || 0}
                </p>
              </div>
              <Heart className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background text-sm"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-input rounded-md bg-background text-sm appearance-none"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Activities Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Activity</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Purpose / Goal</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Frequency</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Expected Impact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities?.map((activity) => {
                  const IconComponent = categoryIcons[activity.category] || Users;
                  
                  return (
                    <tr key={activity.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{activity.activity_practice}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {activity.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {activity.purpose_goal}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getFrequencyColor(activity.frequency)}`}>
                          {activity.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {activity.expected_impact}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(activity.start_date), 'dd MMM yyyy')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {/* TODO: Implement edit functionality */}}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(activity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredActivities?.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Social Activities Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== "All" 
                  ? "Try adjusting your search or filter criteria"
                  : "Start tracking your social activities and community engagement!"
                }
              </p>
              <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-blue-600 to-teal-600">
                <Plus className="h-4 w-4 mr-2" />
                Add First Activity
              </Button>
            </div>
          )}
        </Card>

        {/* Add Activity Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Add New Social Activity</h2>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowAddModal(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      required
                    >
                      {Object.keys(categoryIcons).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Activity / Practice</label>
                    <input
                      type="text"
                      value={formData.activity_practice}
                      onChange={(e) => setFormData({...formData, activity_practice: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., Community cleanup drive"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Purpose / Goal</label>
                    <textarea
                      value={formData.purpose_goal}
                      onChange={(e) => setFormData({...formData, purpose_goal: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background h-20 resize-none"
                      placeholder="What do you want to achieve?"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      required
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Occasional">Occasional</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">How to Do It Effectively</label>
                    <textarea
                      value={formData.how_to_do}
                      onChange={(e) => setFormData({...formData, how_to_do: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background h-20 resize-none"
                      placeholder="Describe the approach and methods..."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Expected Impact</label>
                    <textarea
                      value={formData.expected_impact}
                      onChange={(e) => setFormData({...formData, expected_impact: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background h-20 resize-none"
                      placeholder="What positive changes do you expect?"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      required
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setShowAddModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={addActivityMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                    >
                      {addActivityMutation.isPending ? 'Adding...' : 'Add Activity'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Navigation>
  );
};

export default SocialBeingTracker;
