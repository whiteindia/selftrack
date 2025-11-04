import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Baby, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ActivityDialog } from "@/components/kids/ActivityDialog";
import Navigation from "@/components/Navigation";

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
}

const KidsParenting = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("kids_activities")
        .select("*")
        .order("category", { ascending: true })
        .order("activity_name", { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingActivity(null);
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

      fetchActivities();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
    }
  };

  return (
    <Navigation>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Baby className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Kids & Parenting</h1>
          </div>
          <ActivityDialog 
            onActivityAdded={() => {
              fetchActivities();
              handleDialogClose();
            }}
            editActivity={editingActivity}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Child Development Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading activities...</p>
          ) : activities.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No activities yet. Click "Add Activity" to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Activity Name</TableHead>
                    <TableHead>Description / How to Do</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Tools Needed</TableHead>
                    <TableHead>Goal / Expected Outcome</TableHead>
                    <TableHead>Progress Notes</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.category}</TableCell>
                      <TableCell>{activity.activity_name}</TableCell>
                      <TableCell>{activity.description}</TableCell>
                      <TableCell>{activity.frequency}</TableCell>
                      <TableCell>{activity.duration}</TableCell>
                      <TableCell>{activity.tools_needed}</TableCell>
                      <TableCell>{activity.goal}</TableCell>
                      <TableCell>{activity.progress_notes || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(activity)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(activity.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </Navigation>
  );
};

export default KidsParenting;
