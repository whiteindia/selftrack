
import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, MessageCircle } from 'lucide-react';
import { useReminderNotifications } from '@/hooks/useReminderNotifications';
import { toast } from 'sonner';
import TelegramNotificationSettings from './TelegramNotificationSettings';

const NotificationSettings = () => {
  const { 
    notificationsEnabled, 
    setNotificationsEnabled, 
    requestNotificationPermission 
  } = useReminderNotifications();

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        toast.success('Desktop notifications enabled');
      } else {
        toast.error('Notifications permission denied');
      }
    } else {
      setNotificationsEnabled(false);
      toast.success('Desktop notifications disabled');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Desktop Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
              <p className="text-sm text-gray-600">
                Get notified when reminders are due within 30 minutes
              </p>
            </div>
            <Switch
              id="desktop-notifications"
              checked={notificationsEnabled}
              onCheckedChange={handleToggleNotifications}
            />
          </div>
        </CardContent>
      </Card>

      <TelegramNotificationSettings />
    </div>
  );
};

export default NotificationSettings;
