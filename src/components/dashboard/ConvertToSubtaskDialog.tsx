import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownToLine, Check, Search } from "lucide-react";
import { toast } from "sonner";

type TaskPick = {
  id: string;
  name: string;
  deadline: string | null;
  project_id: string;
  status: string;
  projects?: {
    id: string;
    name: string;
    clients?: { id: string; name: string } | null;
  } | null;
};

export interface ConvertToSubtaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTask: { id: string; name: string } | null;
  onSuccess?: (result: { sourceTaskId: string; newSubtaskId: string; targetTaskId: string }) => void;
}

const mapTaskStatusToSubtaskStatus = (status: string | null | undefined) => {
  if (status === "Completed") return "Completed";
  if (status === "In Progress") return "In Progress";
  return "Not Started";
};

export function ConvertToSubtaskDialog({
  open,
  onOpenChange,
  sourceTask,
  onSuccess,
}: ConvertToSubtaskDialogProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<string | null>(null);

  const sourceTaskId = sourceTask?.id || null;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["all-tasks-for-convert-to-subtask"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          id,
          name,
          deadline,
          project_id,
          status,
          projects (
            id,
            name,
            clients (
              id,
              name
            )
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as TaskPick[];
    },
  });

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (tasks || []).filter((t) => {
      // Exclude the task being converted (can't be its own parent).
      if (sourceTaskId && t.id === sourceTaskId) return false;

      if (!q) return true;
      const taskName = (t.name || "").toLowerCase();
      const projectName = ((t.projects as any)?.name || "").toLowerCase();
      const clientName = (((t.projects as any)?.clients as any)?.name || "").toLowerCase();
      return taskName.includes(q) || projectName.includes(q) || clientName.includes(q);
    });
  }, [tasks, searchQuery, sourceTaskId]);

  const convertMutation = useMutation({
    mutationFn: async ({ sourceTaskId, targetTaskId }: { sourceTaskId: string; targetTaskId: string }) => {
      // Guard: don't allow converting a task that already has subtasks (would orphan them).
      const { data: existingSubtasks, error: existingSubtasksError } = await supabase
        .from("subtasks")
        .select("id")
        .eq("task_id", sourceTaskId)
        .limit(1);
      if (existingSubtasksError) throw existingSubtasksError;
      if ((existingSubtasks || []).length > 0) {
        throw new Error("This task already has subtasks. Move/delete them first, then convert.");
      }

      const { data: source, error: sourceError } = await supabase
        .from("tasks")
        .select("id, name, status, deadline, estimated_duration, assignee_id, date, scheduled_time")
        .eq("id", sourceTaskId)
        .single();
      if (sourceError) throw sourceError;

      const { data: target, error: targetError } = await supabase
        .from("tasks")
        .select("id, name, deadline")
        .eq("id", targetTaskId)
        .single();
      if (targetError) throw targetError;

      // Create new subtask under the selected parent.
      const { data: insertedSubtask, error: insertError } = await supabase
        .from("subtasks")
        .insert({
          name: source.name,
          task_id: targetTaskId,
          status: mapTaskStatusToSubtaskStatus(source.status),
          // Match MoveSubtasksDialog behavior: inherit parent task due date.
          deadline: target.deadline ?? null,
          estimated_duration: source.estimated_duration ?? null,
          assignee_id: source.assignee_id ?? null,
          // Preserve schedule so it stays in the same “shift/workload” views (but now as a subtask).
          date: source.date ?? null,
          scheduled_time: source.scheduled_time ?? null,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      // Repoint time entries from task → subtask so history stays intact.
      const { error: timeUpdateError } = await supabase
        .from("time_entries")
        .update({ task_id: insertedSubtask.id, entry_type: "subtask" })
        .eq("task_id", sourceTaskId);
      if (timeUpdateError) throw timeUpdateError;

      // Try to delete the original task (may fail due to other FK references like sprint/invoice).
      const { error: deleteError } = await supabase.from("tasks").delete().eq("id", sourceTaskId);
      if (deleteError) {
        // Fallback: keep record but remove it from shift/workload lists and visually mark it.
        const { error: fallbackError } = await supabase
          .from("tasks")
          .update({
            name: `${source.name} (converted to subtask of ${target.name})`,
            status: "Completed" as any,
            scheduled_time: null,
            slot_start_time: null,
            slot_start_datetime: null,
            slot_end_time: null,
            slot_end_datetime: null,
          })
          .eq("id", sourceTaskId);
        if (fallbackError) throw fallbackError;
      }

      return { sourceTaskId, newSubtaskId: insertedSubtask.id, targetTaskId };
    },
    onSuccess: (result) => {
      toast.success("Task converted to subtask");
      // Refresh the common task/subtask screens.
      queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks-for-convert-to-subtask"] });

      onOpenChange(false);
      setSearchQuery("");
      setSelectedParentTaskId(null);
      onSuccess?.(result);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to convert task to subtask");
      console.error(error);
    },
  });

  const selectedParent = tasks.find((t) => t.id === selectedParentTaskId);

  const handleConvert = () => {
    if (!sourceTaskId) return;
    if (!selectedParentTaskId) {
      toast.error("Please select a parent task");
      return;
    }
    if (selectedParentTaskId === sourceTaskId) {
      toast.error("Parent task can't be the same task");
      return;
    }
    convertMutation.mutate({ sourceTaskId, targetTaskId: selectedParentTaskId });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setSearchQuery("");
          setSelectedParentTaskId(null);
        }
      }}
    >
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Convert to Subtask
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4 overflow-hidden">
          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-xs text-muted-foreground mb-1">Task:</p>
            <p className="font-medium text-sm break-words">{sourceTask?.name || "—"}</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parent task by name, project, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="flex-1 min-h-0 border rounded-md">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? "No matching tasks found" : "No tasks available"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredTasks.map((task) => {
                  const isSelected = selectedParentTaskId === task.id;
                  const project = task.projects as any;
                  const projectName = project?.name || "";
                  const clientName = project?.clients?.name || "";
                  return (
                    <button
                      key={task.id}
                      onClick={() => setSelectedParentTaskId(task.id)}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm break-words ${isSelected ? "text-primary-foreground" : ""}`}>
                            {task.name}
                          </p>
                          <p className={`text-xs break-words ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {clientName} • {projectName}
                          </p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {selectedParent && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Convert into subtask of:</p>
              <p className="font-medium text-sm text-blue-800 dark:text-blue-200 break-words">{selectedParent.name}</p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={!sourceTaskId || !selectedParentTaskId || convertMutation.isPending}>
            {convertMutation.isPending ? "Converting..." : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

