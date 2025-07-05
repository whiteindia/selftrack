import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useSprintPinFavorite = () => {
  const queryClient = useQueryClient();

  const togglePinMutation = useMutation({
    mutationFn: async ({ sprintId, isPinned }: { sprintId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('sprints')
        .update({ is_pinned: !isPinned })
        .eq('id', sprintId);

      if (error) {
        throw error;
      }

      return { sprintId, isPinned: !isPinned };
    },
    onSuccess: ({ sprintId, isPinned }) => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({
        title: isPinned ? 'Sprint Pinned' : 'Sprint Unpinned',
        description: isPinned ? 'Sprint has been pinned to the top' : 'Sprint has been unpinned',
      });
    },
    onError: (error) => {
      console.error('Error toggling sprint pin:', error);
      toast({
        title: 'Error',
        description: 'Failed to update sprint pin status',
        variant: 'destructive',
      });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ sprintId, isFavorite }: { sprintId: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('sprints')
        .update({ is_favorite: !isFavorite })
        .eq('id', sprintId);

      if (error) {
        throw error;
      }

      return { sprintId, isFavorite: !isFavorite };
    },
    onSuccess: ({ sprintId, isFavorite }) => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({
        title: isFavorite ? 'Sprint Favorited' : 'Sprint Unfavorited',
        description: isFavorite ? 'Sprint has been added to favorites' : 'Sprint has been removed from favorites',
      });
    },
    onError: (error) => {
      console.error('Error toggling sprint favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update sprint favorite status',
        variant: 'destructive',
      });
    },
  });

  return {
    togglePin: togglePinMutation.mutate,
    toggleFavorite: toggleFavoriteMutation.mutate,
    isPinning: togglePinMutation.isPending,
    isFavoriting: toggleFavoriteMutation.isPending,
  };
}; 