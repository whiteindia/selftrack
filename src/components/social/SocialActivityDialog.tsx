import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const activitySchema = z.object({
  category: z.string().min(1, "Category is required"),
  activity_practice: z.string().min(1, "Activity/Practice is required"),
  purpose_goal: z.string().min(1, "Purpose/Goal is required"),
  frequency: z.string().min(1, "Frequency is required"),
  how_to_do: z.string().min(1, "How to do is required"),
  expected_impact: z.string().min(1, "Expected impact is required"),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface SocialActivity {
  id: string;
  category: string;
  activity_practice: string;
  purpose_goal: string;
  frequency: string;
  how_to_do: string;
  expected_impact: string;
}

interface SocialActivityDialogProps {
  onActivityAdded: () => void;
  editActivity?: SocialActivity | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SocialActivityDialog = ({ onActivityAdded, editActivity, open, onOpenChange }: SocialActivityDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
  });

  useEffect(() => {
    if (editActivity) {
      reset({
        category: editActivity.category,
        activity_practice: editActivity.activity_practice,
        purpose_goal: editActivity.purpose_goal,
        frequency: editActivity.frequency,
        how_to_do: editActivity.how_to_do,
        expected_impact: editActivity.expected_impact,
      });
    } else {
      reset({
        category: "",
        activity_practice: "",
        purpose_goal: "",
        frequency: "",
        how_to_do: "",
        expected_impact: "",
      });
    }
  }, [editActivity, reset]);

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen && !editActivity) {
      reset();
    }
  };

  const onSubmit = async (data: ActivityFormData) => {
    try {
      if (editActivity) {
        const { error } = await supabase
          .from("social_activities")
          .update(data)
          .eq("id", editActivity.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Activity updated successfully",
        });
      } else {
        const { error } = await supabase.from("social_activities").insert([{
          category: data.category,
          activity_practice: data.activity_practice,
          purpose_goal: data.purpose_goal,
          frequency: data.frequency,
          how_to_do: data.how_to_do,
          expected_impact: data.expected_impact,
        }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Activity added successfully",
        });
      }

      handleOpenChange(false);
      reset();
      onActivityAdded();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editActivity ? "update" : "add"} activity`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {!editActivity && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Activity
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editActivity ? "Edit Activity" : "Add New Activity"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Input id="category" {...register("category")} />
            {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <Label htmlFor="activity_practice">Activity / Practice</Label>
            <Input id="activity_practice" {...register("activity_practice")} />
            {errors.activity_practice && <p className="text-sm text-destructive mt-1">{errors.activity_practice.message}</p>}
          </div>

          <div>
            <Label htmlFor="purpose_goal">Purpose / Goal</Label>
            <Textarea id="purpose_goal" {...register("purpose_goal")} />
            {errors.purpose_goal && <p className="text-sm text-destructive mt-1">{errors.purpose_goal.message}</p>}
          </div>

          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Input id="frequency" {...register("frequency")} />
            {errors.frequency && <p className="text-sm text-destructive mt-1">{errors.frequency.message}</p>}
          </div>

          <div>
            <Label htmlFor="how_to_do">How to Do It Effectively</Label>
            <Textarea id="how_to_do" {...register("how_to_do")} />
            {errors.how_to_do && <p className="text-sm text-destructive mt-1">{errors.how_to_do.message}</p>}
          </div>

          <div>
            <Label htmlFor="expected_impact">Expected Impact</Label>
            <Textarea id="expected_impact" {...register("expected_impact")} />
            {errors.expected_impact && <p className="text-sm text-destructive mt-1">{errors.expected_impact.message}</p>}
          </div>

          <Button type="submit" className="w-full">
            {editActivity ? "Update Activity" : "Add Activity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
