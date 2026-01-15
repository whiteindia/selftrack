import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageCircle, Settings, Clock, Globe, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TelegramNotification {
  id: string;
  chat_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
}

interface TelegramSettings {
  id: string;
  task_reminders: boolean;
  sprint_deadlines: boolean;
  task_slots: boolean;
  overdue_notifications: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

const TelegramNotificationSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [chatId, setChatId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: telegramNotification, isLoading: telegramLoading } = useQuery({
    queryKey: ['telegram-notification', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telegram_notifications')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      return data as TelegramNotification | null;
    },
    enabled: !!user,
  });

  const { data: telegramSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['telegram-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telegram_notification_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data as TelegramSettings | null;
    },
    enabled: !!user,
  });

  const handleConnect = () => {
    if (!chatId.trim()) return;
    connectMutation.mutate();
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const handleToggleConnection = (enabled: boolean) => {
    toggleConnectionMutation.mutate(enabled);
  };

  type SettingsValue = string | boolean;

  const handleSettingChange = (key: keyof TelegramSettings, value: SettingsValue) => {
    updateSettingsMutation.mutate({ key, value });
  };

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const parsedChatId = Number(chatId);
      if (!Number.isFinite(parsedChatId)) {
        throw new Error('Chat ID must be a number');
      }
      const { error } = await supabase
        .from('telegram_notifications')
        .upsert({
          user_id: user.id,
          chat_id: parsedChatId,
          is_active: true,
        }, { onConflict: 'user_id' });
      if (error) throw error;

      const { error: settingsError } = await supabase
        .from('telegram_notification_settings')
        .upsert({
          user_id: user.id,
          task_reminders: true,
          sprint_deadlines: true,
          task_slots: true,
          overdue_notifications: true,
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '08:00:00',
          timezone: 'Asia/Kolkata',
        }, { onConflict: 'user_id' });
      if (settingsError) throw settingsError;
    },
    onSuccess: () => {
      toast.success('Telegram connected');
      setChatId('');
      setIsConnectDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['telegram-notification', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['telegram-settings', user?.id] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to connect Telegram');
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('telegram_notifications')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Telegram disconnected');
      queryClient.invalidateQueries({ queryKey: ['telegram-notification', user?.id] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to disconnect Telegram');
    }
  });

  const toggleConnectionMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('telegram_notifications')
        .update({ is_active: enabled })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Telegram status updated');
      queryClient.invalidateQueries({ queryKey: ['telegram-notification', user?.id] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to update Telegram status');
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ key, value }: { key: keyof TelegramSettings; value: SettingsValue }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('telegram_notification_settings')
        .upsert({
          user_id: user.id,
          [key]: value,
        }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-settings', user?.id] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to update Telegram settings');
    }
  });

  if (telegramLoading || settingsLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-lg">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Telegram Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Connection Status</Label>
                <p className="text-sm text-gray-600">
                  {telegramNotification ? 'Connected to Telegram' : 'Not connected to Telegram'}
                </p>
              </div>
              {telegramNotification && (
                <Badge variant={telegramNotification.is_active ? "default" : "secondary"}>
                  {telegramNotification.is_active ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </>
                  )}
                </Badge>
              )}
            </div>

            {telegramNotification ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Chat ID: {telegramNotification.chat_id}</p>
                    {telegramNotification.username && (
                      <p className="text-xs text-gray-600">@{telegramNotification.username}</p>
                    )}
                    {telegramNotification.first_name && (
                      <p className="text-xs text-gray-600">
                        {telegramNotification.first_name} {telegramNotification.last_name || ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={telegramNotification.is_active}
                      onCheckedChange={handleToggleConnection}
                      disabled={toggleConnectionMutation.isPending}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnect}
                      disabled={disconnectMutation.isPending}
                    >
                      {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-900">
                        Connect your Telegram account to receive notifications
                      </p>
                      <p className="text-xs text-blue-700">
                        1. Start a chat with our bot on Telegram<br/>
                        2. Send /start to get your Chat ID<br/>
                        3. Enter the Chat ID below to connect
                      </p>
                    </div>
                  </div>
                </div>
                <Button onClick={() => setIsConnectDialogOpen(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Connect Telegram Account
                </Button>
              </div>
            )}
          </div>

          {/* Notification Settings */}
          {telegramNotification && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="task-reminders">Task Reminders</Label>
                      <p className="text-sm text-gray-600">Get notified 30 minutes before task reminders</p>
                    </div>
                    <Switch
                      id="task-reminders"
                      checked={telegramSettings?.task_reminders ?? true}
                      onCheckedChange={(checked) => handleSettingChange('task_reminders', checked)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="sprint-deadlines">Sprint Deadlines</Label>
                      <p className="text-sm text-gray-600">Get notified 24 hours before sprint deadlines</p>
                    </div>
                    <Switch
                      id="sprint-deadlines"
                      checked={telegramSettings?.sprint_deadlines ?? true}
                      onCheckedChange={(checked) => handleSettingChange('sprint_deadlines', checked)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="task-slots">Task Time Slots</Label>
                      <p className="text-sm text-gray-600">Get notified 30 minutes before task slots start</p>
                    </div>
                    <Switch
                      id="task-slots"
                      checked={telegramSettings?.task_slots ?? true}
                      onCheckedChange={(checked) => handleSettingChange('task_slots', checked)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="overdue-notifications">Overdue Notifications</Label>
                      <p className="text-sm text-gray-600">Get notified about overdue tasks and deadlines</p>
                    </div>
                    <Switch
                      id="overdue-notifications"
                      checked={telegramSettings?.overdue_notifications ?? true}
                      onCheckedChange={(checked) => handleSettingChange('overdue_notifications', checked)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Telegram Account</DialogTitle>
            <DialogDescription>
              Enter your Telegram Chat ID to connect your account for notifications.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chat-id">Chat ID</Label>
              <Input
                id="chat-id"
                placeholder="Enter your Telegram Chat ID"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                disabled={isConnecting}
              />
              <p className="text-xs text-gray-600">
                To get your Chat ID, start a chat with our bot and send /start
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsConnectDialogOpen(false)}
                disabled={isConnecting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={!chatId.trim() || isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TelegramNotificationSettings; 