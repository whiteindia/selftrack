import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatUTCToISTInput, convertISTToUTC } from "@/utils/timezoneUtils";

interface NetworkPerson {
  id?: string;
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
  follow_up_date?: string;
}

interface NetworkPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: NetworkPerson | null;
}

const RELATIONSHIP_TYPES = [
  "Job / Career",
  "Education",
  "Support",
  "Help",
  "Business",
  "Collaboration",
  "Financial",
  "Mentorship",
  "Friends",
  "Client",
  "Learning",
  "Media / PR",
  "Alumni",
  "Investor",
  "Community"
];

const WORK_TYPES = [
  "Working Professional",
  "Business Owner",
  "Freelancer",
  "Student",
  "Independent Consultant",
  "Teaching / Research",
  "Employee",
  "Volunteer",
  "Investor"
];

const INFLUENCE_LEVELS = ["Low", "Medium", "High"];

const ACTS_TO_ENGAGE = [
  "Birthday Call",
  "Anniversary Call",
  "Festival Wishes",
  "Congratulate on Achievement",
  "Attend Event",
  "Invite for Coffee",
  "Take to New Restaurant",
  "Help in Job Search",
  "Connect to HR/Recruiter",
  "Help for Loan",
  "Connect to Bank Manager",
  "Help with Business/GST",
  "Introduce to Contact",
  "Send Useful Info",
  "Periodic Check-In",
  "Help with Car Interiors",
  "Help with Personal Task",
  "Mentorship / Guidance"
];

export function NetworkPersonDialog({ open, onOpenChange, person }: NetworkPersonDialogProps) {
  const form = useForm<NetworkPerson>({
    defaultValues: {
      name: "",
      relationship_type: "",
      role_position: "",
      industry_domain: "",
      work_type: "",
      influence_level: "Medium",
      acts_to_engage: "",
      last_conversation_summary: "",
      last_conversation_date: "",
      follow_up_plan: "",
      follow_up_date: ""
    }
  });

  useEffect(() => {
    if (person) {
      form.reset({
        ...person,
        follow_up_date: person.follow_up_date ? formatUTCToISTInput(person.follow_up_date as string) : ""
      });
    } else {
      form.reset({
        name: "",
        relationship_type: "",
        role_position: "",
        industry_domain: "",
        work_type: "",
        influence_level: "Medium",
        acts_to_engage: "",
        last_conversation_summary: "",
        last_conversation_date: "",
        follow_up_plan: "",
        follow_up_date: ""
      });
    }
  }, [person, form]);

  const onSubmit = async (data: NetworkPerson) => {
    try {
      const payload = {
        ...data,
        follow_up_date: data.follow_up_date ? convertISTToUTC(data.follow_up_date) : null
      };
      if (person?.id) {
        const { error } = await supabase
          .from("network_people")
          .update(payload)
          .eq("id", person.id);

        if (error) throw error;
        toast.success("Contact updated successfully");
      } else {
        const { error } = await supabase
          .from("network_people")
          .insert([payload]);

        if (error) throw error;
        toast.success("Contact added successfully");
      }

      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to save contact");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{person ? "Edit Contact" : "Add New Contact"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name / Profile</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter contact name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationship_type"
              rules={{ required: "Relationship type is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RELATIONSHIP_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role_position"
              rules={{ required: "Role / Position is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role / Position</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Senior Software Engineer" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry_domain"
              rules={{ required: "Industry / Domain is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry / Domain</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., IT / Product Development" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="work_type"
              rules={{ required: "Work type is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WORK_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="influence_level"
              rules={{ required: "Influence level is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Influence Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select influence level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INFLUENCE_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acts_to_engage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acts2Engage (To Keep In Touch / Build Rapport)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select engagement action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTS_TO_ENGAGE.map((act) => (
                        <SelectItem key={act} value={act}>
                          {act}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_conversation_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Conversation Summary</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Brief summary of last conversation" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_conversation_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Conversation Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="follow_up_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Date & Time (IST)</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="follow_up_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Plan</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Next steps or reminder for the relationship" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {person ? "Update Contact" : "Add Contact"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
