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
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      console.error('No access token available for Telegram notification');
      return { success: false, error: 'Missing auth token' };
    }

    const response = await fetch(
      'https://ljmdbrunpuhnnmouuzg.supabase.co/functions/v1/send-telegram-notification',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
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