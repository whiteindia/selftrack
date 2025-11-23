import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Trophy, Award, Target, Calendar, Search, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { SportsSkillDialog } from "@/components/sports/SportsSkillDialog";

interface SportsSkill {
  id: string;
  skill_category: string;
  specific_skill: string;
  description: string;
  practice_frequency: string;
  start_date: string;
  created_at: string;
  updated_at: string;
}

const Sports = () => {
  const [skills, setSkills] = useState<SportsSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSkill, setEditingSkill] = useState<SportsSkill | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFrequency, setSelectedFrequency] = useState("All");

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const { data, error } = await supabase
        .from("sports_skills")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error("Error fetching skills:", error);
      toast.error("Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (skill: SportsSkill) => {
    setEditingSkill(skill);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) return;

    try {
      const { error } = await supabase
        .from("sports_skills")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Skill deleted successfully");
      fetchSkills();
    } catch (error) {
      console.error("Error deleting skill:", error);
      toast.error("Failed to delete skill");
    }
  };

  // Get unique categories and frequencies for filters
  const categories = ["All", ...Array.from(new Set(skills.map(skill => skill.skill_category)))];
  const frequencies = ["All", ...Array.from(new Set(skills.map(skill => skill.practice_frequency)))];
  
  // Filter skills based on search and filters
  const filteredSkills = skills?.filter(skill => {
    const matchesSearch = skill.skill_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         skill.specific_skill.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || skill.skill_category === selectedCategory;
    const matchesFrequency = selectedFrequency === "All" || skill.practice_frequency === selectedFrequency;
    return matchesSearch && matchesCategory && matchesFrequency;
  });

  return (
    <Navigation>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">🏃 Sports Tracker</h1>
            <p className="text-muted-foreground">Track and manage your sports skills and practice</p>
          </div>
          <Button 
            onClick={() => {
              setEditingSkill(null);
              setDialogOpen(true);
            }}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Skill
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Skills</p>
                <p className="text-2xl font-bold text-green-900">{filteredSkills?.length || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Team Sports</p>
                <p className="text-2xl font-bold text-blue-900">
                  {filteredSkills?.filter(s => s.skill_category.toLowerCase().includes('team')).length || 0}
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Individual Sports</p>
                <p className="text-2xl font-bold text-purple-900">
                  {filteredSkills?.filter(s => !s.skill_category.toLowerCase().includes('team')).length || 0}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Daily Practice</p>
                <p className="text-2xl font-bold text-orange-900">
                  {filteredSkills?.filter(s => s.practice_frequency.toLowerCase().includes('daily')).length || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
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
                placeholder="Search skills..."
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
            <div className="relative">
              <select
                value={selectedFrequency}
                onChange={(e) => setSelectedFrequency(e.target.value)}
                className="pl-3 pr-8 py-2 border border-input rounded-md bg-background text-sm appearance-none"
              >
                {frequencies.map(frequency => (
                  <option key={frequency} value={frequency}>{frequency}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Skills Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Skill</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Frequency</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Start Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSkills?.map((skill) => (
                  <tr key={skill.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg">
                          <Trophy className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{skill.specific_skill}</div>
                          <div className="text-xs text-muted-foreground">{skill.skill_category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {skill.skill_category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {skill.description}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-muted-foreground">
                        {skill.practice_frequency}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-muted-foreground">
                        {new Date(skill.start_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(skill)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(skill.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredSkills?.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sports Skills Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== "All" || selectedFrequency !== "All"
                  ? "Try adjusting your search or filter criteria"
                  : "Start tracking your sports skills and practice routines!"
                }
              </p>
              <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-green-600 to-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Add First Skill
              </Button>
            </div>
          )}
        </Card>

        <SportsSkillDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          skill={editingSkill}
          onSkillAdded={fetchSkills}
        />
      </div>
    </Navigation>
  );
};

export default Sports;
