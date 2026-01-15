import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Settings, TestTube, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BotConfig {
  id: string;
  bot_token: string;
  webhook_url: string | null;
  is_active: boolean;
}

type TelegramBotConfig = {
  id: string;
  bot_token: string;
  webhook_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const TelegramBotAdmin = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [botToken, setBotToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Check if user is admin
  const isAdmin = userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in';

  if (!isAdmin) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access the Telegram bot admin page.</p>
          </div>
        </div>
      </Navigation>
    );
  }

  const { data: botConfig, isLoading, isError } = useQuery({
    queryKey: ['telegram-bot-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telegram_bot_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data && data[0]) as TelegramBotConfig | null;
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!botConfig) return;
    setBotToken(botConfig.bot_token || '');
    setWebhookUrl(botConfig.webhook_url || '');
    setIsActive(!!botConfig.is_active);
  }, [botConfig]);

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      if (!botToken.trim()) {
        throw new Error('Bot token is required');
      }

      if (botConfig?.id) {
        const { error } = await supabase
          .from('telegram_bot_config')
          .update({
            bot_token: botToken.trim(),
            webhook_url: webhookUrl.trim() || null,
            is_active: isActive,
          })
          .eq('id', botConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('telegram_bot_config')
          .insert({
            bot_token: botToken.trim(),
            webhook_url: webhookUrl.trim() || null,
            is_active: isActive,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Bot configuration saved');
      queryClient.invalidateQueries({ queryKey: ['telegram-bot-config'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to save bot configuration');
    },
  });

  const setWebhookMutation = useMutation({
    mutationFn: async () => {
      if (!botToken.trim() || !webhookUrl.trim()) {
        throw new Error('Bot token and webhook URL are required');
      }
      const url = `https://api.telegram.org/bot${botToken.trim()}/setWebhook?url=${encodeURIComponent(webhookUrl.trim())}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data?.description || 'Failed to set webhook');
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Webhook set successfully');
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to set webhook');
    },
  });

  const testBotMutation = useMutation({
    mutationFn: async () => {
      if (!botToken.trim()) {
        throw new Error('Bot token is required');
      }
      const url = `https://api.telegram.org/bot${botToken.trim()}/getMe`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data?.description || 'Failed to connect to bot');
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Bot token verified');
    },
    onError: (error) => {
      console.error(error);
      toast.error('Bot token verification failed');
    },
  });

  return (
    <Navigation>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h1 className="text-2xl font-semibold">Telegram Bot Admin</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Bot Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading configuration...</div>
            ) : isError ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Failed to load bot configuration
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bot-token">Bot Token</Label>
                  <Input
                    id="bot-token"
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCDEF..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://<project>.supabase.co/functions/v1/telegram-bot"
                  />
                  <p className="text-xs text-muted-foreground">
                    This must point to your deployed `telegram-bot` function.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <Label>Bot Status</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable or disable the bot globally
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => saveConfigMutation.mutate()}
                    disabled={saveConfigMutation.isPending}
                  >
                    {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setWebhookMutation.mutate()}
                    disabled={setWebhookMutation.isPending}
                  >
                    {setWebhookMutation.isPending ? 'Setting Webhook...' : 'Set Webhook'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testBotMutation.mutate()}
                    disabled={testBotMutation.isPending}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {testBotMutation.isPending ? 'Testing...' : 'Test Bot'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              How to Receive Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Open Telegram and message your bot.</p>
            <p>2. Send `/start` to get your Chat ID.</p>
            <p>3. Go to Settings → Telegram Notifications and connect your Chat ID.</p>
            <p>4. Make sure this bot is Active and the webhook is set.</p>
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default TelegramBotAdmin; 