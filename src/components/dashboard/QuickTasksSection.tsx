import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LiveTimer from "./LiveTimer";
import CompactTimerControls from "./CompactTimerControls";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "date-fns";

type TimeFilter = "today" | "tomorrow" | "laterThisWeek" | "nextWeek";

export const QuickTasksSection = () => {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");

  // Fetch the project
  const { data: project } = useQuery({
    queryKey: ["miscellaneous-project"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id")
        .eq("name", "Miscellanious-Quick-Temp-Orglater")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch tasks from the project
  const { data: tasks, refetch } = useQuery({
    queryKey: ["quick-tasks", project?.id],
    queryFn: async () => {
      if (!project?.id) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          name,
          deadline,
          status,
          project_id
        `)
        .eq("project_id", project.id)
        .neq("status", "Completed")
        .order("deadline", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!project?.id,
  });

  // Fetch active time entries for these tasks
  const { data: timeEntries } = useQuery({
    queryKey: ["quick-task-time-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .is("end_time", null);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
  });

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowStart = startOfDay(addDays(now, 1));
    const tomorrowEnd = endOfDay(addDays(now, 1));
    const thisWeekEnd = endOfWeek(now);
    const nextWeekStart = startOfWeek(addDays(now, 7));
    const nextWeekEnd = endOfWeek(addDays(now, 7));

    return tasks.filter((task) => {
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);

      switch (timeFilter) {
        case "today":
          return deadline >= todayStart && deadline <= todayEnd;
        case "tomorrow":
          return deadline >= tomorrowStart && deadline <= tomorrowEnd;
        case "laterThisWeek":
          return deadline > tomorrowEnd && deadline <= thisWeekEnd;
        case "nextWeek":
          return deadline >= nextWeekStart && deadline <= nextWeekEnd;
        default:
          return true;
      }
    });
  }, [tasks, timeFilter]);

  const handleStartTask = async (taskId: string) => {
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("email", (await supabase.auth.getUser()).data.user?.email)
      .single();

    if (!employee) return;

    await supabase.from("time_entries").insert({
      task_id: taskId,
      employee_id: employee.id,
      entry_type: "task",
      start_time: new Date().toISOString(),
    });

    refetch();
  };

  if (!project || !tasks || tasks.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quick Tasks</h2>
          <div className="flex gap-2">
            <Button
              variant={timeFilter === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("today")}
            >
              Today
            </Button>
            <Button
              variant={timeFilter === "tomorrow" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("tomorrow")}
            >
              Tomorrow
            </Button>
            <Button
              variant={timeFilter === "laterThisWeek" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("laterThisWeek")}
            >
              Later This Week
            </Button>
            <Button
              variant={timeFilter === "nextWeek" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("nextWeek")}
            >
              Next Week
            </Button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks for this time period</p>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const activeEntry = timeEntries?.find((entry) => entry.task_id === task.id);
              const isPaused = activeEntry?.timer_metadata?.includes("[PAUSED at");

              return (
                <Card key={task.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{task.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {activeEntry ? (
                        <>
                          <div className="flex flex-col items-end gap-1">
                            <LiveTimer
                              startTime={activeEntry.start_time}
                              isPaused={isPaused}
                              timerMetadata={activeEntry.timer_metadata}
                            />
                            <span className="text-xs text-muted-foreground">
                              {isPaused ? "Paused" : "Running"}
                            </span>
                          </div>
                          <CompactTimerControls
                            taskId={task.id}
                            taskName={task.name}
                            entryId={activeEntry.id}
                            timerMetadata={activeEntry.timer_metadata}
                            onTimerUpdate={refetch}
                          />
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleStartTask(task.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/tasks?task=${task.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
