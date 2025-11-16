import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, TrendingUp, Eye, Heart, Leaf, BookOpen, Award, Plus, Filter, Search, Edit, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import Navigation from "@/components/Navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state for adding new activity
  const [formData, setFormData] = useState({
    activity_category: 'Social Help',
    specific_action: '',
    description: '',
    public_impact_visibility: 'High Visibility',
    start_date: format(new Date(), 'yyyy-MM-dd')
  });
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

  // Mutation for adding new activity
  const addActivityMutation = useMutation({
    mutationFn: async (newActivity: Omit<MPPFActivity, 'id'>) => {
      const { data, error } = await supabase
        .from('mppf_activities')
        .insert([newActivity])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mppf-activities'] });
      setShowAddModal(false);
      // Reset form
      setFormData({
        activity_category: 'Social Help',
        specific_action: '',
        description: '',
        public_impact_visibility: 'High Visibility',
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

  // Get unique categories for filter
  const categories = ["All", ...Object.keys(categoryIcons)];
  
  // Filter activities based on search and category
  const filteredActivities = activities?.filter(activity => {
    const matchesSearch = activity.specific_action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || activity.activity_category === selectedCategory;
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
            <h1 className="text-3xl font-bold">🌍 MPPF Tracker</h1>
            <p className="text-muted-foreground">Media & Public Focus Activities Tracker</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
              <Award className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">High Impact</p>
                <p className="text-2xl font-bold text-red-900">
                  {filteredActivities?.filter(a => a.public_impact_visibility.includes('High')).length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Medium Impact</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {filteredActivities?.filter(a => a.public_impact_visibility.includes('Medium')).length || 0}
                </p>
              </div>
              <Eye className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">This Month</p>
                <p className="text-2xl font-bold text-green-900">
                  {filteredActivities?.filter(a => {
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
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Impact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities?.map((activity) => {
                  const IconComponent = categoryIcons[activity.activity_category] || Award;
                  
                  return (
                    <tr key={activity.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{activity.specific_action}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {activity.activity_category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {activity.description}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getImpactColor(activity.public_impact_visibility)}`}>
                          {activity.public_impact_visibility}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(activity.start_date), 'dd MMM yyyy')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
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
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No MPPF Activities Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== "All" 
                  ? "Try adjusting your search or filter criteria"
                  : "Start tracking your media and public focus activities to make a difference!"
                }
              </p>
              <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
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
                  <h2 className="text-xl font-semibold">Add New MPPF Activity</h2>
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
                    <label className="block text-sm font-medium mb-2">Activity Category</label>
                    <select
                      value={formData.activity_category}
                      onChange={(e) => setFormData({...formData, activity_category: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      required
                    >
                      {Object.keys(categoryIcons).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Specific Action</label>
                    <input
                      type="text"
                      value={formData.specific_action}
                      onChange={(e) => setFormData({...formData, specific_action: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., Organized community cleanup drive"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background h-20 resize-none"
                      placeholder="Provide details about the activity..."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Public Impact Visibility</label>
                    <select
                      value={formData.public_impact_visibility}
                      onChange={(e) => setFormData({...formData, public_impact_visibility: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      required
                    >
                      <option value="High Visibility">High Visibility</option>
                      <option value="Medium Visibility">Medium Visibility</option>
                      <option value="Low Visibility">Low Visibility</option>
                    </select>
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
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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

export default MPPFTracker;