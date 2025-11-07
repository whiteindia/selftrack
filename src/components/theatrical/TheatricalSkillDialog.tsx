import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const skillSchema = z.object({
  skill_category: z.string().min(1, "Skill category is required"),
  specific_skill: z.string().min(1, "Specific skill is required"),
  description: z.string().min(1, "Description is required"),
  practice_frequency: z.string().min(1, "Practice frequency is required"),
  start_date: z.string().min(1, "Start date is required"),
});

type SkillFormData = z.infer<typeof skillSchema>;

interface TheatricalSkill {
  id?: string;
  skill_category: string;
  specific_skill: string;
  description: string;
  practice_frequency: string;
  start_date: string;
}

interface TheatricalSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill?: TheatricalSkill | null;
  onSkillAdded?: () => void;
}

export function TheatricalSkillDialog({ 
  open, 
  onOpenChange, 
  skill, 
  onSkillAdded 
}: TheatricalSkillDialogProps) {
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
    defaultValues: {
      skill_category: "",
      specific_skill: "",
      description: "",
      practice_frequency: "",
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (skill) {
      setValue("skill_category", skill.skill_category);
      setValue("specific_skill", skill.specific_skill);
      setValue("description", skill.description);
      setValue("practice_frequency", skill.practice_frequency);
      setValue("start_date", skill.start_date);
    } else {
      reset({
        skill_category: "",
        specific_skill: "",
        description: "",
        practice_frequency: "",
        start_date: new Date().toISOString().split('T')[0],
      });
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

      if (skill?.id) {
        const { error } = await supabase
          .from("theatrical_arts_skills")
          .update(skillData)
          .eq("id", skill.id);
        
        if (error) throw error;
        toast.success("Skill updated successfully");
      } else {
        const { error } = await supabase
          .from("theatrical_arts_skills")
          .insert([skillData]);
        
        if (error) throw error;
        toast.success("Skill added successfully");
      }
      
      onOpenChange(false);
      if (onSkillAdded) onSkillAdded();
      reset();
    } catch (error) {
      console.error("Error saving skill:", error);
      toast.error("Failed to save skill");
    } finally {
      setIsSubmitting(false);
    }
  };

  const practiceFrequency = watch("practice_frequency");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{skill ? "Edit Skill" : "Add New Skill"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="skill_category">Skill Category</Label>
            <Input
              id="skill_category"
              {...register("skill_category")}
              placeholder="e.g., Acting, Script Writing, Directing"
            />
            {errors.skill_category && (
              <p className="text-sm text-destructive mt-1">{errors.skill_category.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="specific_skill">Specific Skill</Label>
            <Input
              id="specific_skill"
              {...register("specific_skill")}
              placeholder="e.g., Voice Modulation, Character Development"
            />
            {errors.specific_skill && (
              <p className="text-sm text-destructive mt-1">{errors.specific_skill.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe the skill and what it involves"
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
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
                <SelectItem value="2x / week">2x / week</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {errors.practice_frequency && (
              <p className="text-sm text-destructive mt-1">{errors.practice_frequency.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              {...register("start_date")}
            />
            {errors.start_date && (
              <p className="text-sm text-destructive mt-1">{errors.start_date.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : skill ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
