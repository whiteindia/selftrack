import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Trash2, Edit, Award, Calendar, Heart, BookOpen, Plus, Filter, Search, X, Target, TrendingUp, Handshake } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from "date-fns";
import Navigation from '@/components/Navigation';
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ClubCareConnection {
  id: string;
  relation_type: string;
  person_contact: string;
  description: string;
  frequency: string;
  start_date: string;
}

const relationTypeIcons: Record<string, React.ComponentType> = {
  'Professional': Handshake,
  'Mentor': Award,
  'Friend': Heart,
  'Family': Users,
  'Colleague': Target,
  'Business Partner': TrendingUp,
  'Community': Users,
  'Advisor': BookOpen,
  'Peer': Users,
  'Support Group': Heart
};

const getFrequencyColor = (frequency: string) => {
  if (frequency.includes('Daily')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (frequency.includes('Weekly')) return 'bg-green-100 text-green-800 border-green-200';
  if (frequency.includes('Monthly')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (frequency.includes('Quarterly')) return 'bg-purple-100 text-purple-800 border-purple-200';
  if (frequency.includes('Annually')) return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const ClubCare = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRelationType, setSelectedRelationType] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for adding new connection
  const [formData, setFormData] = useState({
    relation_type: 'Professional',
    person_contact: '',
    description: '',
    frequency: 'Monthly',
    start_date: format(new Date(), 'yyyy-MM-dd')
  });

  const { data: connections, isLoading } = useQuery({
    queryKey: ['club-care'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_care')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as ClubCareConnection[];
    }
  });

  // Mutation for adding new connection
  const addConnectionMutation = useMutation({
    mutationFn: async (newConnection: Omit<ClubCareConnection, 'id'>) => {
      const { data, error } = await supabase
        .from('club_care')
        .insert([newConnection])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club-care'] });
      setShowAddModal(false);
      // Reset form
      setFormData({
        relation_type: 'Professional',
        person_contact: '',
        description: '',
        frequency: 'Monthly',
        start_date: format(new Date(), 'yyyy-MM-dd')
      });
    },
    onError: (error) => {
      console.error('Error adding connection:', error);
      toast.error('Failed to add connection. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addConnectionMutation.mutate(formData);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      const { error } = await supabase
        .from('club_care')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Connection deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['club-care'] });
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Failed to delete connection');
    }
  };

  // Get unique relation types for filter from actual data
  const relationTypes = connections ? ["All", ...Array.from(new Set(connections.map(connection => connection.relation_type)))] : ["All"];
  
  // Filter connections based on search and relation type
  const filteredConnections = connections?.filter(connection => {
    const matchesSearch = connection.person_contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         connection.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRelationType = selectedRelationType === "All" || connection.relation_type === selectedRelationType;
    return matchesSearch && matchesRelationType;
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
            <h1 className="text-3xl font-bold">🤝 ClubCare</h1>
            <p className="text-muted-foreground">Professional Relationships & Network Tracker</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Total Connections</p>
                <p className="text-2xl font-bold text-indigo-900">{filteredConnections?.length || 0}</p>
              </div>
              <Handshake className="h-8 w-8 text-indigo-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Professional</p>
                <p className="text-2xl font-bold text-green-900">
                  {filteredConnections?.filter(c => c.relation_type.includes('Professional')).length || 0}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Monthly Contacts</p>
                <p className="text-2xl font-bold text-purple-900">
                  {filteredConnections?.filter(c => c.frequency.includes('Monthly')).length || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">This Month</p>
                <p className="text-2xl font-bold text-blue-900">
                  {filteredConnections?.filter(c => {
                    const connectionDate = new Date(c.start_date);
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    return connectionDate.getMonth() === currentMonth && connectionDate.getFullYear() === currentYear;
                  }).length || 0}
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-600" />
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
                placeholder="Search connections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background text-sm"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={selectedRelationType}
                onChange={(e) => setSelectedRelationType(e.target.value)}
                className="pl-10 pr-8 py-2 border border-input rounded-md bg-background text-sm appearance-none"
              >
                {relationTypes.map(relationType => (
                  <option key={relationType} value={relationType}>{relationType}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Connections Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Relation Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Frequency</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConnections?.map((connection) => {
                  const IconComponent = relationTypeIcons[connection.relation_type] || Handshake;
                  
                  return (
                    <tr key={connection.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                            <IconComponent className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{connection.person_contact}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          {connection.relation_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {connection.description}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getFrequencyColor(connection.frequency)}`}>
                          {connection.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(connection.start_date), 'dd MMM yyyy')}
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
                            onClick={() => handleDelete(connection.id)}
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
          
          {filteredConnections?.length === 0 && (
            <div className="text-center py-12">
              <Handshake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Connections Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedRelationType !== "All" 
                  ? "Try adjusting your search or filter criteria"
                  : "Start building your professional network and track your relationships!"
                }
              </p>
              <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Add First Connection
              </Button>
            </div>
          )}
        </Card>

        {/* Add Connection Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Add New Connection</h2>
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
                    <label className="block text-sm font-medium mb-2">Relation Type</label>
                    <select
                      value={formData.relation_type}
                      onChange={(e) => setFormData({...formData, relation_type: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      required
                    >
                      {Object.keys(relationTypeIcons).map(relationType => (
                        <option key={relationType} value={relationType}>{relationType}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Person / Contact</label>
                    <input
                      type="text"
                      value={formData.person_contact}
                      onChange={(e) => setFormData({...formData, person_contact: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., John Smith, CEO"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background h-20 resize-none"
                      placeholder="Describe the relationship and purpose..."
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
                      <option value="Quarterly">Quarterly</option>
                      <option value="Annually">Annually</option>
                      <option value="Occasional">Occasional</option>
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
                      disabled={addConnectionMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      {addConnectionMutation.isPending ? 'Adding...' : 'Add Connection'}
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

export default ClubCare;
