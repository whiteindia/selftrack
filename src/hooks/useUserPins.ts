import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

type EntityType = 'project' | 'task' | 'active_task';

export const useUserPins = (entityType: EntityType) => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch pinned items for this entity type
  const { data: pinnedIds = [], isLoading } = useQuery({
    queryKey: ['user-pins', entityType, userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_pins')
        .select('entity_id')
        .eq('user_id', userId)
        .eq('entity_type', entityType);

      if (error) throw error;
      return data?.map(p => p.entity_id) || [];
    },
    enabled: !!userId
  });

  // Add pin mutation
  const addPinMutation = useMutation({
    mutationFn: async (entityId: string) => {
      if (!userId) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('user_pins')
        .insert({
          user_id: userId,
          entity_type: entityType,
          entity_id: entityId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pins', entityType, userId] });
    }
  });

  // Remove pin mutation
  const removePinMutation = useMutation({
    mutationFn: async (entityId: string) => {
      if (!userId) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('user_pins')
        .delete()
        .eq('user_id', userId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pins', entityType, userId] });
    }
  });

  // Toggle pin function
  const togglePin = async (entityId: string) => {
    if (pinnedIds.includes(entityId)) {
      await removePinMutation.mutateAsync(entityId);
    } else {
      await addPinMutation.mutateAsync(entityId);
    }
  };

  // Check if pinned
  const isPinned = (entityId: string) => pinnedIds.includes(entityId);

  return {
    pinnedIds,
    isLoading,
    togglePin,
    isPinned,
    addPin: addPinMutation.mutate,
    removePin: removePinMutation.mutate,
    isToggling: addPinMutation.isPending || removePinMutation.isPending
  };
};
