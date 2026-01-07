import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

interface MoveSubtasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSubtasks: { id: string; name: string; task_id: string }[];
  onSuccess?: () => void;
}

export function MoveSubtasksDialog({
  open,
  onOpenChange,
  selectedSubtasks,
  onSuccess,
}: MoveSubtasksDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch all tasks for selection
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["all-tasks-for-move"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          name,
          project_id,
          status,
          projects!inner (
            id,
            name,
            clients!inner (
              id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Filter tasks based on search query and exclude current parent tasks
  const filteredTasks = useMemo(() => {
    const currentParentIds = new Set(selectedSubtasks.map((s) => s.task_id));
    
    return tasks.filter((task) => {
      // Exclude tasks that are already parents of selected subtasks
      if (currentParentIds.has(task.id)) return false;
      
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      const taskName = task.name?.toLowerCase() || "";
      const projectName = (task.projects as any)?.name?.toLowerCase() || "";
      const clientName = (task.projects as any)?.clients?.name?.toLowerCase() || "";
      
      return (
        taskName.includes(query) ||
        projectName.includes(query) ||
        clientName.includes(query)
      );
    });
  }, [tasks, searchQuery, selectedSubtasks]);

  // Mutation to move subtasks
  const moveSubtasksMutation = useMutation({
    mutationFn: async (targetTaskId: string) => {
      const subtaskIds = selectedSubtasks.map((s) => s.id);
      
      const { error } = await supabase
        .from("subtasks")
        .update({ task_id: targetTaskId })
        .in("id", subtaskIds);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedSubtasks.length} subtask(s) moved successfully`);
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks-for-move"] });
      onOpenChange(false);
      setSearchQuery("");
      setSelectedTaskId(null);
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Error moving subtasks:", error);
      toast.error("Failed to move subtasks");
    },
  });

  const handleMove = () => {
    if (!selectedTaskId) {
      toast.error("Please select a target task");
      return;
    }
    moveSubtasksMutation.mutate(selectedTaskId);
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Move {selectedSubtasks.length} Subtask{selectedSubtasks.length > 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        {/* Body (scrollable area) */}
        <div className="flex-1 min-h-0 space-y-4 overflow-hidden">
          {/* Selected subtasks preview */}
          <div className="bg-muted/50 rounded-md p-3 max-h-28 overflow-auto">
            <p className="text-xs text-muted-foreground mb-2">Selected subtasks:</p>
            <div className="flex flex-wrap gap-1">
              {selectedSubtasks.slice(0, 5).map((subtask) => (
                <span
                  key={subtask.id}
                  className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md"
                >
                  {subtask.name.length > 30 ? subtask.name.slice(0, 30) + "..." : subtask.name}
                </span>
              ))}
              {selectedSubtasks.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{selectedSubtasks.length - 5} more
                </span>
              )}
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks by name, project, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Task list */}
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
                  const isSelected = selectedTaskId === task.id;
                  const project = task.projects as any;
                  const clientName = project?.clients?.name || "";
                  const projectName = project?.name || "";

                  return (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
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

          {/* Selected target preview */}
          {selectedTask && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-xs text-green-600 dark:text-green-400 mb-1">Move to:</p>
              <p className="font-medium text-sm text-green-800 dark:text-green-200">
                {selectedTask.name}
              </p>
            </div>
          )}
        </div>

        {/* Footer (always visible) */}
        <DialogFooter className="pt-3 border-t mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedTaskId || moveSubtasksMutation.isPending}
          >
            {moveSubtasksMutation.isPending ? "Moving..." : "Move Subtasks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
