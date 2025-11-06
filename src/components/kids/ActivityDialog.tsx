import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const activitySchema = z.object({
  category: z.string().min(1, "Category is required").max(100),
  activityName: z.string().min(1, "Activity name is required").max(200),
  description: z.string().min(1, "Description is required").max(500),
  frequency: z.string().min(1, "Frequency is required").max(50),
  duration: z.string().min(1, "Duration is required").max(50),
  toolsNeeded: z.string().min(1, "Tools needed is required").max(200),
  goal: z.string().min(1, "Goal is required").max(300),
  progressNotes: z.string().max(500).optional(),
  startDate: z.string().min(1, "Start date is required"),
});

const categories = [
  "IQ / Brain Development",
  "Emotional & Moral Values",
  "Sports & Physical Activities",
  "Creativity & Skills",
  "Communication & Social Skills",
  "Healthy Habits",
];

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

interface ActivityDialogProps {
  onActivityAdded: () => void;
  editActivity?: Activity | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ActivityDialog = ({ onActivityAdded, editActivity, open, onOpenChange }: ActivityDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const [formData, setFormData] = useState({
    category: "",
    activityName: "",
    description: "",
    frequency: "",
    duration: "",
    toolsNeeded: "",
    goal: "",
    progressNotes: "",
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (editActivity) {
      setFormData({
        category: editActivity.category,
        activityName: editActivity.activity_name,
        description: editActivity.description,
        frequency: editActivity.frequency,
        duration: editActivity.duration,
        toolsNeeded: editActivity.tools_needed,
        goal: editActivity.goal,
        progressNotes: editActivity.progress_notes || "",
        startDate: editActivity.start_date || new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData({
        category: "",
        activityName: "",
        description: "",
        frequency: "",
        duration: "",
        toolsNeeded: "",
        goal: "",
        progressNotes: "",
        startDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [editActivity]);

  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = activitySchema.parse(formData);
      setLoading(true);

      const dbData = {
        category: validatedData.category,
        activity_name: validatedData.activityName,
        description: validatedData.description,
        frequency: validatedData.frequency,
        duration: validatedData.duration,
        tools_needed: validatedData.toolsNeeded,
        goal: validatedData.goal,
        progress_notes: validatedData.progressNotes || "",
        start_date: validatedData.startDate,
      };

      if (editActivity) {
        const { error } = await supabase
          .from("kids_activities")
          .update(dbData)
          .eq("id", editActivity.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Activity updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("kids_activities")
          .insert(dbData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Activity added successfully",
        });
      }

      setFormData({
        category: "",
        activityName: "",
        description: "",
        frequency: "",
        duration: "",
        toolsNeeded: "",
        goal: "",
        progressNotes: "",
        startDate: new Date().toISOString().split('T')[0],
      });
      
      handleOpenChange(false);
      onActivityAdded();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: editActivity ? "Failed to update activity" : "Failed to add activity",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!editActivity && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editActivity ? "Edit Activity" : "Add New Activity"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activityName">Activity Name *</Label>
            <Input
              id="activityName"
              value={formData.activityName}
              onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description / How to Do *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Input
                id="frequency"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                maxLength={50}
                placeholder="e.g., Daily, Weekly"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration *</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                maxLength={50}
                placeholder="e.g., 10 mins"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="toolsNeeded">Tools Needed *</Label>
            <Input
              id="toolsNeeded"
              value={formData.toolsNeeded}
              onChange={(e) => setFormData({ ...formData, toolsNeeded: e.target.value })}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Goal / Expected Outcome *</Label>
            <Textarea
              id="goal"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              maxLength={300}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="progressNotes">Progress Notes</Label>
            <Textarea
              id="progressNotes"
              value={formData.progressNotes}
              onChange={(e) => setFormData({ ...formData, progressNotes: e.target.value })}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (editActivity ? "Updating..." : "Adding...") : (editActivity ? "Update Activity" : "Add Activity")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
