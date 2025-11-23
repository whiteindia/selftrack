import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Baby, Trash2, Edit, Award, Calendar, Users, Heart, BookOpen, Plus, Filter, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Navigation from "@/components/Navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

const categoryIcons: Record<string, React.ComponentType> = {
  'Physical Development': Award,
  'Cognitive Development': BookOpen,
  'Social Development': Users,
  'Emotional Development': Heart,
  'Creative Development': Award,
  'Language Development': BookOpen,
  'Motor Skills': Award,
  'Sensory Development': Heart,
  'Academic Development': BookOpen,
  'Life Skills': Users
};

const getFrequencyColor = (frequency: string) => {
  if (frequency.includes('Daily')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (frequency.includes('Weekly')) return 'bg-green-100 text-green-800 border-green-200';
  if (frequency.includes('Monthly')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (frequency.includes('Occasional')) return 'bg-purple-100 text-purple-800 border-purple-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const KidsParenting = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  // Form state for adding new activity
  const [formData, setFormData] = useState({
    category: 'Physical Development',
    activity_name: '',
    description: '',
    frequency: 'Daily',
    duration: '30 minutes',
    tools_needed: '',
    goal: '',
    progress_notes: '',
    start_date: format(new Date(), 'yyyy-MM-dd')
  });

  const { data: activities, isLoading } = useQuery({
    queryKey: ['kids-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kids_activities')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as Activity[];
    }
  });

  // Mutation for adding new activity
  const addActivityMutation = useMutation({
    mutationFn: async (newActivity: Omit<Activity, 'id'>) => {
      const { data, error } = await supabase
        .from('kids_activities')
        .insert([newActivity])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids-activities'] });
      setShowAddModal(false);
      // Reset form
      setFormData({
        category: 'Physical Development',
        activity_name: '',
        description: '',
        frequency: 'Daily',
        duration: '30 minutes',
        tools_needed: '',
        goal: '',
        progress_notes: '',
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
        .from("kids_activities")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['kids-activities'] });
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
    const matchesSearch = activity.activity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || activity.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

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
            <h1 className="text-3xl font-bold">👶 Kids & Parenting</h1>
            <p className="text-muted-foreground">Child Development Activities Tracker</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-pink-600">Total Activities</p>
                <p className="text-2xl font-bold text-pink-900">{filteredActivities?.length || 0}</p>
              </div>
              <Award className="h-8 w-8 text-pink-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Daily Activities</p>
                <p className="text-2xl font-bold text-blue-900">
                  {filteredActivities?.filter(a => a.frequency.includes('Daily')).length || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Weekly Activities</p>
                <p className="text-2xl font-bold text-green-900">
                  {filteredActivities?.filter(a => a.frequency.includes('Weekly')).length || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
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
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Frequency</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Goal</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities?.map((activity) => {
                  const IconComponent = categoryIcons[activity.category] || Award;
                  
                  return (
                    <tr key={activity.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg">
                            <IconComponent className="h-5 w-5 text-pink-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{activity.activity_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
                          {activity.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {activity.description}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getFrequencyColor(activity.frequency)}`}>
                          {activity.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                          {activity.duration}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {activity.goal}
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
              <Baby className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Kids Activities Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== "All" 
                  ? "Try adjusting your search or filter criteria"
                  : "Start tracking your child development activities to support growth!"
                }
              </p>
              <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-pink-600 to-purple-600">
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
                  <h2 className="text-xl font-semibold">Add New Kids Activity</h2>
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
                    <label className="block text-sm font-medium mb-2">Activity Name</label>
                    <input
                      type="text"
                      value={formData.activity_name}
                      onChange={(e) => setFormData({...formData, activity_name: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., Story Time Reading"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background h-20 resize-none"
                      placeholder="Describe the activity and how to do it..."
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
                    <label className="block text-sm font-medium mb-2">Duration</label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., 30 minutes"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Tools Needed</label>
                    <input
                      type="text"
                      value={formData.tools_needed}
                      onChange={(e) => setFormData({...formData, tools_needed: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., Books, toys, art supplies"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Goal / Expected Outcome</label>
                    <input
                      type="text"
                      value={formData.goal}
                      onChange={(e) => setFormData({...formData, goal: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., Improve reading skills"
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
                      className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
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

export default KidsParenting;
