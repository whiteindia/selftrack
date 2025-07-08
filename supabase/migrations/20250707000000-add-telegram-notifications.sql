-- Create telegram_notifications table to store user Telegram chat IDs
CREATE TABLE public.telegram_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL, -- Telegram chat ID
  username TEXT, -- Telegram username (optional)
  first_name TEXT, -- Telegram first name (optional)
  last_name TEXT, -- Telegram last name (optional)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create telegram_notification_settings table for user preferences
CREATE TABLE public.telegram_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_reminders BOOLEAN NOT NULL DEFAULT true,
  sprint_deadlines BOOLEAN NOT NULL DEFAULT true,
  task_slots BOOLEAN NOT NULL DEFAULT true,
  overdue_notifications BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create telegram_bot_config table for bot settings
CREATE TABLE public.telegram_bot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_token TEXT NOT NULL,
  webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.telegram_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_config ENABLE ROW LEVEL SECURITY;

-- Create policies for telegram_notifications
CREATE POLICY "Users can view their own telegram notifications" 
ON public.telegram_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own telegram notifications" 
ON public.telegram_notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own telegram notifications" 
ON public.telegram_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own telegram notifications" 
ON public.telegram_notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for telegram_notification_settings
CREATE POLICY "Users can view their own telegram notification settings" 
ON public.telegram_notification_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own telegram notification settings" 
ON public.telegram_notification_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own telegram notification settings" 
ON public.telegram_notification_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own telegram notification settings" 
ON public.telegram_notification_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for telegram_bot_config (admin only)
CREATE POLICY "Only admins can manage bot config" 
ON public.telegram_bot_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_telegram_notifications_updated_at
BEFORE UPDATE ON public.telegram_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_telegram_notification_settings_updated_at
BEFORE UPDATE ON public.telegram_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_telegram_bot_config_updated_at
BEFORE UPDATE ON public.telegram_bot_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_telegram_notifications_user_id ON public.telegram_notifications(user_id);
CREATE INDEX idx_telegram_notifications_chat_id ON public.telegram_notifications(chat_id);
CREATE INDEX idx_telegram_notification_settings_user_id ON public.telegram_notification_settings(user_id);
CREATE INDEX idx_telegram_bot_config_active ON public.telegram_bot_config(is_active);

-- Insert default bot config (will be updated by admin)
INSERT INTO public.telegram_bot_config (bot_token, is_active) 
VALUES ('YOUR_BOT_TOKEN_HERE', false); 