import { supabase } from '@/integrations/supabase/client';

export async function sendTelegramNotification(data: {
  user_id: string;
  notification_type: 'task_reminder' | 'sprint_deadline' | 'task_slot' | 'overdue' | 'due_soon';
  item_data: {
    id: string;
    name: string;
    datetime: string;
    project_name?: string;
    client_name?: string;
    status?: string;
  };
}) {
  try {
    const response = await fetch(
      'https://ljmdbrunpuhnnmouuzg.supabase.co/functions/v1/send-telegram-notification',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.getSession().then(({ data }) => data.session?.access_token)}`,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      console.error('Failed to send Telegram notification');
      return { success: false, error: 'Failed to send notification' };
    }

    const responseData = await response.json();
    return { success: true, data: responseData };
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return { success: false, error: String(error) };
  }
}