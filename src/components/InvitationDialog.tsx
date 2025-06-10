
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useInvitations } from '@/hooks/useInvitations';
import { useRoles } from '@/hooks/useRoles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface InvitationDialogProps {
  trigger?: React.ReactNode;
}

const InvitationDialog = ({ trigger }: InvitationDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: '',
    client_id: '',
    employee_data: {}
  });

  const { sendInvitation } = useInvitations();
  const { roles, loading: rolesLoading } = useRoles();

  // Fetch clients for client role assignments
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Filter out admin role from available roles
  const availableRoles = roles.filter(role => role !== 'admin');

  const handleSubmit = async () => {
    if (!formData.email || !formData.role) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const invitationData: any = {
        email: formData.email,
        role: formData.role
      };

      // Add client_id if role requires client association
      if (formData.role === 'client' && formData.client_id) {
        invitationData.client_id = formData.client_id;
      }

      // Add employee data for employee roles
      if (formData.role !== 'client') {
        invitationData.employee_data = {
          name: formData.email.split('@')[0], // Default name from email
          contact_number: ''
        };
      }

      await sendInvitation.mutateAsync(invitationData);
      
      toast.success('Invitation sent successfully!');
      setFormData({ email: '', role: '', client_id: '', employee_data: {} });
      setIsOpen(false);
    } catch (error: any) {
      toast.error('Failed to send invitation: ' + error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-green-600 hover:bg-green-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Send Invitation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Invitation</DialogTitle>
          <DialogDescription>
            Invite a new user to join the platform. They will receive an email with instructions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="user@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.role === 'client' && (
            <div className="space-y-2">
              <Label htmlFor="client">Associate with Client</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={sendInvitation.isPending || rolesLoading}
          >
            {sendInvitation.isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvitationDialog;
