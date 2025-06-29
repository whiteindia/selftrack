
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReminderTask {
  id: string;
  name: string;
  reminder_datetime: string;
}

export const useReminderNotifications = () => {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifiedTasks, setNotifiedTasks] = useState<Set<string>>(new Set());

  // Query for tasks with reminders
  const { data: reminderTasks = [], refetch } = useQuery({
    queryKey: ['reminder-notifications', user?.id],
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

  // Calculate notification counts and due tasks
  const now = new Date();
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

  const dueSoonTasks = reminderTasks.filter(task => {
    const reminderTime = new Date(task.reminder_datetime);
    return reminderTime <= thirtyMinutesFromNow && reminderTime > now;
  });

  const overdueTasks = reminderTasks.filter(task => {
    const reminderTime = new Date(task.reminder_datetime);
    return reminderTime <= now;
  });

  const totalNotificationCount = dueSoonTasks.length + overdueTasks.length;

  // Check if task is due soon (within 30 minutes)
  const isTaskDueSoon = (reminderDatetime: string) => {
    const reminderTime = new Date(reminderDatetime);
    return reminderTime <= thirtyMinutesFromNow && reminderTime > now;
  };

  // Check if task is overdue
  const isTaskOverdue = (reminderDatetime: string) => {
    const reminderTime = new Date(reminderDatetime);
    return reminderTime <= now;
  };

  // Browser notification function
  const sendBrowserNotification = (task: ReminderTask) => {
    if (!notificationsEnabled || notifiedTasks.has(task.id)) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`Reminder: ${task.name}`, {
        body: `Scheduled for ${new Date(task.reminder_datetime).toLocaleTimeString()}`,
        icon: '/favicon.ico',
        tag: task.id,
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = '/tasks';
        notification.close();
      };

      setNotifiedTasks(prev => new Set([...prev, task.id]));
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

  // Send notifications for due soon tasks
  useEffect(() => {
    if (notificationsEnabled) {
      dueSoonTasks.forEach(task => {
        sendBrowserNotification(task);
      });
    }
  }, [dueSoonTasks, notificationsEnabled]);

  // Clean up notified tasks that are no longer due soon
  useEffect(() => {
    const currentDueSoonIds = new Set(dueSoonTasks.map(task => task.id));
    setNotifiedTasks(prev => {
      const filtered = new Set([...prev].filter(id => currentDueSoonIds.has(id)));
      return filtered;
    });
  }, [dueSoonTasks]);

  return {
    totalNotificationCount,
    dueSoonTasks,
    overdueTasks,
    isTaskDueSoon,
    isTaskOverdue,
    notificationsEnabled,
    setNotificationsEnabled,
    requestNotificationPermission,
    refetch,
  };
};
