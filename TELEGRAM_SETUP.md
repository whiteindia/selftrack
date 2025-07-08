# Telegram Notification Integration Setup Guide

This guide will help you set up Telegram notifications for your SelfTrack application.

## Overview

The Telegram integration consists of:
- Database tables for storing user Telegram connections and settings
- A Telegram bot function to handle incoming messages
- A notification sender function to send notifications to users
- React components for managing Telegram settings
- Admin interface for bot configuration

## Prerequisites

1. A Supabase project with Edge Functions enabled
2. A Telegram account
3. Admin access to your SelfTrack application

## Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a chat with BotFather
3. Send `/newbot` command
4. Follow the instructions:
   - Choose a name for your bot (e.g., "SelfTrack Notifications")
   - Choose a username for your bot (must end with 'bot', e.g., "selftrack_notifications_bot")
5. BotFather will provide you with a bot token - **save this token**

## Step 2: Deploy Database Migration

Run the migration to create the necessary tables:

```bash
supabase db push
```

This will create:
- `telegram_notifications` - stores user chat IDs
- `telegram_notification_settings` - stores user preferences
- `telegram_bot_config` - stores bot configuration

## Step 3: Deploy Edge Functions

Deploy the Telegram functions:

```bash
supabase functions deploy telegram-bot
supabase functions deploy send-telegram-notification
```

## Step 4: Configure the Bot

1. Access your SelfTrack application
2. Navigate to the Telegram Bot Admin page (admin only)
3. Enter your bot token
4. Set the webhook URL to: `https://your-project.supabase.co/functions/v1/telegram-bot`
5. Enable the bot
6. Test the connection

## Step 5: Set Up Webhook

The webhook URL should point to your deployed telegram-bot function. The function will handle:
- `/start` - Welcome message and chat ID display
- `/help` - Show available commands
- `/status` - Check connection status
- `/disconnect` - Disconnect the account

## Step 6: Test the Integration

1. Start a chat with your bot on Telegram
2. Send `/start` to get your Chat ID
3. Go to your SelfTrack notification settings
4. Click "Connect Telegram Account"
5. Enter the Chat ID provided by the bot
6. Configure your notification preferences

## Database Schema

### telegram_notifications
```sql
- id: UUID (Primary Key)
- user_id: UUID (References auth.users)
- chat_id: BIGINT (Telegram chat ID)
- username: TEXT (Telegram username)
- first_name: TEXT (Telegram first name)
- last_name: TEXT (Telegram last name)
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### telegram_notification_settings
```sql
- id: UUID (Primary Key)
- user_id: UUID (References auth.users)
- task_reminders: BOOLEAN
- sprint_deadlines: BOOLEAN
- task_slots: BOOLEAN
- overdue_notifications: BOOLEAN
- quiet_hours_start: TIME
- quiet_hours_end: TIME
- timezone: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### telegram_bot_config
```sql
- id: UUID (Primary Key)
- bot_token: TEXT
- webhook_url: TEXT
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Notification Types

The system supports these notification types:

1. **Task Reminders** - Sent 30 minutes before task reminder time
2. **Sprint Deadlines** - Sent 24 hours before sprint deadline
3. **Task Time Slots** - Sent 30 minutes before task slot starts
4. **Overdue Items** - Sent for overdue tasks and deadlines

## User Features

### Connection Management
- Users can connect their Telegram account using their Chat ID
- Users can disconnect their account
- Users can enable/disable notifications

### Notification Preferences
- Enable/disable specific notification types
- Set quiet hours (no notifications during specified time)
- Choose timezone for quiet hours calculation

### Message Format
Notifications include:
- Emoji and title
- Description with time
- Project and client information (if available)
- Action buttons to mark as read or open in app

## Admin Features

### Bot Configuration
- Set bot token
- Configure webhook URL
- Enable/disable bot globally
- Test bot connection

### Monitoring
- View bot status
- Check webhook configuration
- Monitor user connections

## Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Admin functions require admin role
- Bot token is stored securely in database

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check if bot token is correct
   - Verify webhook URL is set correctly
   - Ensure functions are deployed

2. **Notifications not sending**
   - Check if user is connected to Telegram
   - Verify notification settings are enabled
   - Check quiet hours settings

3. **Webhook errors**
   - Ensure function is deployed
   - Check function logs in Supabase dashboard
   - Verify webhook URL format

### Debugging

1. Check Supabase function logs:
   ```bash
   supabase functions logs telegram-bot
   supabase functions logs send-telegram-notification
   ```

2. Test bot connection in admin panel

3. Check user notification settings in database

## Environment Variables

Make sure these are set in your Supabase project:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `FRONTEND_URL` (for notification links)

## API Endpoints

### Telegram Bot Webhook
- **URL**: `/functions/v1/telegram-bot`
- **Method**: POST
- **Purpose**: Handle incoming Telegram messages

### Send Notification
- **URL**: `/functions/v1/send-telegram-notification`
- **Method**: POST
- **Purpose**: Send notifications to users

## Support

For issues or questions:
1. Check the function logs in Supabase dashboard
2. Verify bot configuration in admin panel
3. Test individual components
4. Review this setup guide

## Future Enhancements

Potential improvements:
- Message templates customization
- Advanced scheduling options
- Group chat support
- Message history
- Analytics and reporting 