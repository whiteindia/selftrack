import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
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
}

interface NotificationData {
  chat_id: number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  reply_markup?: {
    inline_keyboard: Array<Array<{
      text: string;
      callback_data: string;
    }>>;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ✅ Read once and parse
  const textBody = await req.text();
  console.log("Incoming request body:", textBody);

  const { user_id, notification_type, item_data }: NotificationRequest = JSON.parse(textBody);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  try {
    if (!user_id || !notification_type || !item_data) {
      throw new Error('Missing required parameters');
    }

    // Get user's Telegram notification settings
    const { data: telegramNotification, error: telegramError } = await supabase
      .from('telegram_notifications')
      .select('chat_id, is_active')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();

    if (telegramError || !telegramNotification) {
      console.log('User not connected to Telegram or notifications disabled');
      return new Response(JSON.stringify({ success: false, error: 'User not connected to Telegram' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user's notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('telegram_notification_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError);
      return new Response(JSON.stringify({ success: false, error: 'Settings error' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if this notification type is enabled
    let isEnabled = false;
    switch (notification_type) {
      case 'task_reminder':
        isEnabled = settings?.task_reminders ?? true;
        break;
      case 'sprint_deadline':
        isEnabled = settings?.sprint_deadlines ?? true;
        break;
      case 'task_slot':
        isEnabled = settings?.task_slots ?? true;
        break;
      case 'overdue':
        isEnabled = settings?.overdue_notifications ?? true;
        break;
      case 'due_soon':
        isEnabled = settings?.task_reminders ?? true; // Assuming 'due_soon' uses the same setting as 'task_reminders'
        break;
    }

    if (!isEnabled) {
      console.log(`Notification type ${notification_type} is disabled for user ${user_id}`);
      return new Response(JSON.stringify({ success: true, message: 'Notification type disabled' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check quiet hours
    const now = new Date();
    const userTimezone = settings?.timezone || 'Asia/Kolkata';
    const quietStart = settings?.quiet_hours_start || '22:00:00';
    const quietEnd = settings?.quiet_hours_end || '08:00:00';
    
    // Convert to user's timezone for quiet hours check
    const userTime = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
    const currentTime = userTime.toTimeString().slice(0, 8);
    
    if (isInQuietHours(currentTime, quietStart, quietEnd)) {
      console.log(`In quiet hours for user ${user_id}`);
      return new Response(JSON.stringify({ success: true, message: 'In quiet hours' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get bot configuration
    const { data: botConfig, error: botConfigError } = await supabase
      .from('telegram_bot_config')
      .select('bot_token')
      .eq('is_active', true)
      .single();

    if (botConfigError || !botConfig) {
      console.error('Bot configuration error:', botConfigError);
      return new Response(JSON.stringify({ success: false, error: 'Bot not configured' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Format the notification message
    const message = formatNotificationMessage(notification_type, item_data);
    const replyMarkup = createReplyMarkup(notification_type, item_data.id);

    // Send the notification
    await sendTelegramMessage({
      chat_id: telegramNotification.chat_id,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup
    }, botConfig.bot_token);

    return new Response(JSON.stringify({ success: true, message: 'Notification sent' }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    console.error("Error sending Telegram notification:", error);
    
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: "Check the edge function logs for more information"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Helper function to check if current time is in quiet hours
function isInQuietHours(currentTime: string, quietStart: string, quietEnd: string): boolean {
  const current = new Date(`2000-01-01T${currentTime}`);
  const start = new Date(`2000-01-01T${quietStart}`);
  const end = new Date(`2000-01-01T${quietEnd}`);
  
  if (start <= end) {
    // Same day quiet hours (e.g., 22:00 to 08:00)
    return current >= start && current <= end;
  } else {
    // Overnight quiet hours (e.g., 22:00 to 08:00 next day)
    return current >= start || current <= end;
  }
}

// Helper function to format notification messages
function formatNotificationMessage(type: string, itemData: NotificationRequest['item_data']): string {
  const emoji = {
    task_reminder: '⏰',
    sprint_deadline: '📅',
    task_slot: '🎯',
    overdue: '🚨',
    due_soon: '⏳'
  }[type] || '📢';

  const title = {
    task_reminder: 'Task Reminder',
    sprint_deadline: 'Sprint Deadline',
    task_slot: 'Task Time Slot',
    overdue: 'Overdue Item',
    due_soon: 'Task Due Soon'
  }[type] || 'Notification';

  const datetime = new Date(itemData.datetime).toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let message = `${emoji} *${title}*\n\n`;
  message += `**${itemData.name}**\n`;
  message += `📅 ${datetime}\n`;

  if (itemData.project_name) {
    message += `📁 Project: ${itemData.project_name}\n`;
  }

  if (itemData.client_name) {
    message += `👤 Client: ${itemData.client_name}\n`;
  }

  if (itemData.status) {
    message += `📊 Status: ${itemData.status}\n`;
  }

  return message;
}

// Helper function to create reply markup with action buttons
function createReplyMarkup(type: string, itemId: string) {
  const baseUrl = Deno.env.get('FRONTEND_URL') || 'https://your-app.com';
  
  return {
    inline_keyboard: [
      [
        {
          text: '✅ Mark as Read',
          callback_data: `mark_read_${type}_${itemId}`
        }
      ],
      [
        {
          text: '📱 Open in App',
          url: `${baseUrl}/alltasks?highlight=${itemId}`
        }
      ]
    ]
  };
}

// Helper function to send Telegram messages
async function sendTelegramMessage(data: NotificationData, botToken: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Telegram API error:', errorData); // <-- LOG ERROR
    throw new Error(`Telegram API error: ${errorData.description}`);
  } else {
    console.log('Notification sent to chat_id:', data.chat_id); // <-- LOG SUCCESS
  }
}

serve(handler); 