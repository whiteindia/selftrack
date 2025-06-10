
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActivityFeed = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription for activity feed
  useEffect(() => {
    const channel = supabase
      .channel('activity-feed-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed'
        },
        () => {
          // Invalidate activity feed query to refetch data
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Get activity feed with better error handling and manual join
  const activityFeedQuery = useQuery({
    queryKey: ['activity-feed'],
    queryFn: async () => {
      console.log('Fetching activity feed...');
      
      // First get the activity feed data, excluding login activities
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_feed')
        .select('*')
        .neq('action_type', 'logged_in')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (activitiesError) {
        console.error('Activity feed error:', activitiesError);
        throw activitiesError;
      }

      // Then get profile data for the users
      if (activities && activities.length > 0) {
        const userIds = [...new Set(activities.map(activity => activity.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (profilesError) {
          console.error('Profiles error:', profilesError);
          // Don't throw here, just continue without profile data
        }

        // Manually join the data
        const activitiesWithProfiles = activities.map(activity => ({
          ...activity,
          profiles: profiles?.find(profile => profile.id === activity.user_id) || null
        }));

        console.log('Activity feed data with profiles:', activitiesWithProfiles);
        return activitiesWithProfiles;
      }

      console.log('Activity feed data:', activities);
      return activities || [];
    }
  });

  return { activityFeedQuery };
};
