import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target, ChevronRight } from "lucide-react";
import { differenceInDays, parseISO, isAfter, startOfDay } from "date-fns";

export const FocusOnSection = () => {
  const navigate = useNavigate();

  // Fetch all time events (goals from Time-Until page)
  const { data: timeEvents = [] } = useQuery({
    queryKey: ["focus-on-time-events"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("time_events")
        .select("id, title, deadline")
        .eq("user_id", user.id)
        .order("deadline", { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  const getDaysRemaining = (deadline: string) => {
    const today = startOfDay(new Date());
    const deadlineDate = startOfDay(parseISO(deadline));
    return differenceInDays(deadlineDate, today);
  };

  const isOverdue = (deadline: string) => {
    const today = startOfDay(new Date());
    const deadlineDate = startOfDay(parseISO(deadline));
    return isAfter(today, deadlineDate);
  };

  const GoalItem = ({ event }: { event: { id: string; title: string; deadline: string } }) => {
    const daysRemaining = getDaysRemaining(event.deadline);
    const overdue = isOverdue(event.deadline);

    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border hover:bg-muted/80 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
        onClick={() => navigate("/time-until")}
      >
        <span className="font-medium text-sm text-foreground truncate max-w-[180px]">
          {event.title}
        </span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            overdue
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          }`}
        >
          {overdue
            ? `${Math.abs(daysRemaining)}d overdue`
            : daysRemaining === 0
            ? "Today"
            : daysRemaining === 1
            ? "1 day"
            : `${daysRemaining} days`}
        </span>
      </div>
    );
  };

  // Separate overdue and due goals
  const overdueGoals = timeEvents.filter(event => isOverdue(event.deadline));
  const dueGoals = timeEvents.filter(event => !isOverdue(event.deadline));

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Focus ON</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/time-until")}
          className="text-muted-foreground hover:text-foreground"
        >
          View all
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {timeEvents.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No goals set. Add goals in the Time-Until page to track them here.
        </p>
      ) : (
        <div className="space-y-2 overflow-hidden">
          {/* Row 1 - Overdue goals (Red) */}
          {overdueGoals.length > 0 && (
            <div className="relative overflow-hidden">
              <div className="flex gap-3 animate-marquee">
                {overdueGoals.map((event) => (
                  <GoalItem key={event.id} event={event} />
                ))}
                {/* Duplicate for seamless loop */}
                {overdueGoals.map((event) => (
                  <GoalItem key={`dup1-${event.id}`} event={event} />
                ))}
              </div>
            </div>
          )}
          
          {/* Row 2 - Due goals (Green) */}
          {dueGoals.length > 0 && (
            <div className="relative overflow-hidden">
              <div className="flex gap-3 animate-marquee-slow">
                {dueGoals.map((event) => (
                  <GoalItem key={event.id} event={event} />
                ))}
                {/* Duplicate for seamless loop */}
                {dueGoals.map((event) => (
                  <GoalItem key={`dup2-${event.id}`} event={event} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
