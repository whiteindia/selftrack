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

  return (
    <Navigation>
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-gray-600">Telegram bot administration features are being set up.</p>
        </div>
      </div>
    </Navigation>
  );
};

export default TelegramBotAdmin; 