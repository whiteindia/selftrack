import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Eye, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";

type HotProjectStatus = "Imp" | "On-Head" | "Targeted";

export const HotProjSection = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<"all" | string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const hotStatuses: HotProjectStatus[] = ["Imp", "On-Head", "Targeted"];

  const { data: hotProjects = [] } = useQuery({
    queryKey: ["hotproj-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
            id,
            name,
            status,
            clients (
              id,
              name
            )
          `
        )
        .in("status", hotStatuses)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const hotProjectIds = useMemo(() => hotProjects.map((p: any) => p.id), [hotProjects]);

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ["hotproj-tasks", hotProjectIds],
    enabled: hotProjectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name, status, deadline, project_id, created_at")
        .in("project_id", hotProjectIds)
        .order("deadline", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
  });

  const tasksByProject = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of tasks) {
      const list = map.get(t.project_id) || [];
      list.push(t);
      map.set(t.project_id, list);
    }
    return map;
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    let list = tasks;
    if (selectedProjectId !== "all") {
      list = list.filter((t) => t.project_id === selectedProjectId);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((t) => (t.name || "").toLowerCase().includes(q));
    }
    return list;
  }, [tasks, selectedProjectId, searchTerm]);

  const displayedTasksByProject = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of displayedTasks) {
      const list = map.get(t.project_id) || [];
      list.push(t);
      map.set(t.project_id, list);
    }
    return map;
  }, [displayedTasks]);

  const getTaskStatusClass = (status: string) => {
    if (status === "Completed") return "bg-green-100 text-green-800";
    if (status === "In Progress") return "bg-yellow-100 text-yellow-800";
    if (status === "Assigned") return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="px-6 py-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-600" />
                  HotProj
                </h2>
                <Badge variant="secondary" className="ml-2">
                  {tasks.length}
                </Badge>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-0 sm:px-6 py-6 space-y-4">
            {hotProjects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedProjectId === "all" ? "default" : "outline"}
                  onClick={() => setSelectedProjectId("all")}
                >
                  All Hot Projects
                </Button>
                {hotProjects.map((p: any) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={selectedProjectId === p.id ? "default" : "outline"}
                    onClick={() => setSelectedProjectId(p.id)}
                    title={`${p.name} (${p.status})`}
                  >
                    {p.name}
                    <Badge variant="secondary" className="ml-2">
                      {(tasksByProject.get(p.id) || []).length}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              {searchTerm && (
                <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
                  Clear
                </Button>
              )}
            </div>

            {hotProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No projects found with status Imp / On-Head / Targeted.
              </div>
            ) : isLoading ? (
              <div className="text-sm text-muted-foreground">Loading HotProj tasks…</div>
            ) : isError ? (
              <div className="text-sm text-destructive">Failed to load HotProj tasks.</div>
            ) : displayedTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No tasks found for the selected hot projects.</div>
            ) : (
              <div className="space-y-4">
                {hotProjects
                  .filter((p: any) => selectedProjectId === "all" || selectedProjectId === p.id)
                  .map((p: any) => {
                    const list = displayedTasksByProject.get(p.id) || [];
                    if (list.length === 0) return null;
                    return (
                      <div key={p.id} className="rounded-lg border p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {(p.clients?.name ? p.clients.name : "No client") as string} • Project status:{" "}
                              <span className="font-medium">{p.status}</span>
                            </div>
                          </div>
                          <Badge variant="secondary">{list.length} tasks</Badge>
                        </div>

                        <div className="space-y-2">
                          {list.map((t: any) => (
                            <div
                              key={t.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md bg-muted/30 p-2"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium break-words">{t.name}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span className={`px-2 py-0.5 rounded-full ${getTaskStatusClass(t.status)}`}>
                                    {t.status}
                                  </span>
                                  <span>
                                    Due: {t.deadline ? new Date(t.deadline).toLocaleDateString() : "No deadline"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/alltasks?highlight=${t.id}`)}
                                  className="h-7 px-2"
                                  title="View"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

