import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-6 pt-4 pb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold">Theatrical Arts</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your theatrical arts skills and practice
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingSkill(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Skill
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Skills List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Loading skills...</p>
            ) : skills.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No skills added yet. Click "Add Skill" to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill Category</TableHead>
                    <TableHead>Specific Skill</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Practice Frequency</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills.map((skill) => (
                    <TableRow key={skill.id}>
                      <TableCell className="font-medium">{skill.skill_category}</TableCell>
                      <TableCell>{skill.specific_skill}</TableCell>
                      <TableCell className="max-w-md truncate">{skill.description}</TableCell>
                      <TableCell>{skill.practice_frequency}</TableCell>
                      <TableCell>{new Date(skill.start_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(skill)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(skill.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <TheatricalSkillDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          skill={editingSkill}
          onSkillAdded={fetchSkills}
        />
      </div>
    </div>
  );
};

export default TheatricalArts;
