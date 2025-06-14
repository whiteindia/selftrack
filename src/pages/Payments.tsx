import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, DollarSign, Calendar, Filter, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { logPaymentCreated } from '@/utils/activity/financialActivity';
import { usePrivileges } from '@/hooks/usePrivileges';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  payment_type: 'invoice' | 'advance';
  clients: { name: string } | null;
  projects: { name: string } | null;
  invoices: { id: string } | null;
  client_id: string;
  project_id: string;
  invoice_id: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  clients: { name: string } | null;
  projects: { name: string } | null;
  client_id: string;
  project_id: string;
}

const Payments = () => {
  const { userRole } = useAuth();
  const { hasOperationAccess, loading: privilegesLoading } = usePrivileges();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [filters, setFilters] = useState({
    client_id: '',
    project_id: '',
    start_date: '',
    end_date: ''
  });
  const [newPayment, setNewPayment] = useState({
    client_id: '',
    project_id: '',
    invoice_id: '',
    amount: '',
    payment_method: '',
    payment_type: 'invoice' as 'invoice' | 'advance',
    payment_date: new Date().toISOString().split('T')[0]
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          clients(name),
          projects(name),
          invoices(id)
        `)
        .order('payment_date', { ascending: false });

      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.start_date) {
        query = query.gte('payment_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('payment_date', filters.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    }
  });

  // Fetch clients for payment records
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    }
  });

  // Fetch projects for filter dropdown
  const { data: allProjects = [] } = useQuery({
    queryKey: ['all-projects-for-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .order('name');
      
      if (error) throw error;
      return data as Project[];
    }
  });

  // Fetch projects for selected client
  const { data: clientProjects = [] } = useQuery({
    queryKey: ['client-projects', newPayment.client_id],
    queryFn: async () => {
      if (!newPayment.client_id) return [];
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .eq('client_id', newPayment.client_id)
        .order('name');
      
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!newPayment.client_id
  });

  // Fetch unpaid invoices for selected project
  const { data: projectInvoices = [] } = useQuery({
    queryKey: ['project-invoices', newPayment.project_id],
    queryFn: async () => {
      if (!newPayment.project_id) return [];
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          status,
          clients(name),
          projects(name),
          client_id,
          project_id
        `)
        .eq('project_id', newPayment.project_id)
        .eq('status', 'Sent')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!newPayment.project_id
  });

  // Generate advance payment ID using timestamp-based approach
  const generateAdvanceId = () => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ADV-${timestamp}-${randomSuffix}`;
  };

  const addPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      let invoiceId = paymentData.invoice_id;
      
      // Generate advance ID if it's an advance payment
      if (paymentData.payment_type === 'advance') {
        invoiceId = null;
      }

      // Create payment
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          client_id: paymentData.client_id,
          project_id: paymentData.project_id,
          invoice_id: invoiceId,
          amount: parseFloat(paymentData.amount),
          payment_method: paymentData.payment_method,
          payment_type: paymentData.payment_type,
          payment_date: paymentData.payment_date
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Update invoice status to Paid only for invoice payments
      if (paymentData.payment_type === 'invoice' && paymentData.invoice_id) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: 'Paid' })
          .eq('id', paymentData.invoice_id);
        
        if (updateError) throw updateError;
      }

      // Log activity using the financial activity logger
      await logPaymentCreated(
        parseFloat(paymentData.amount),
        paymentData.client_name,
        paymentData.payment_type === 'invoice' ? paymentData.invoice_id : 'Advance Payment',
        data.id
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['project-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setNewPayment({
        client_id: '',
        project_id: '',
        invoice_id: '',
        amount: '',
        payment_method: '',
        payment_type: 'invoice',
        payment_date: new Date().toISOString().split('T')[0]
      });
      setIsDialogOpen(false);
      toast.success('Payment recorded successfully!');
    },
    onError: (error) => {
      toast.error('Failed to record payment: ' + error.message);
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      // Get payment details first to find the invoice
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('invoice_id, payment_type')
        .eq('id', paymentId)
        .single();
      
      if (paymentError) throw paymentError;

      // Delete the payment
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);
      
      if (deleteError) throw deleteError;

      // Update invoice status back to Sent only for invoice payments
      if (payment.payment_type === 'invoice' && payment.invoice_id) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: 'Sent' })
          .eq('id', payment.invoice_id);
        
        if (updateError) throw updateError;
      }

      return payment.invoice_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['project-invoices'] });
      toast.success('Payment deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete payment: ' + error.message);
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (updatedPayment: any) => {
      const { error } = await supabase
        .from('payments')
        .update({
          amount: parseFloat(updatedPayment.amount),
          payment_method: updatedPayment.payment_method,
          payment_date: updatedPayment.payment_date
        })
        .eq('id', updatedPayment.id);
      
      if (error) throw error;
      return updatedPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsEditDialogOpen(false);
      setEditingPayment(null);
      toast.success('Payment updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update payment: ' + error.message);
    }
  });

  const handleClientChange = (clientId: string) => {
    setNewPayment({
      ...newPayment,
      client_id: clientId,
      project_id: '',
      invoice_id: '',
      amount: ''
    });
  };

  const handleProjectChange = (projectId: string) => {
    setNewPayment({
      ...newPayment,
      project_id: projectId,
      invoice_id: '',
      amount: ''
    });
  };

  const handlePaymentTypeChange = (paymentType: 'invoice' | 'advance') => {
    setNewPayment({
      ...newPayment,
      payment_type: paymentType,
      invoice_id: '',
      amount: ''
    });
  };

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = projectInvoices.find(inv => inv.id === invoiceId);
    setNewPayment({
      ...newPayment,
      invoice_id: invoiceId,
      amount: invoice ? invoice.amount.toString() : ''
    });
  };

  const handleAddPayment = () => {
    if (!newPayment.client_id || !newPayment.project_id || !newPayment.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (newPayment.payment_type === 'invoice' && !newPayment.invoice_id) {
      toast.error('Please select an invoice for invoice payments');
      return;
    }
    
    const selectedClient = clients.find(c => c.id === newPayment.client_id);
    
    addPaymentMutation.mutate({
      ...newPayment,
      client_name: selectedClient?.name || 'Unknown Client'
    });
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePayment = () => {
    if (!editingPayment || !editingPayment.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    updatePaymentMutation.mutate(editingPayment);
  };

  const handleDeletePayment = (paymentId: string) => {
    deletePaymentMutation.mutate(paymentId);
  };

  const clearFilters = () => {
    setFilters({ client_id: '', project_id: '', start_date: '', end_date: '' });
  };

  const getPaymentId = (payment: Payment) => {
    if (payment.payment_type === 'advance') {
      return `ADV-${String(payment.id).slice(-6).padStart(6, '0')}`;
    }
    return payment.invoices?.id ? `INV-${payment.invoices.id}` : 'N/A';
  };

  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = payments
    .filter(payment => {
      const paymentDate = new Date(payment.payment_date);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    })
    .reduce((sum, payment) => sum + payment.amount, 0);

  console.log('=== Payments Page Debug ===');
  console.log('User role:', userRole);
  console.log('Privileges loading:', privilegesLoading);
  console.log('Has create access:', hasOperationAccess('payments', 'create'));

  if (isLoading || privilegesLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading payments...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-600 mt-2">Track and manage payment records</p>
          </div>
          
          {hasOperationAccess('payments', 'create') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record New Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment for an invoice or advance payment.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Client</Label>
                    <Select value={newPayment.client_id} onValueChange={handleClientChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newPayment.client_id && (
                    <div className="space-y-2">
                      <Label htmlFor="project">Project</Label>
                      <Select value={newPayment.project_id} onValueChange={handleProjectChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {newPayment.project_id && (
                    <div className="space-y-2">
                      <Label htmlFor="paymentType">Payment Type</Label>
                      <Select value={newPayment.payment_type} onValueChange={handlePaymentTypeChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="advance">Advance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {newPayment.project_id && newPayment.payment_type === 'invoice' && (
                    <div className="space-y-2">
                      <Label htmlFor="invoice">Invoice</Label>
                      <Select value={newPayment.invoice_id} onValueChange={handleInvoiceChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an invoice" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectInvoices.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              No unpaid invoices found
                            </div>
                          ) : (
                            projectInvoices.map((invoice) => (
                              <SelectItem key={invoice.id} value={invoice.id}>
                                {invoice.id} - ₹{invoice.amount} ({invoice.status})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                      placeholder="0.00"
                      disabled={newPayment.payment_type === 'invoice' && !!newPayment.invoice_id}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={newPayment.payment_method} onValueChange={(value) => setNewPayment({...newPayment, payment_method: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={newPayment.payment_date}
                      onChange={(e) => setNewPayment({...newPayment, payment_date: e.target.value})}
                    />
                  </div>
                  <Button 
                    onClick={handleAddPayment} 
                    className="w-full"
                    disabled={addPaymentMutation.isPending}
                  >
                    {addPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          {/* Debug info for troubleshooting */}
          {userRole !== 'admin' && (
            <div className="text-xs text-gray-400 ml-4">
              <p>Role: {userRole}</p>
              <p>Create access: {String(hasOperationAccess('payments', 'create'))}</p>
            </div>
          )}
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month's Revenue</p>
                  <p className="text-3xl font-bold text-green-600">₹{monthlyRevenue.toFixed(2)}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-blue-600">₹{totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={filters.client_id} onValueChange={(value) => setFilters({...filters, client_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={filters.project_id} onValueChange={(value) => setFilters({...filters, project_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                />
              </div>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Payment Method</TableHead>
                  {hasOperationAccess('payments', 'update') && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.clients?.name || 'Unknown Client'}
                    </TableCell>
                    <TableCell>
                      {getPaymentId(payment)}
                    </TableCell>
                    <TableCell>
                      {payment.projects?.name || 'Unknown Project'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.payment_type === 'invoice' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {payment.payment_type === 'invoice' ? 'Invoice' : 'Advance'}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ₹{payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{payment.payment_date}</TableCell>
                    <TableCell>{payment.payment_method || 'N/A'}</TableCell>
                    {hasOperationAccess('payments', 'update') && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPayment(payment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete the payment record and change the invoice status back to "Sent". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePayment(payment.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {payments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No payments found with current filters.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Payment Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
              <DialogDescription>
                Update payment details.
              </DialogDescription>
            </DialogHeader>
            {editingPayment && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editAmount">Amount</Label>
                  <Input
                    id="editAmount"
                    type="number"
                    step="0.01"
                    value={editingPayment.amount}
                    onChange={(e) => setEditingPayment({
                      ...editingPayment,
                      amount: parseFloat(e.target.value) || 0
                    })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPaymentMethod">Payment Method</Label>
                  <Select 
                    value={editingPayment.payment_method || ''} 
                    onValueChange={(value) => setEditingPayment({
                      ...editingPayment,
                      payment_method: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPaymentDate">Payment Date</Label>
                  <Input
                    id="editPaymentDate"
                    type="date"
                    value={editingPayment.payment_date}
                    onChange={(e) => setEditingPayment({
                      ...editingPayment,
                      payment_date: e.target.value
                    })}
                  />
                </div>
                <Button 
                  onClick={handleUpdatePayment} 
                  className="w-full"
                  disabled={updatePaymentMutation.isPending}
                >
                  {updatePaymentMutation.isPending ? 'Updating...' : 'Update Payment'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Navigation>
  );
};

export default Payments;
