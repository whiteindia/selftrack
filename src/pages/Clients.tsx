import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { useInvitations } from '@/hooks/useInvitations';

interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

const Clients = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    company: '',
    phone: ''
  });

  const { sendInvitation } = useInvitations();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    }
  });

  // Add mutation to manually create auth user for client
  const createAuthUserMutation = useMutation({
    mutationFn: async (client: Client) => {
      console.log('Manually creating auth user for client:', client.email, 'with role: client');
      
      try {
        const { data: response, error } = await supabase.functions.invoke(
          'create-invited-user',
          {
            body: {
              email: client.email,
              password: client.email, // Use email as default password
              userData: {
                name: client.name,
                role: 'client' // Always use 'client' role for clients
              }
            }
          }
        );

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

        if (!response?.success) {
          console.error('Edge function returned unsuccessful response:', response);
          throw new Error(response?.error || 'Failed to create user');
        }

        console.log('Auth user created successfully with role: client', response);
        return response;
        
      } catch (error) {
        console.error('Error creating auth user:', error);
        throw error;
      }
    },
    onSuccess: (data, client) => {
      toast.success(`Auth user created successfully with role client! They can now login.`);
    },
    onError: (error) => {
      console.error('Failed to create auth user:', error);
      toast.error(`Failed to create auth user: ${error.message}`);
    }
  });

  const addClientMutation = useMutation({
    mutationFn: async (clientData: typeof newClient) => {
      console.log('Creating client with data:', clientData);
      
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();
      
      if (error) throw error;

      console.log('Client created successfully:', data);

      // Send invitation email if enabled and not editing
      if (sendInviteEmail && !editingClient) {
        console.log('Sending invitation email for client:', clientData.email);
        
        try {
          await sendInvitation.mutateAsync({
            email: clientData.email,
            role: 'client',
            client_id: data.id,
            employee_data: {
              name: clientData.name,
              company: clientData.company || '',
              phone: clientData.phone || ''
            }
          });
          console.log('Client invitation sent successfully');
        } catch (inviteError) {
          console.error('Failed to send client invitation:', inviteError);
          toast.error(`Client created but invitation email failed: ${(inviteError as Error).message}`);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setNewClient({ name: '', email: '', company: '', phone: '' });
      setSendInviteEmail(true);
      setIsDialogOpen(false);
      toast.success(editingClient ? 'Client updated successfully!' : 'Client created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create client: ' + error.message);
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditingClient(null);
      setSendInviteEmail(true);
      setIsDialogOpen(false);
      toast.success('Client updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update client: ' + error.message);
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      // First get the client data to find the email and related data
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('email')
        .eq('id', clientId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching client for deletion:', fetchError);
      }

      // Get all projects for this client
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', clientId);
      
      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
      }

      let taskIds: string[] = [];

      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);

        // Get all tasks for these projects
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .in('project_id', projectIds);
        
        if (tasksError) {
          console.error('Error fetching tasks:', tasksError);
        }

        if (tasks && tasks.length > 0) {
          taskIds = tasks.map(t => t.id);

          // Delete time entries FIRST (they reference tasks)
          const { error: timeEntriesError } = await supabase
            .from('time_entries')
            .delete()
            .in('task_id', taskIds);
          
          if (timeEntriesError) {
            console.error('Error deleting time entries:', timeEntriesError);
            throw new Error('Failed to delete related time entries');
          }

          // Delete task comments (they reference tasks)
          const { error: commentsError } = await supabase
            .from('task_comments')
            .delete()
            .in('task_id', taskIds);
          
          if (commentsError) {
            console.error('Error deleting task comments:', commentsError);
            throw new Error('Failed to delete related task comments');
          }

          // Delete invoice tasks (they reference tasks)
          const { error: invoiceTasksError } = await supabase
            .from('invoice_tasks')
            .delete()
            .in('task_id', taskIds);
          
          if (invoiceTasksError) {
            console.error('Error deleting invoice tasks:', invoiceTasksError);
          }

          // Now delete tasks (after all references are cleared)
          const { error: tasksDeleteError } = await supabase
            .from('tasks')
            .delete()
            .in('project_id', projectIds);
          
          if (tasksDeleteError) {
            console.error('Error deleting tasks:', tasksDeleteError);
            throw new Error('Failed to delete related tasks');
          }
        }

        // Delete payments
        const { error: paymentsError } = await supabase
          .from('payments')
          .delete()
          .eq('client_id', clientId);
        
        if (paymentsError) {
          console.error('Error deleting payments:', paymentsError);
        }

        // Delete invoices
        const { error: invoicesError } = await supabase
          .from('invoices')
          .delete()
          .eq('client_id', clientId);
        
        if (invoicesError) {
          console.error('Error deleting invoices:', invoicesError);
        }

        // Delete projects
        const { error: projectsDeleteError } = await supabase
          .from('projects')
          .delete()
          .eq('client_id', clientId);
        
        if (projectsDeleteError) {
          console.error('Error deleting projects:', projectsDeleteError);
          throw new Error('Failed to delete related projects');
        }
      }

      // Try to get the user ID from auth users table to clean up activity feed
      if (client?.email) {
        try {
          // Delete activity feed records for this user before deleting the client
          console.log('Cleaning up activity feed records for user:', client.email);
          
          const { error: activityCleanupError } = await supabase.functions.invoke(
            'delete-auth-user',
            {
              body: {
                email: client.email,
                cleanup_only: true // Flag to only clean up activity feed
              }
            }
          );

          if (activityCleanupError) {
            console.error('Failed to cleanup activity feed:', activityCleanupError);
          }
        } catch (cleanupError) {
          console.error('Error during activity feed cleanup:', cleanupError);
        }
      }

      // Delete the client record from database
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      
      if (error) throw error;

      // Try to delete the auth user if we have the email
      if (client?.email) {
        try {
          console.log('Attempting to delete auth user for:', client.email);
          
          const { data: response, error: authError } = await supabase.functions.invoke(
            'delete-auth-user',
            {
              body: {
                email: client.email
              }
            }
          );

          if (authError) {
            console.error('Failed to delete auth user:', authError);
            // Don't throw here - client deletion was successful
          } else if (response?.success) {
            console.log('Auth user deleted successfully');
          } else {
            console.log('Auth user deletion response:', response);
          }
        } catch (authError) {
          console.error('Error calling delete auth user function:', authError);
          // Don't throw here - client deletion was successful
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client and all related records deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete client: ' + error.message);
    }
  });

  const handleSubmit = () => {
    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, ...newClient });
    } else {
      if (!newClient.name || !newClient.email) {
        toast.error('Please fill in all required fields');
        return;
      }
      addClientMutation.mutate(newClient);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      email: client.email,
      company: client.company || '',
      phone: client.phone || ''
    });
    setSendInviteEmail(false); // Don't send invite when editing
    setIsDialogOpen(true);
  };

  const handleDelete = (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client? This will also delete all related projects, tasks, time entries, and other associated data.')) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const handleCreateAuthUser = (client: Client) => {
    if (window.confirm(`Create auth user for ${client.email} with role client? They will be able to login with email as password.`)) {
      createAuthUserMutation.mutate(client);
    }
  };

  const resetForm = () => {
    setNewClient({ name: '', email: '', company: '', phone: '' });
    setEditingClient(null);
    setSendInviteEmail(true);
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading clients...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-2">Manage your clients and their access to the platform</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                <DialogDescription>
                  {editingClient ? 'Update client information.' : 'Add a new client. An invitation email will be sent automatically for platform access.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={newClient.company}
                    onChange={(e) => setNewClient({...newClient, company: e.target.value})}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                {!editingClient && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sendInvite"
                      checked={sendInviteEmail}
                      onChange={(e) => setSendInviteEmail(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="sendInvite" className="text-sm">
                      Send password setup invitation email
                    </Label>
                  </div>
                )}
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={addClientMutation.isPending || updateClientMutation.isPending}
                >
                  {addClientMutation.isPending || updateClientMutation.isPending 
                    ? (editingClient ? 'Updating...' : 'Creating...') 
                    : (editingClient ? 'Update Client' : 'Create Client')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.company || 'N/A'}</TableCell>
                    <TableCell>{client.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateAuthUser(client)}
                          title="Create auth user"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(client.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {clients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No clients found. Add your first client to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default Clients;
