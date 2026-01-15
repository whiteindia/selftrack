
import { supabase } from '@/integrations/supabase/client';
import { ActivityLogData } from './types';

export const logActivity = async (data: ActivityLogData) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    const fallback = !userId ? await supabase.auth.getUser() : null;
    const finalUserId = userId || fallback?.data.user?.id;

    if (!finalUserId) {
      console.error('No authenticated user found for activity logging');
      return;
    }

    const { error } = await supabase
      .from('activity_feed')
      .insert([{
        user_id: finalUserId,
        action_type: data.action_type,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        entity_name: data.entity_name,
        description: data.description,
        comment: data.comment
      }]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in activity logging:', error);
  }
};
