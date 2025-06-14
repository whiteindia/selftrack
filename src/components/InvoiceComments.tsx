import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface InvoiceComment {
  id: string;
  invoice_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

interface InvoiceCommentsProps {
  invoiceId: string;
}

const InvoiceComments: React.FC<InvoiceCommentsProps> = ({ invoiceId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Fetch comments for this invoice
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['invoice-comments', invoiceId],
    queryFn: async () => {
      console.log('Fetching comments for invoice:', invoiceId);
      const { data, error } = await supabase
        .from('invoice_comments')
        .select(`
          *,
          profiles!fk_invoice_comments_user_id(full_name)
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching invoice comments:', error);
        throw error;
      }
      console.log('Invoice comments fetched:', data);
      return data as InvoiceComment[];
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('invoice_comments')
        .insert({
          invoice_id: invoiceId,
          user_id: user.id,
          comment: comment.trim()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-comments', invoiceId] });
      setNewComment('');
      toast.success('Comment added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add comment: ' + error.message);
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('invoice_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-comments', invoiceId] });
      toast.success('Comment deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete comment: ' + error.message);
    }
  });

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    addCommentMutation.mutate(newComment);
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-shrink-0">
          <MessageSquare className="h-4 w-4 mr-1" />
          Comments ({comments.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Comments</DialogTitle>
          <DialogDescription>
            Record customer feedback and payment discussions for invoice {invoiceId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add new comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="Enter customer feedback or payment discussion notes..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <Button 
              onClick={handleAddComment}
              disabled={addCommentMutation.isPending || !newComment.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {addCommentMutation.isPending ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>

          {/* Comments list */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center text-gray-500">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No comments yet. Add the first comment about customer feedback or payment discussions.
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">
                          {comment.profiles?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {comment.comment}
                      </p>
                    </div>
                    {user && comment.user_id === user.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deleteCommentMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceComments;
