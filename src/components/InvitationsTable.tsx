
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useInvitations } from '@/hooks/useInvitations';
import { format } from 'date-fns';

const InvitationsTable = () => {
  const { invitations, isLoading, deleteInvitation } = useInvitations();

  const handleDelete = async (invitationId: string) => {
    if (window.confirm('Are you sure you want to delete this invitation?')) {
      try {
        await deleteInvitation.mutateAsync(invitationId);
        toast.success('Invitation deleted successfully!');
      } catch (error: any) {
        toast.error('Failed to delete invitation: ' + error.message);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-red-600"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading invitations...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No invitations found. Send your first invitation to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    <span className="capitalize">{invitation.role}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(
                      isExpired(invitation.expires_at) ? 'expired' : invitation.status
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invitation.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invitation.expires_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(invitation.id)}
                      className="text-red-600 hover:text-red-700"
                      disabled={deleteInvitation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default InvitationsTable;
