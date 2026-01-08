import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

type ProjectRow = {
  id: string;
  name: string;
  clients?: { name: string } | null;
};

export type MoveToProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskName?: string;
  currentProjectId?: string | null;
  onMoved?: () => void;
};

export function MoveToProjectDialog({
  open,
  onOpenChange,
  taskId,
  taskName,
  currentProjectId,
  onMoved,
}: MoveToProjectDialogProps) {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects-for-move-to-project"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          id,
          name,
          clients (
            name
          )
        `
        )
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as ProjectRow[];
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (newProjectId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ project_id: newProjectId })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Moved${taskName ? ` "${taskName}"` : ""} to project`);
      onOpenChange(false);
      onMoved?.();
      // Broad invalidation (prefix matches) so all variants refresh.
      queryClient.invalidateQueries({ queryKey: ["quick-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["hostlist-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["current-shift-workload"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-workload"] });
      queryClient.invalidateQueries({ queryKey: ["runningTasks"] });
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.message || "Failed to move task to project");
    },
  });

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search projects..." />
      <CommandList>
        <CommandEmpty>{isLoading ? "Loading..." : "No projects found."}</CommandEmpty>
        <CommandGroup heading="Move to project">
          {projects.map((p) => {
            const isCurrent = !!currentProjectId && p.id === currentProjectId;
            const clientName = (p as any)?.clients?.name || "";
            return (
              <CommandItem
                key={p.id}
                value={`${p.name} ${clientName}`.trim()}
                disabled={isCurrent || moveMutation.isPending}
                onSelect={() => {
                  if (isCurrent) return;
                  moveMutation.mutate(p.id);
                }}
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate">{p.name}</div>
                    {clientName ? (
                      <div className="truncate text-xs text-muted-foreground">{clientName}</div>
                    ) : null}
                  </div>
                  {isCurrent ? (
                    <span className="text-xs text-muted-foreground">Current</span>
                  ) : null}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}


