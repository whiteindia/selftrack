import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SocialActivityDialog } from "@/components/social/SocialActivityDialog";
import Navigation from "@/components/Navigation";

interface SocialActivity {
  id: string;
  category: string;
  activity_practice: string;
  purpose_goal: string;
  frequency: string;
  how_to_do: string;
  expected_impact: string;
}

const SocialBeingTracker = () => {
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingActivity, setEditingActivity] = useState<SocialActivity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("social_activities")
        .select("*")
        .order("category", { ascending: true })
        .order("activity_practice", { ascending: true });

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

  const handleEdit = (activity: SocialActivity) => {
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
        .from("social_activities")
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
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Social Being Tracker</h1>
          </div>
          <SocialActivityDialog 
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
            <CardTitle>Social Activities & Practices</CardTitle>
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
                      <TableHead>Activity / Practice</TableHead>
                      <TableHead>Purpose / Goal</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>How to Do It Effectively</TableHead>
                      <TableHead>Expected Impact</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.category}</TableCell>
                        <TableCell>{activity.activity_practice}</TableCell>
                        <TableCell>{activity.purpose_goal}</TableCell>
                        <TableCell>{activity.frequency}</TableCell>
                        <TableCell>{activity.how_to_do}</TableCell>
                        <TableCell>{activity.expected_impact}</TableCell>
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

export default SocialBeingTracker;
