import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  notification_type: 'task_reminder' | 'sprint_deadline' | 'task_slot' | 'overdue';
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
  message: string;
  parse_mode?: 'HTML' | 'Markdown';
  reply_markup?: {
    inline_keyboard: Array<Array<{
      text: string;
      callback_data: string;
    }>>;
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: {
      headers: { Authorization: req.headers.get('Authorization')! },
    },
  }
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, notification_type, item_data }: NotificationRequest = await req.json();
    
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
      message: message,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup
    }, botConfig.bot_token);

    return new Response(JSON.stringify({ success: true, message: 'Notification sent' }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending Telegram notification:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
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
function isInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
  if (startTime <= endTime) {
    // Same day quiet hours (e.g., 22:00 to 08:00)
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    // Overnight quiet hours (e.g., 22:00 to 08:00)
    return currentTime >= startTime || currentTime <= endTime;
  }
}

// Helper function to format notification messages
function formatNotificationMessage(type: string, item: any): string {
  const datetime = new Date(item.datetime);
  const formattedTime = datetime.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  });

  let emoji = '';
  let title = '';
  let description = '';

  switch (type) {
    case 'task_reminder':
      emoji = '🔔';
      title = 'Task Reminder';
      description = `Task "${item.name}" is scheduled for ${formattedTime}`;
      break;
    case 'sprint_deadline':
      emoji = '📅';
      title = 'Sprint Deadline';
      description = `Sprint "${item.name}" is due on ${formattedTime}`;
      break;
    case 'task_slot':
      emoji = '⏰';
      title = 'Task Slot Starting';
      description = `Task slot "${item.name}" starts at ${formattedTime}`;
      break;
    case 'overdue':
      emoji = '⚠️';
      title = 'Overdue Item';
      description = `"${item.name}" is overdue since ${formattedTime}`;
      break;
  }

  let message = `${emoji} *${title}*\n\n${description}`;
  
  if (item.project_name) {
    message += `\n📁 Project: ${item.project_name}`;
  }
  
  if (item.client_name) {
    message += `\n🏢 Client: ${item.client_name}`;
  }

  if (item.status) {
    message += `\n📊 Status: ${item.status}`;
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
    console.error('Telegram API error:', errorData);
    throw new Error(`Telegram API error: ${errorData.description}`);
  }
}

serve(handler); 