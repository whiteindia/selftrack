import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const skillSchema = z.object({
  skill_category: z.string().min(1, "Category is required"),
  specific_skill: z.string().min(1, "Skill name is required"),
  description: z.string().min(1, "Description is required"),
  practice_frequency: z.string().min(1, "Practice frequency is required"),
  start_date: z.string().min(1, "Start date is required"),
});

type SkillFormData = z.infer<typeof skillSchema>;

interface SportsSkill {
  id: string;
  skill_category: string;
  specific_skill: string;
  description: string;
  practice_frequency: string;
  start_date: string;
}

interface SportsSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill?: SportsSkill | null;
  onSkillAdded?: () => void;
}

export function SportsSkillDialog({
  open,
  onOpenChange,
  skill,
  onSkillAdded,
}: SportsSkillDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<SkillFormData>({
    resolver: zodResolver(skillSchema),
  });

  const practiceFrequency = watch("practice_frequency");

  useEffect(() => {
    if (skill) {
      setValue("skill_category", skill.skill_category);
      setValue("specific_skill", skill.specific_skill);
      setValue("description", skill.description);
      setValue("practice_frequency", skill.practice_frequency);
      setValue("start_date", skill.start_date);
    } else {
      reset();
    }
  }, [skill, setValue, reset]);

  const onSubmit = async (data: SkillFormData) => {
    setIsSubmitting(true);

    try {
      const skillData = {
        skill_category: data.skill_category,
        specific_skill: data.specific_skill,
        description: data.description,
        practice_frequency: data.practice_frequency,
        start_date: data.start_date,
      };

      if (skill) {
        const { error } = await supabase
          .from("sports_skills")
          .update(skillData)
          .eq("id", skill.id);

        if (error) throw error;
        toast.success("Skill updated successfully");
      } else {
        const { error } = await supabase
          .from("sports_skills")
          .insert([skillData]);

        if (error) throw error;
        toast.success("Skill added successfully");
      }

      reset();
      onOpenChange(false);
      if (onSkillAdded) onSkillAdded();
    } catch (error) {
      console.error("Error saving skill:", error);
      toast.error("Failed to save skill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {skill ? "Edit Sports Skill" : "Add Sports Skill"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill_category">Skill Category</Label>
            <Input
              id="skill_category"
              {...register("skill_category")}
              placeholder="e.g., Cricket, Football"
            />
            {errors.skill_category && (
              <p className="text-sm text-destructive">
                {errors.skill_category.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specific_skill">Specific Skill</Label>
            <Input
              id="specific_skill"
              {...register("specific_skill")}
              placeholder="e.g., Batting Technique"
            />
            {errors.specific_skill && (
              <p className="text-sm text-destructive">
                {errors.specific_skill.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe the skill and its objectives"
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="practice_frequency">Practice Frequency</Label>
            <Select
              value={practiceFrequency}
              onValueChange={(value) => setValue("practice_frequency", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="5x / week">5x / week</SelectItem>
                <SelectItem value="4x / week">4x / week</SelectItem>
                <SelectItem value="3x / week">3x / week</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {errors.practice_frequency && (
              <p className="text-sm text-destructive">
                {errors.practice_frequency.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              {...register("start_date")}
            />
            {errors.start_date && (
              <p className="text-sm text-destructive">
                {errors.start_date.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : skill
                ? "Update"
                : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
