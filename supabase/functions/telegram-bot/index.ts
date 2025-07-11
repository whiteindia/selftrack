import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: {
      id: number;
      type: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    text?: string;
    from: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    data?: string;
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client with proper headers
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
   
  );

  try {
    const { update }: { update: TelegramUpdate } = await req.json();
    
    if (!update) {
      throw new Error('No update data received');
    }

    // Get bot configuration
    const { data: botConfig, error: botConfigError } = await supabase
      .from('telegram_bot_config')
      .select('bot_token, is_active')
      .eq('is_active', true)
      .single();

    if (botConfigError || !botConfig) {
      console.error('Bot configuration error:', botConfigError);
      return new Response(JSON.stringify({ success: false, error: 'Bot not configured' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const botToken = botConfig.bot_token;

    // Handle incoming messages
    if (update.message) {
      const { chat, text, from } = update.message;
      
      if (text === '/start') {
        // Handle /start command
        const welcomeMessage = `
🤖 *Welcome to SelfTrack Bot!*

I'll help you stay updated with your tasks, reminders, and deadlines.

To connect your account:
1. Go to your SelfTrack dashboard
2. Navigate to Settings > Telegram Notifications
3. Click "Connect Telegram Account"
4. Enter this chat ID: \`${chat.id}\`

Once connected, you'll receive notifications for:
• Task reminders
• Sprint deadlines  
• Task time slots
• Overdue items

Use /help for more commands.
        `;

        await sendTelegramMessage({
          chat_id: chat.id,
          text: welcomeMessage,
          parse_mode: 'Markdown'
        }, botToken);

      } else if (text === '/help') {
        const helpMessage = `
📋 *Available Commands:*

/start - Initialize the bot and get your chat ID
/help - Show this help message
/status - Check your notification settings
/disconnect - Disconnect your account (use dashboard to reconnect)

*Notification Types:*
• Task reminders (30 min before)
• Sprint deadlines (24 hours before)
• Task time slots (30 min before start)
• Overdue items

*Settings:*
Manage your notification preferences through the SelfTrack dashboard.
        `;

        await sendTelegramMessage({
          chat_id: chat.id,
          text: helpMessage,
          parse_mode: 'Markdown'
        }, botToken);

      } else if (text === '/status') {
        // Check if user is connected
        const { data: userNotification } = await supabase
          .from('telegram_notifications')
          .select('is_active')
          .eq('chat_id', chat.id)
          .single();

        if (userNotification) {
          const statusMessage = `
✅ *Account Connected*

Your SelfTrack account is connected to this chat.

Notifications are currently: ${userNotification.is_active ? '🟢 Enabled' : '🔴 Disabled'}

To manage settings, visit your SelfTrack dashboard.
          `;

          await sendTelegramMessage({
            chat_id: chat.id,
            text: statusMessage,
            parse_mode: 'Markdown'
          }, botToken);
        } else {
          const notConnectedMessage = `
❌ *Account Not Connected*

This chat is not connected to any SelfTrack account.

To connect:
1. Go to your SelfTrack dashboard
2. Navigate to Settings > Telegram Notifications
3. Click "Connect Telegram Account"
4. Enter this chat ID: \`${chat.id}\`
          `;

          await sendTelegramMessage({
            chat_id: chat.id,
            text: notConnectedMessage,
            parse_mode: 'Markdown'
          }, botToken);
        }

      } else if (text === '/disconnect') {
        // Disconnect user
        const { error: deleteError } = await supabase
          .from('telegram_notifications')
          .delete()
          .eq('chat_id', chat.id);

        if (deleteError) {
          console.error('Error disconnecting user:', deleteError);
        }

        const disconnectMessage = `
🔌 *Account Disconnected*

Your SelfTrack account has been disconnected from this chat.

To reconnect, visit your SelfTrack dashboard and follow the connection process again.
        `;

        await sendTelegramMessage({
          chat_id: chat.id,
          text: disconnectMessage,
          parse_mode: 'Markdown'
        }, botToken);

      } else {
        // Unknown command
        const unknownMessage = `
❓ *Unknown Command*

Use /help to see available commands.
        `;

        await sendTelegramMessage({
          chat_id: chat.id,
          text: unknownMessage,
          parse_mode: 'Markdown'
        }, botToken);
      }
    }

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const { id: callbackId, data, from } = update.callback_query;
      
      if (data?.startsWith('mark_read_')) {
        const [, type, itemId] = data.split('_');
        
        // Mark notification as read
        const { error: markError } = await supabase
          .from('notification_reads')
          .upsert({
            user_id: from.id.toString(), // This should be the actual user_id
            notification_type: type,
            notification_id: itemId,
          });

        if (markError) {
          console.error('Error marking notification as read:', markError);
        }

        // Answer callback query
        await answerCallbackQuery(callbackId, 'Notification marked as read', botToken);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    console.error("Error handling Telegram webhook:", error);
    
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

// Helper function to answer callback queries
async function answerCallbackQuery(callbackQueryId: string, text: string, botToken: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Telegram callback answer error:', errorData);
  }
}

serve(handler); 