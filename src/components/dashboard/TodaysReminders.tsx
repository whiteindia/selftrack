import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, Building, Calendar, Eye, CheckCircle } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatToIST } from '@/utils/timezoneUtils';

interface TodayReminderTask {
  id: string;
  name: string;
  reminder_datetime: string | null;
  slot_start_datetime: string | null;
  scheduled_time: string | null;
  status: string;
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
  type: 'reminder' | 'slot';
}

const TodaysReminders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: todaysReminders = [], isLoading } = useQuery({
    queryKey: ['todays-reminders', user?.id],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const todayStr = today.toISOString().split('T')[0];

      // Fetch tasks with reminders for today
      const { data: reminderTasks, error: reminderError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          reminder_datetime,
          slot_start_datetime,
          scheduled_time,
          status,
          project:projects(
            id,
            name,
            client:clients(
              id,
              name
            )
          )
        `)
        .not('reminder_datetime', 'is', null)
        .gte('reminder_datetime', startOfDay.toISOString())
        .lt('reminder_datetime', endOfDay.toISOString())
        .order('reminder_datetime', { ascending: true });

      if (reminderError) throw reminderError;

      // Fetch tasks with slots for today (slot_start_datetime or scheduled_time)
      const { data: slotTasks, error: slotError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          reminder_datetime,
          slot_start_datetime,
          scheduled_time,
          status,
          project:projects(
            id,
            name,
            client:clients(
              id,
              name
            )
          )
        `)
        .or(`slot_start_datetime.gte.${startOfDay.toISOString()},scheduled_time.not.is.null`)
        .order('slot_start_datetime', { ascending: true });

      if (slotError) throw slotError;

      // Process reminder tasks
      const reminders = (reminderTasks || [])
        .filter(task => task.reminder_datetime && isToday(parseISO(task.reminder_datetime)))
        .map(task => ({ ...task, type: 'reminder' as const }));

      // Process slot tasks - filter for today
      const slots = (slotTasks || [])
        .filter(task => {
          // Check slot_start_datetime
          if (task.slot_start_datetime && isToday(parseISO(task.slot_start_datetime))) {
            return true;
          }
          // Check scheduled_time (it's just time, needs date context from task date)
          return false;
        })
        .filter(task => !reminders.some(r => r.id === task.id)) // Avoid duplicates
        .map(task => ({ ...task, type: 'slot' as const }));

      // Combine and sort by time
      const combined = [...reminders, ...slots].sort((a, b) => {
        const timeA = a.type === 'reminder' ? a.reminder_datetime : a.slot_start_datetime;
        const timeB = b.type === 'reminder' ? b.reminder_datetime : b.slot_start_datetime;
        if (!timeA) return 1;
        if (!timeB) return -1;
        return new Date(timeA).getTime() - new Date(timeB).getTime();
      });

      return combined as TodayReminderTask[];
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const markTaskDoneMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'Completed' })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todays-reminders'] });
      toast.success('Task marked as completed');
    },
    onError: (error) => {
      toast.error('Failed to mark task as done');
      console.error('Error marking task as done:', error);
    },
  });

  const handleViewTask = (taskId: string) => {
    // Navigate to alltasks page with the specific task highlighted
    window.location.href = `/alltasks?highlight=${taskId}`;
  };

  const handleMarkDone = (taskId: string) => {
    markTaskDoneMutation.mutate(taskId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            Today's Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-500" />
          Today's Reminders
          {todaysReminders.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {todaysReminders.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todaysReminders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium mb-1">No reminders for today!</p>
            <p className="text-sm">You're all caught up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysReminders.map((task) => (
              <div
                key={task.id}
                className="relative p-3 bg-orange-50 rounded-lg border border-orange-200"
              >
                {/* Mobile: Buttons at top-right */}
                <div className="flex sm:hidden absolute top-2 right-2 flex-col gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewTask(task.id)}
                    className="h-7 px-2 text-xs"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  {task.status !== 'Completed' && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkDone(task.id)}
                      disabled={markTaskDoneMutation.isPending}
                      className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Desktop: Original layout */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm truncate">{task.name}</h4>
                      <Badge 
                        variant={task.status === 'Completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {task.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-orange-500" />
                        <span className="font-medium text-orange-700">
                          {task.type === 'reminder' && task.reminder_datetime 
                            ? formatToIST(task.reminder_datetime, 'h:mm a') 
                            : task.slot_start_datetime 
                              ? formatToIST(task.slot_start_datetime, 'h:mm a')
                              : 'N/A'} IST
                        </span>
                        <Badge variant="outline" className="text-xs ml-1">
                          {task.type === 'reminder' ? 'Reminder' : 'Slot'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span>{task.project.client.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{task.project.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewTask(task.id)}
                      className="h-8 px-3 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    {task.status !== 'Completed' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkDone(task.id)}
                        disabled={markTaskDoneMutation.isPending}
                        className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mobile: Content with space for buttons */}
                <div className="sm:hidden pr-16">
                  <div className="mb-2">
                    <h4 className="font-medium text-sm leading-tight mb-1">{task.name}</h4>
                    <Badge 
                      variant={task.status === 'Completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {task.status}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col gap-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-orange-500" />
                      <span className="font-medium text-orange-700">
                        {task.type === 'reminder' && task.reminder_datetime 
                          ? formatToIST(task.reminder_datetime, 'h:mm a') 
                          : task.slot_start_datetime 
                            ? formatToIST(task.slot_start_datetime, 'h:mm a')
                            : 'N/A'} IST
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {task.type === 'reminder' ? 'Reminder' : 'Slot'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      <span>{task.project.client.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{task.project.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodaysReminders;
