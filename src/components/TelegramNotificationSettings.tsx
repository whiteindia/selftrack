import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // Fetch user's Telegram connection - DISABLED: table doesn't exist
  const telegramNotification = null;
  const telegramLoading = false;
  
  // TODO: Create telegram_notifications table or implement alternative connection method
  /*
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
  */

  // Fetch user's Telegram settings - DISABLED: table schema mismatch
  const telegramSettings = null;
  const settingsLoading = false;
  
  // TODO: Fix TelegramSettings interface to match actual table schema
  /*
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
  */

  // DISABLED: All mutations until telegram tables are properly set up
  const connectMutation = { mutate: () => {}, isPending: false };
  const disconnectMutation = { mutate: () => {}, isPending: false };
  const updateSettingsMutation = { mutate: () => {}, isPending: false };
  const toggleConnectionMutation = { mutate: () => {}, isPending: false };

  const handleConnect = () => {
    toast.error('Telegram integration is currently disabled - database schema mismatch');
  };

  const handleDisconnect = () => {
    toast.error('Telegram integration is currently disabled - database schema mismatch');
  };

  const handleToggleConnection = (enabled: boolean) => {
    toast.error('Telegram integration is currently disabled - database schema mismatch');
  };

  type SettingsValue = string | boolean;

  const handleSettingChange = (key: keyof TelegramSettings, value: SettingsValue) => {
    toast.error('Telegram settings are currently disabled - database schema mismatch');
  };

  const timezoneOptions = [
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ];

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

              {/* Quiet Hours */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Quiet Hours</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-start">Start Time</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={telegramSettings?.quiet_hours_start || '22:00'}
                      onChange={(e) => handleSettingChange('quiet_hours_start', e.target.value + ':00')}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quiet-end">End Time</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={telegramSettings?.quiet_hours_end || '08:00'}
                      onChange={(e) => handleSettingChange('quiet_hours_end', e.target.value + ':00')}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={telegramSettings?.timezone || 'Asia/Kolkata'}
                      onValueChange={(value) => handleSettingChange('timezone', value)}
                      disabled={updateSettingsMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezoneOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 mt-2">
                  Notifications will be paused during quiet hours to avoid disturbing you.
                </p>
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