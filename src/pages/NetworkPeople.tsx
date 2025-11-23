import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Users, Award, Calendar, Heart, BookOpen, Filter, Search, X, Target, TrendingUp, Briefcase, Network, Edit } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NetworkPerson {
  id: string;
  name: string;
  relationship_type: string;
  role_position: string;
  industry_domain: string;
  work_type: string;
  influence_level: string;
  acts_to_engage?: string;
  last_conversation_summary?: string;
  last_conversation_date?: string;
  follow_up_plan?: string;
  follow_up_date?: string | null;
}

const relationshipIcons: Record<string, React.ComponentType> = {
  'Professional': Briefcase,
  'Mentor': Award,
  'Friend': Heart,
  'Family': Users,
  'Colleague': Target,
  'Business Partner': TrendingUp,
  'Industry Expert': BookOpen,
  'Advisor': Award,
  'Peer': Users,
  'Influencer': Network
};

const getInfluenceColor = (influence: string) => {
  if (influence.includes('High')) return 'bg-red-100 text-red-800 border-red-200';
  if (influence.includes('Medium')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (influence.includes('Low')) return 'bg-green-100 text-green-800 border-green-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

export default function NetworkPeople() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRelationship, setSelectedRelationship] = useState("All");
  const [selectedInfluence, setSelectedInfluence] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<NetworkPerson | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);

  // Form state for adding new person
  const [formData, setFormData] = useState({
    name: '',
    relationship_type: 'Professional',
    role_position: '',
    industry_domain: '',
    work_type: '',
    influence_level: 'Medium',
    acts_to_engage: '',
    last_conversation_summary: '',
    last_conversation_date: '',
    follow_up_plan: '',
    follow_up_date: ''
  });

  const { data: people, isLoading, error } = useQuery({
    queryKey: ['network-people'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("network_people")
        .select("*")
        .order("name");

      if (error) throw error;
      console.log('Network people data:', data); // Debug log
      return data as NetworkPerson[];
    }
  });

  // Mutation for adding new person
  const addPersonMutation = useMutation({
    mutationFn: async (newPerson: Omit<NetworkPerson, 'id'>) => {
      const { data, error } = await supabase
        .from("network_people")
        .insert([newPerson])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-people'] });
      setShowAddModal(false);
      // Reset form
      setFormData({
        name: '',
        relationship_type: 'Professional',
        role_position: '',
        industry_domain: '',
        work_type: '',
        influence_level: 'Medium',
        acts_to_engage: '',
        last_conversation_summary: '',
        last_conversation_date: '',
        follow_up_plan: '',
        follow_up_date: ''
      });
    },
    onError: (error) => {
      console.error('Error adding person:', error);
      toast.error('Failed to add contact. Please try again.');
    }
  });

  // Mutation for editing person
  const editPersonMutation = useMutation({
    mutationFn: async (updatedPerson: NetworkPerson) => {
      const { data, error } = await supabase
        .from("network_people")
        .update(updatedPerson)
        .eq('id', updatedPerson.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-people'] });
      setShowEditModal(false);
      setPersonToEdit(null);
      toast.success('Contact updated successfully');
    },
    onError: (error) => {
      console.error('Error updating person:', error);
      toast.error('Failed to update contact. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPersonMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (personToEdit) {
      editPersonMutation.mutate({ ...personToEdit, ...formData });
    }
  };

  const openEditModal = (person: NetworkPerson) => {
    setPersonToEdit(person);
    setFormData({
      name: person.name,
      relationship_type: person.relationship_type,
      role_position: person.role_position,
      industry_domain: person.industry_domain,
      work_type: person.work_type,
      influence_level: person.influence_level,
      acts_to_engage: person.acts_to_engage || '',
      last_conversation_summary: person.last_conversation_summary || '',
      last_conversation_date: person.last_conversation_date || '',
      follow_up_plan: person.follow_up_plan || '',
      follow_up_date: person.follow_up_date || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!personToDelete) return;

    try {
      const { error } = await supabase
        .from("network_people")
        .delete()
        .eq("id", personToDelete);

      if (error) throw error;
      toast.success("Contact deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['network-people'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contact");
    } finally {
      setDeleteDialogOpen(false);
      setPersonToDelete(null);
    }
  };

  const confirmDelete = (id: string) => {
    setPersonToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Get unique categories for filter from actual data, fallback to hardcoded if no data
  const relationships = people && people.length > 0
    ? ["All", ...Array.from(new Set(people.map(person => person.relationship_type)))]
    : ["All", ...Object.keys(relationshipIcons)];
  const influenceLevels = people && people.length > 0
    ? ["All", ...Array.from(new Set(people.map(person => person.influence_level)))]
    : ["All", "High", "Medium", "Low"];
  
  // Filter people based on search and filters
  const filteredPeople = people?.filter(person => {
    const matchesSearch = searchTerm === "" || 
                         person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.role_position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.industry_domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRelationship = selectedRelationship === "All" || person.relationship_type === selectedRelationship;
    const matchesInfluence = selectedInfluence === "All" || person.influence_level === selectedInfluence;
    return matchesSearch && matchesRelationship && matchesInfluence;
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

  if (error) {
    return (
      <Navigation>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <Network className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Network People</h3>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">🌐 Network People Tracker</h1>
            <p className="text-muted-foreground">Professional Network & Relationship Management</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Contacts</p>
                <p className="text-2xl font-bold text-blue-900">{filteredPeople?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">High Influence</p>
                <p className="text-2xl font-bold text-red-900">
                  {filteredPeople?.filter(p => p.influence_level?.includes('High')).length || 0}
                </p>
              </div>
              <Award className="h-8 w-8 text-red-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Medium Influence</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {filteredPeople?.filter(p => p.influence_level?.includes('Medium')).length || 0}
                </p>
              </div>
              <Target className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Professional</p>
                <p className="text-2xl font-bold text-green-900">
                  {filteredPeople?.filter(p => p.relationship_type?.includes('Professional')).length || 0}
                </p>
              </div>
              <Briefcase className="h-8 w-8 text-green-600" />
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
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-input rounded-md bg-background text-sm"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={selectedRelationship}
                onChange={(e) => setSelectedRelationship(e.target.value)}
                className="pl-10 pr-8 py-2 border border-input rounded-md bg-background text-sm appearance-none"
              >
                {relationships.map(relationship => (
                  <option key={relationship} value={relationship}>{relationship}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <select
                value={selectedInfluence}
                onChange={(e) => setSelectedInfluence(e.target.value)}
                className="pl-3 pr-8 py-2 border border-input rounded-md bg-background text-sm appearance-none"
              >
                {influenceLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* People Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Relationship</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Role / Position</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Industry</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Influence</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Last Conversation</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople?.map((person) => {
                  const IconComponent = relationshipIcons[person.relationship_type] || Users;
                  
                  return (
                    <tr key={person.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{person.name}</div>
                            <div className="text-xs text-muted-foreground">{person.work_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {person.relationship_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {person.role_position}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                          {person.industry_domain}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getInfluenceColor(person.influence_level)}`}>
                          {person.influence_level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                          {person.last_conversation_date ? format(new Date(person.last_conversation_date), 'dd MMM yyyy') : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditModal(person)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => confirmDelete(person.id)}
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
          
          {filteredPeople?.length === 0 && (
            <div className="text-center py-12">
              <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Network Contacts Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedRelationship !== "All" || selectedInfluence !== "All"
                  ? "Try adjusting your search or filter criteria"
                  : "Start building your professional network and track your relationships!"
                }
              </p>
              <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Add First Contact
              </Button>
            </div>
          )}
        </Card>

        {/* Add Contact Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Add New Network Contact</h2>
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
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., John Smith"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Relationship Type</label>
                    <select
                      value={formData.relationship_type}
                      onChange={(e) => setFormData({...formData, relationship_type: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      required
                    >
                      {Object.keys(relationshipIcons).map(relationship => (
                        <option key={relationship} value={relationship}>{relationship}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Role / Position</label>
                    <input
                      type="text"
                      value={formData.role_position}
                      onChange={(e) => setFormData({...formData, role_position: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., CEO, Manager"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Industry / Domain</label>
                    <input
                      type="text"
                      value={formData.industry_domain}
                      onChange={(e) => setFormData({...formData, industry_domain: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., Technology, Healthcare"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Work Type</label>
                    <input
                      type="text"
                      value={formData.work_type}
                      onChange={(e) => setFormData({...formData, work_type: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., Full-time, Consultant"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Influence Level</label>
                    <select
                      value={formData.influence_level}
                      onChange={(e) => setFormData({...formData, influence_level: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      required
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
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
                      disabled={addPersonMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {addPersonMutation.isPending ? 'Adding...' : 'Add Contact'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Edit Contact Modal */}
        {showEditModal && personToEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Edit Network Contact</h2>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setShowEditModal(false);
                      setPersonToEdit(null);
                    }}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., John Smith"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Relationship Type</label>
                    <select
                      value={formData.relationship_type}
                      onChange={(e) => setFormData({...formData, relationship_type: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      required
                    >
                      {Object.keys(relationshipIcons).map(relationship => (
                        <option key={relationship} value={relationship}>{relationship}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Role / Position</label>
                    <input
                      type="text"
                      value={formData.role_position}
                      onChange={(e) => setFormData({...formData, role_position: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., CEO, Manager"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Industry / Domain</label>
                    <input
                      type="text"
                      value={formData.industry_domain}
                      onChange={(e) => setFormData({...formData, industry_domain: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., Technology, Healthcare"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Work Type</label>
                    <input
                      type="text"
                      value={formData.work_type}
                      onChange={(e) => setFormData({...formData, work_type: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      placeholder="e.g., Full-time, Consultant"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Influence Level</label>
                    <select
                      value={formData.influence_level}
                      onChange={(e) => setFormData({...formData, influence_level: e.target.value})}
                      className="w-full p-2 border border-input rounded-md bg-background"
                      required
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => {
                        setShowEditModal(false);
                        setPersonToEdit(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={editPersonMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {editPersonMutation.isPending ? 'Updating...' : 'Update Contact'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the contact
                from your network.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Navigation>
  );
}
