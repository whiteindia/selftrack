import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatToIST } from '@/utils/timezoneUtils';
import { sendTelegramNotification as sendTelegramNotificationApi } from '@/api/telegram-notification';

interface ReminderTask {
  id: string;
  name: string;
  reminder_datetime: string;
}

interface SprintDeadline {
  id: string;
  title: string;
  deadline: string;
  project?: {
    name: string;
    client: {
      name: string;
    };
  };
}

interface TaskSlot {
  id: string;
  name: string;
  slot_start_datetime: string;
  slot_end_datetime: string;
  project?: {
    name: string;
    client: {
      name: string;
    };
  };
}

interface NotificationRead {
  notification_type: 'task_reminder' | 'sprint_deadline' | 'task_slot' | 'overdue' | 'due_soon';
  notification_id: string;
}

function mapUiTypeToTelegramType(uiType: string): 'task_reminder' | 'sprint_deadline' | 'task_slot' | 'overdue' | 'due_soon' | null {
  switch (uiType) {
    case 'Due Soon':
      return 'due_soon';
    case 'Overdue':
      return 'overdue';
    case 'Sprint Deadlines':
      return 'sprint_deadline';
    case 'Task Time Slots':
      return 'task_slot';
    default:
      return null;
  }
}

export const useReminderNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifiedItems, setNotifiedItems] = useState<Set<string>>(new Set());

  // Query for notification reads from Supabase
  const { data: readNotifications = [] } = useQuery({
    queryKey: ['notification-reads', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_reads')
        .select('notification_type, notification_id')
        .eq('user_id', user!.id);

      if (error) throw error;
      return data as NotificationRead[];
    },
    enabled: !!user,
  });

  // Query for tasks with reminders
  const { data: reminderTasks = [] } = useQuery({
    queryKey: ['reminder-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, name, reminder_datetime')
        .not('reminder_datetime', 'is', null)
        .order('reminder_datetime', { ascending: true });

      if (error) throw error;
      return data as ReminderTask[];
    },
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });

  // Query for sprint deadlines
  const { data: sprintDeadlines = [] } = useQuery({
    queryKey: ['sprint-deadlines', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select(`
          id,
          title,
          deadline,
          project:projects(
            name,
            client:clients(name)
          )
        `)
        .order('deadline', { ascending: true });

      if (error) throw error;
      return data as SprintDeadline[];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Query for task slots
  const { data: taskSlots = [] } = useQuery({
    queryKey: ['task-slots', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          slot_start_datetime,
          slot_end_datetime,
          project:projects(
            name,
            client:clients(name)
          )
        `)
        .not('slot_start_datetime', 'is', null)
        .not('slot_end_datetime', 'is', null)
        .order('slot_start_datetime', { ascending: true });

      if (error) throw error;
      return data as TaskSlot[];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Mutation to mark notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'task_reminder' | 'sprint_deadline' | 'task_slot' | 'overdue' | 'due_soon'; id: string }) => {
      const { error } = await supabase
        .from('notification_reads')
        .upsert({
          user_id: user!.id,
          notification_type: type,
          notification_id: id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all notification-related queries to ensure count updates
      queryClient.invalidateQueries({ queryKey: ['notification-reads'] });
      queryClient.invalidateQueries({ queryKey: ['reminder-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprint-deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['task-slots'] });
    },
  });

  // Calculate notification counts and due items for each type
  const now = new Date();
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Task reminders - due soon (within 30 minutes)
  const dueSoonTasks = reminderTasks.filter(task => {
    const reminderTime = new Date(task.reminder_datetime);
    return reminderTime <= thirtyMinutesFromNow && reminderTime > now;
  });

  const overdueTasks = reminderTasks.filter(task => {
    const reminderTime = new Date(task.reminder_datetime);
    return reminderTime <= now;
  });

  // Sprint deadlines - due within 24 hours
  const upcomingSprintDeadlines = sprintDeadlines.filter(sprint => {
    const deadlineTime = new Date(sprint.deadline);
    return deadlineTime <= twentyFourHoursFromNow && deadlineTime > now;
  });

  const overdueSprintDeadlines = sprintDeadlines.filter(sprint => {
    const deadlineTime = new Date(sprint.deadline);
    return deadlineTime <= now;
  });

  // Task slots - starting within 30 minutes
  const upcomingTaskSlots = taskSlots.filter(slot => {
    const slotStartTime = new Date(slot.slot_start_datetime);
    return slotStartTime <= thirtyMinutesFromNow && slotStartTime > now;
  });

  const overdueTaskSlots = taskSlots.filter(slot => {
    const slotStartTime = new Date(slot.slot_start_datetime);
    return slotStartTime <= now;
  });

  // Create read notification lookup
  const readNotificationSet = new Set(
    readNotifications.map(read => `${read.notification_type}:${read.notification_id}`)
  );

  // Filter out read notifications
  const unreadDueSoonTasks = dueSoonTasks.filter(
    task => !readNotificationSet.has(`due_soon:${task.id}`)
  );
  const unreadOverdueTasks = overdueTasks.filter(
    task => !readNotificationSet.has(`overdue:${task.id}`)
  );
  const unreadUpcomingSprintDeadlines = upcomingSprintDeadlines.filter(
    sprint => !readNotificationSet.has(`sprint_deadline:${sprint.id}`)
  );
  const unreadOverdueSprintDeadlines = overdueSprintDeadlines.filter(
    sprint => !readNotificationSet.has(`sprint_deadline:${sprint.id}`)
  );
  const unreadUpcomingTaskSlots = upcomingTaskSlots.filter(
    slot => !readNotificationSet.has(`task_slot:${slot.id}`)
  );
  const unreadOverdueTaskSlots = overdueTaskSlots.filter(
    slot => !readNotificationSet.has(`task_slot:${slot.id}`)
  );

  const totalNotificationCount = 
    unreadDueSoonTasks.length + 
    unreadOverdueTasks.length + 
    unreadUpcomingSprintDeadlines.length + 
    unreadOverdueSprintDeadlines.length + 
    unreadUpcomingTaskSlots.length + 
    unreadOverdueTaskSlots.length;


  // Browser notification functions
  const sendBrowserNotification = (item: any, type: 'task' | 'sprint' | 'slot') => {
    const notificationKey = `${type}:${item.id}`;
    if (!notificationsEnabled || notifiedItems.has(notificationKey)) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      let title = '';
      let body = '';
      let url = '';

      switch (type) {
        case 'task':
          title = `Task Reminder: ${item.name}`;
          body = `Scheduled for ${formatToIST(item.reminder_datetime, 'h:mm a')}`;
          url = '/tasks';
          break;
        case 'sprint':
          title = `Sprint Deadline: ${item.title}`;
          body = `Due ${new Date(item.deadline).toLocaleString()}`;
          url = '/sprints';
          break;
        case 'slot':
          title = `Task Slot: ${item.name}`;
          body = `Starts at ${formatToIST(item.slot_start_datetime, 'h:mm a')}`;
          url = '/tasks';
          break;
      }

      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: notificationKey,
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = url;
        notification.close();
      };

      setNotifiedItems(prev => new Set([...prev, notificationKey]));
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      return permission === 'granted';
    }
    return false;
  };

  // Send Telegram notifications
  const sendTelegramNotification = async (item: any, type: 'task_reminder' | 'sprint_deadline' | 'task_slot' | 'overdue' | 'due_soon') => {
    try {
      const result = await sendTelegramNotificationApi({
        user_id: user!.id,
        notification_type: type,
        item_data: {
          id: item.id,
          name: item.name,
          datetime: type === 'due_soon' ? item.reminder_datetime :
                   type === 'task_reminder' ? item.reminder_datetime : 
                   type === 'sprint_deadline' ? item.deadline : 
                   type === 'task_slot' ? item.slot_start_datetime : item.reminder_datetime,
          project_name: item.project?.name || item.project_name || 'N/A',
          client_name: item.project?.client?.name || item.client_name || 'N/A',
          status: item.status,
        },
      });

      if (!result.success) {
        console.error('Failed to send Telegram notification');
      }
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  };

  // Send browser and Telegram notifications
  useEffect(() => {
    // Always send Telegram notifications if there are unread items
    unreadDueSoonTasks.forEach(task => sendTelegramNotification(task, 'due_soon'));
    unreadOverdueTasks.forEach(task => sendTelegramNotification(task, 'overdue'));
    unreadUpcomingSprintDeadlines.forEach(sprint => sendTelegramNotification(sprint, 'sprint_deadline'));
    unreadOverdueSprintDeadlines.forEach(sprint => sendTelegramNotification(sprint, 'overdue'));
    unreadUpcomingTaskSlots.forEach(slot => sendTelegramNotification(slot, 'task_slot'));
    unreadOverdueTaskSlots.forEach(slot => sendTelegramNotification(slot, 'overdue'));

    // Only send browser notifications if enabled
    if (notificationsEnabled) {
      unreadDueSoonTasks.forEach(task => sendBrowserNotification(task, 'task'));
      unreadUpcomingSprintDeadlines.forEach(sprint => sendBrowserNotification(sprint, 'sprint'));
      unreadUpcomingTaskSlots.forEach(slot => sendBrowserNotification(slot, 'slot'));
    }
  }, [unreadDueSoonTasks, unreadOverdueTasks, unreadUpcomingSprintDeadlines, unreadOverdueSprintDeadlines, unreadUpcomingTaskSlots, unreadOverdueTaskSlots, notificationsEnabled]);

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const allNotifications: Array<{ type: 'task_reminder' | 'sprint_deadline' | 'task_slot' | 'overdue' | 'due_soon', id: string }> = [
      ...dueSoonTasks.map(task => ({ type: 'due_soon' as const, id: task.id })),
      ...overdueTasks.map(task => ({ type: 'overdue' as const, id: task.id })),
      ...upcomingSprintDeadlines.map(sprint => ({ type: 'sprint_deadline' as const, id: sprint.id })),
      ...overdueSprintDeadlines.map(sprint => ({ type: 'overdue' as const, id: sprint.id })),
      ...upcomingTaskSlots.map(slot => ({ type: 'task_slot' as const, id: slot.id })),
      ...overdueTaskSlots.map(slot => ({ type: 'overdue' as const, id: slot.id })),
    ];

    for (const notification of allNotifications) {
      await markAsReadMutation.mutateAsync(notification);
    }
  };

  // Mark individual notification as read
  const markAsRead = (type: 'task_reminder' | 'sprint_deadline' | 'task_slot' | 'overdue' | 'due_soon', id: string) => {
    markAsReadMutation.mutate({ type, id });
  };

  return {
    totalNotificationCount,
    // Task reminders
    dueSoonTasks: unreadDueSoonTasks,
    overdueTasks: unreadOverdueTasks,
    allDueSoonTasks: dueSoonTasks,
    allOverdueTasks: overdueTasks,
    // Sprint deadlines
    upcomingSprintDeadlines: unreadUpcomingSprintDeadlines,
    overdueSprintDeadlines: unreadOverdueSprintDeadlines,
    allUpcomingSprintDeadlines: upcomingSprintDeadlines,
    allOverdueSprintDeadlines: overdueSprintDeadlines,
    // Task slots
    upcomingTaskSlots: unreadUpcomingTaskSlots,
    overdueTaskSlots: unreadOverdueTaskSlots,
    allUpcomingTaskSlots: upcomingTaskSlots,
    allOverdueTaskSlots: overdueTaskSlots,
    // Helper functions
    isTaskDueSoon: (reminderDatetime: string) => {
      const reminderTime = new Date(reminderDatetime);
      return reminderTime <= thirtyMinutesFromNow && reminderTime > now;
    },
    isTaskOverdue: (reminderDatetime: string) => {
      const reminderTime = new Date(reminderDatetime);
      return reminderTime <= now;
    },
    isSprintDeadlineUpcoming: (deadline: string) => {
      const deadlineTime = new Date(deadline);
      return deadlineTime <= twentyFourHoursFromNow && deadlineTime > now;
    },
    isTaskSlotUpcoming: (slotStartDatetime: string) => {
      const slotStartTime = new Date(slotStartDatetime);
      return slotStartTime <= thirtyMinutesFromNow && slotStartTime > now;
    },
    notificationsEnabled,
    setNotificationsEnabled,
    requestNotificationPermission,
    markAllAsRead,
    markAsRead,
    setNotifiedItems,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sprint-deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['task-slots'] });
    },
  };
};
