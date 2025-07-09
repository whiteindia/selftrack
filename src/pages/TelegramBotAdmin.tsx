import React, { useState } from 'react';
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

const TelegramBotAdmin = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Check if user is admin
  const isAdmin = userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in';

  // Fetch bot configuration
  const { data: botConfig, isLoading } = useQuery({
    queryKey: ['telegram-bot-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telegram_bot_config')
        .select('*')
        .single();

      if (error) throw error;
      return data as BotConfig;
    },
    enabled: isAdmin,
  });

  // Update bot configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<BotConfig>) => {
      const { data, error } = await supabase
        .from('telegram_bot_config')
        .update(config)
        .eq('id', botConfig!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-bot-config'] });
      setIsEditing(false);
      toast.success('Bot configuration updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update bot configuration: ' + error.message);
    },
  });

  // Test bot connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!botToken.trim()) {
        throw new Error('Bot token not configured');
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Failed to connect to bot');
      }

      return data.result;
    },
    onSuccess: (botInfo) => {
      toast.success(`Bot connection successful! Bot: @${botInfo.username}`);
    },
    onError: (error) => {
      toast.error('Bot connection failed: ' + error.message);
    },
  });

  // Set webhook mutation
  const setWebhookMutation = useMutation({
    mutationFn: async (webhookUrl: string) => {
      if (!botToken.trim()) {
        throw new Error('Bot token not configured');
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Failed to set webhook');
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Webhook set successfully!');
    },
    onError: (error) => {
      toast.error('Failed to set webhook: ' + error.message);
    },
  });

  const handleSave = () => {
    if (!botToken.trim()) {
      toast.error('Bot token is required');
      return;
    }

    updateConfigMutation.mutate({
      bot_token: botToken,
      webhook_url: webhookUrl || null,
      is_active: isActive,
    });
  };

  const handleSetWebhook = () => {
    if (!webhookUrl.trim()) {
      toast.error('Webhook URL is required');
      return;
    }

    setWebhookMutation.mutate(webhookUrl);
  };

  // Initialize form when bot config is loaded
  React.useEffect(() => {
    if (botConfig) {
      setBotToken(botConfig.bot_token);
      setWebhookUrl(botConfig.webhook_url || '');
      setIsActive(botConfig.is_active);
    }
  }, [botConfig]);

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

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Telegram Bot Administration</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Bot Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bot Token */}
            <div className="space-y-2">
              <Label htmlFor="bot-token">Bot Token</Label>
              <div className="flex gap-2">
                <Input
                  id="bot-token"
                  type="password"
                  placeholder="Enter your Telegram bot token"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  disabled={!isEditing}
                />
                {!isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Get your bot token from @BotFather on Telegram
              </p>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook-url"
                  placeholder="https://your-project.supabase.co/functions/v1/telegram-bot"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  disabled={!isEditing}
                />
                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={handleSetWebhook}
                    disabled={setWebhookMutation.isPending}
                  >
                    {setWebhookMutation.isPending ? 'Setting...' : 'Set Webhook'}
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">
                This should point to your Telegram bot function endpoint
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="bot-active">Bot Active</Label>
                <p className="text-sm text-gray-600">
                  Enable or disable the bot for all users
                </p>
              </div>
              <Switch
                id="bot-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={!isEditing}
              />
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form
                    if (botConfig) {
                      setBotToken(botConfig.bot_token);
                      setWebhookUrl(botConfig.webhook_url || '');
                      setIsActive(botConfig.is_active);
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Test if your bot token is valid and the bot is accessible.
              </p>
              <Button
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending || !botToken.trim()}
              >
                {testConnectionMutation.isPending ? 'Testing...' : 'Test Bot Connection'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Information */}
        <Card>
          <CardHeader>
            <CardTitle>Status Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bot Status</span>
                <Badge variant={botConfig?.is_active ? "default" : "secondary"}>
                  {botConfig?.is_active ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Inactive
                    </>
                  )}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bot Token</span>
                <Badge variant={botConfig?.bot_token && botConfig.bot_token !== 'YOUR_BOT_TOKEN_HERE' ? "default" : "destructive"}>
                  {botConfig?.bot_token && botConfig.bot_token !== 'YOUR_BOT_TOKEN_HERE' ? 'Configured' : 'Not Configured'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Webhook URL</span>
                <Badge variant={botConfig?.webhook_url ? "default" : "secondary"}>
                  {botConfig?.webhook_url ? 'Set' : 'Not Set'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">1. Create a Telegram Bot</h4>
                <p className="text-gray-600">
                  • Message @BotFather on Telegram<br/>
                  • Use /newbot command<br/>
                  • Follow the instructions to create your bot<br/>
                  • Copy the bot token provided
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">2. Configure the Bot</h4>
                <p className="text-gray-600">
                  • Enter the bot token above<br/>
                  • Set the webhook URL to your function endpoint<br/>
                  • Enable the bot when ready
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">3. Deploy Functions</h4>
                <p className="text-gray-600">
                  • Deploy the telegram-bot function<br/>
                  • Deploy the send-telegram-notification function<br/>
                  • Ensure both functions are accessible
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">4. Test the Setup</h4>
                <p className="text-gray-600">
                  • Use the "Test Bot Connection" button<br/>
                  • Start a chat with your bot<br/>
                  • Send /start to get your Chat ID<br/>
                  • Connect your account in the notification settings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default TelegramBotAdmin; 