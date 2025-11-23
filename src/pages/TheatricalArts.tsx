import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Palette, Theater, Music, Search, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { TheatricalSkillDialog } from "@/components/theatrical/TheatricalSkillDialog";

interface TheatricalSkill {
  id: string;
  skill_category: string;
  specific_skill: string;
  description: string;
  practice_frequency: string;
  start_date: string;
  created_at: string;
  updated_at: string;
}

const TheatricalArts = () => {
  const [skills, setSkills] = useState<TheatricalSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSkill, setEditingSkill] = useState<TheatricalSkill | null>(null);
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
        .from("theatrical_arts_skills")
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

  const handleEdit = (skill: TheatricalSkill) => {
    setEditingSkill(skill);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) return;

    try {
      const { error } = await supabase
        .from("theatrical_arts_skills")
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
  const categories = skills && skills.length > 0
    ? ["All", ...Array.from(new Set(skills.map(skill => skill.skill_category)))]
    : ["All"];
  const frequencies = skills && skills.length > 0
    ? ["All", ...Array.from(new Set(skills.map(skill => skill.practice_frequency)))]
    : ["All"];
  
  // Filter skills based on search and filters
  const filteredSkills = skills?.filter(skill => {
    const matchesSearch = skill.skill_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         skill.specific_skill.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || skill.skill_category === selectedCategory;
    const matchesFrequency = selectedFrequency === "All" || skill.practice_frequency === selectedFrequency;
    return matchesSearch && matchesCategory && matchesFrequency;
  }) || [];

  return (
    <Navigation>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">🎭 Theatrical Arts Tracker</h1>
            <p className="text-muted-foreground">Track and manage your theatrical arts skills and practice</p>
          </div>
          <Button 
            onClick={() => {
              setEditingSkill(null);
              setDialogOpen(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Skill
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Skills</p>
                <p className="text-2xl font-bold text-purple-900">{filteredSkills?.length || 0}</p>
              </div>
              <Theater className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-pink-600">Acting Skills</p>
                <p className="text-2xl font-bold text-pink-900">
                  {filteredSkills?.filter(s => s.skill_category.toLowerCase().includes('acting')).length || 0}
                </p>
              </div>
              <Palette className="h-8 w-8 text-pink-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Musical Skills</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {filteredSkills?.filter(s => s.skill_category.toLowerCase().includes('musical')).length || 0}
                </p>
              </div>
              <Music className="h-8 w-8 text-indigo-600" />
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-600">Daily Practice</p>
                <p className="text-2xl font-bold text-violet-900">
                  {filteredSkills?.filter(s => s.practice_frequency.toLowerCase().includes('daily')).length || 0}
                </p>
              </div>
              <Palette className="h-8 w-8 text-violet-600" />
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
                        <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                          <Theater className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{skill.specific_skill}</div>
                          <div className="text-xs text-muted-foreground">{skill.skill_category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
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
              <Theater className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Theatrical Skills Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== "All" || selectedFrequency !== "All"
                  ? "Try adjusting your search or filter criteria"
                  : "Start tracking your theatrical arts skills and practice routines!"
                }
              </p>
              <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-purple-600 to-pink-600">
                <Plus className="h-4 w-4 mr-2" />
                Add First Skill
              </Button>
            </div>
          )}
        </Card>

        <TheatricalSkillDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          skill={editingSkill}
          onSkillAdded={fetchSkills}
        />
      </div>
    </Navigation>
  );
};

export default TheatricalArts;
