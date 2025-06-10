import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Download, Eye, DollarSign, ChevronDown, ChevronUp, Filter, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Navigation from '@/components/Navigation';
import { logActivity } from '@/utils/activityLogger';

type InvoiceStatus = Database['public']['Enums']['invoice_status'];

interface Invoice {
  id: string;
  amount: number;
  hours: number;
  rate: number;
  status: InvoiceStatus;
  date: string;
  due_date: string;
  clients: {
    name: string;
  };
  projects: {
    name: string;
    type: string;
  };
}

interface Task {
  id: string;
  name: string;
  hours: number;
  projects: {
    hourly_rate: number;
  };
}

interface Project {
  id: string;
  name: string;
  clients: {
    id: string;
    name: string;
  };
}

interface InvoiceTask {
  tasks: {
    id: string;
    name: string;
    hours: number;
  };
}

const Invoices = () => {
  const queryClient = useQueryClient();
  const [newInvoice, setNewInvoice] = useState({
    project_id: '',
    selectedTasks: [] as string[],
    description: ''
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');

  // Fetch invoices with client and project data including service type
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(name),
          projects(name, type)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invoice[];
    }
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          clients(id, name)
        `);
      
      if (error) throw error;
      return data as Project[];
    }
  });

  // Fetch available tasks for selected project
  const { data: availableTasks = [] } = useQuery({
    queryKey: ['available-tasks', newInvoice.project_id],
    queryFn: async () => {
      if (!newInvoice.project_id) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects(hourly_rate)
        `)
        .eq('project_id', newInvoice.project_id)
        .eq('status', 'Completed')
        .eq('invoiced', false);
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!newInvoice.project_id
  });

  // Fetch tasks for expanded invoice
  const { data: invoiceTasks = [] } = useQuery({
    queryKey: ['invoice-tasks', expandedInvoice],
    queryFn: async () => {
      if (!expandedInvoice) return [];
      
      const { data, error } = await supabase
        .from('invoice_tasks')
        .select(`
          tasks(id, name, hours)
        `)
        .eq('invoice_id', expandedInvoice);
      
      if (error) throw error;
      return data as InvoiceTask[];
    },
    enabled: !!expandedInvoice
  });

  // Fetch services for the filter
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Filter invoices based on global service filter
  const filteredInvoices = invoices.filter(invoice => {
    if (globalServiceFilter === 'all') return true;
    // Filter by project service type
    return invoice.projects.type === globalServiceFilter;
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      // Generate invoice ID
      const { data: invoiceCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact' });
      
      const invoiceId = `INV-${String((invoiceCount?.length || 0) + 1).padStart(3, '0')}`;
      
      // Calculate totals
      const selectedTasksData = availableTasks.filter(task => 
        newInvoice.selectedTasks.includes(task.id)
      );
      
      const totalHours = selectedTasksData.reduce((sum, task) => sum + task.hours, 0);
      const rate = selectedTasksData[0]?.projects.hourly_rate || 0;
      const totalAmount = totalHours * rate;
      
      // Get project and client info
      const project = projects.find(p => p.id === newInvoice.project_id);
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          id: invoiceId,
          client_id: project?.clients.id,
          project_id: newInvoice.project_id,
          amount: totalAmount,
          hours: totalHours,
          rate: rate,
          status: 'Draft',
          due_date: dueDate.toISOString().split('T')[0]
        }])
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // Link tasks to invoice
      const invoiceTasksData = newInvoice.selectedTasks.map(taskId => ({
        invoice_id: invoiceId,
        task_id: taskId
      }));
      
      const { error: taskLinkError } = await supabase
        .from('invoice_tasks')
        .insert(invoiceTasksData);
      
      if (taskLinkError) throw taskLinkError;
      
      // Mark tasks as invoiced
      const { error: updateTasksError } = await supabase
        .from('tasks')
        .update({ invoiced: true })
        .in('id', newInvoice.selectedTasks);
      
      if (updateTasksError) throw updateTasksError;
      
      // Log activity
      await logActivity({
        action_type: 'created',
        entity_type: 'invoice',
        entity_id: invoiceId,
        entity_name: invoiceId,
        description: `Created invoice ${invoiceId} for ${project?.clients.name} - ₹${totalAmount}`,
        comment: `${totalHours} hours at ₹${rate}/hr`
      });
      
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      setNewInvoice({ project_id: '', selectedTasks: [], description: '' });
      setIsDialogOpen(false);
      toast.success('Invoice created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create invoice: ' + error.message);
    }
  });

  // Update invoice status mutation
  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Log activity
      await logActivity({
        action_type: 'updated',
        entity_type: 'invoice',
        entity_id: id,
        entity_name: id,
        description: `Updated invoice ${id} status to ${status}`,
        comment: `Status changed from previous to ${status}`
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Invoice ${data.id} marked as ${data.status.toLowerCase()}`);
    }
  });

  const handleProjectChange = (projectId: string) => {
    setNewInvoice({
      ...newInvoice,
      project_id: projectId,
      selectedTasks: []
    });
  };

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    if (checked) {
      setNewInvoice({
        ...newInvoice,
        selectedTasks: [...newInvoice.selectedTasks, taskId]
      });
    } else {
      setNewInvoice({
        ...newInvoice,
        selectedTasks: newInvoice.selectedTasks.filter(id => id !== taskId)
      });
    }
  };

  const getSelectedTasksTotal = () => {
    const selectedTasks = availableTasks.filter(task => 
      newInvoice.selectedTasks.includes(task.id)
    );
    const totalHours = selectedTasks.reduce((sum, task) => sum + task.hours, 0);
    const rate = selectedTasks[0]?.projects.hourly_rate || 0;
    const totalAmount = totalHours * rate;
    return { totalHours, totalAmount };
  };

  const handleCreateInvoice = () => {
    if (!newInvoice.project_id || newInvoice.selectedTasks.length === 0) {
      toast.error('Please select a project and at least one task');
      return;
    }
    createInvoiceMutation.mutate({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Sent':
        return 'bg-blue-100 text-blue-800';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const updateInvoiceStatus = (invoiceId: string, newStatus: InvoiceStatus) => {
    updateInvoiceStatusMutation.mutate({ id: invoiceId, status: newStatus });
  };

  const generatePDF = (invoice: Invoice) => {
    // Simple PDF generation using browser print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice ${invoice.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 40px; }
              .invoice-details { margin-bottom: 30px; }
              .table { width: 100%; border-collapse: collapse; }
              .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              .total { font-weight: bold; font-size: 18px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>INVOICE</h1>
              <h2>${invoice.id}</h2>
            </div>
            <div class="invoice-details">
              <p><strong>Client:</strong> ${invoice.clients.name}</p>
              <p><strong>Project:</strong> ${invoice.projects.name}</p>
              <p><strong>Date:</strong> ${invoice.date}</p>
              <p><strong>Due Date:</strong> ${invoice.due_date}</p>
            </div>
            <table class="table">
              <tr>
                <th>Description</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
              <tr>
                <td>${invoice.projects.name} - Work completed</td>
                <td>${invoice.hours}</td>
                <td>₹${invoice.rate}</td>
                <td>₹${invoice.amount.toFixed(2)}</td>
              </tr>
              <tr class="total">
                <td colspan="3">Total</td>
                <td>₹${invoice.amount.toFixed(2)}</td>
              </tr>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const totalRevenue = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingRevenue = invoices.filter(inv => inv.status === 'Sent').reduce((sum, inv) => sum + inv.amount, 0);

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading invoices...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-2">Generate and manage your invoices</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Global Service Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Service Types</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.name}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Invoice</DialogTitle>
                  <DialogDescription>
                    Select completed tasks to generate an invoice.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={newInvoice.project_id} onValueChange={handleProjectChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} ({project.clients.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {newInvoice.project_id && (
                    <div className="space-y-2">
                      <Label>Select Tasks to Invoice</Label>
                      <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                        {availableTasks.length === 0 ? (
                          <p className="text-gray-500 text-sm">No completed tasks available for this project.</p>
                        ) : (
                          <div className="space-y-3">
                            {availableTasks.map((task) => (
                              <div key={task.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                                <Checkbox
                                  id={`task-${task.id}`}
                                  checked={newInvoice.selectedTasks.includes(task.id)}
                                  onCheckedChange={(checked) => handleTaskSelection(task.id, checked as boolean)}
                                />
                                <div className="flex-1">
                                  <label htmlFor={`task-${task.id}`} className="text-sm font-medium cursor-pointer">
                                    {task.name}
                                  </label>
                                  <div className="text-xs text-gray-600">
                                    {task.hours}h × ₹{task.projects.hourly_rate}/hr = ₹{(task.hours * task.projects.hourly_rate).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {newInvoice.selectedTasks.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total Hours:</span>
                          <span className="text-lg font-bold">
                            {getSelectedTasksTotal().totalHours.toFixed(2)}h
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total Amount:</span>
                          <span className="text-2xl font-bold text-green-600">
                            ₹{getSelectedTasksTotal().totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleCreateInvoice} 
                    className="w-full"
                    disabled={newInvoice.selectedTasks.length === 0 || createInvoiceMutation.isPending}
                  >
                    {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">₹{pendingRevenue.toFixed(2)}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices List */}
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">
                  No invoices found
                  {globalServiceFilter !== 'all' && ` for ${globalServiceFilter} service type`}.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-semibold">{invoice.id}</h3>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-1">{invoice.clients.name}</p>
                      <p className="text-sm text-gray-500">{invoice.projects.name}</p>
                      <p className="text-xs text-gray-400">Service: {invoice.projects.type}</p>
                      <div className="mt-3 flex items-center space-x-6 text-sm text-gray-600">
                        <span>{invoice.hours}h × ₹{invoice.rate}/hr</span>
                        <span>Due: {invoice.due_date}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 mb-4">
                        ₹{invoice.amount.toFixed(2)}
                      </p>
                      <div className="flex space-x-2 mb-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                        >
                          {expandedInvoice === invoice.id ? (
                            <ChevronUp className="h-4 w-4 mr-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 mr-1" />
                          )}
                          Tasks
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => generatePDF(invoice)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                        {invoice.status === 'Draft' && (
                          <Button 
                            size="sm"
                            onClick={() => updateInvoiceStatus(invoice.id, 'Sent')}
                            disabled={updateInvoiceStatusMutation.isPending}
                          >
                            Send
                          </Button>
                        )}
                        {invoice.status === 'Sent' && (
                          <Button 
                            size="sm"
                            onClick={() => updateInvoiceStatus(invoice.id, 'Paid')}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={updateInvoiceStatusMutation.isPending}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {expandedInvoice === invoice.id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-3">Tasks in this invoice:</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task Name</TableHead>
                            <TableHead>Hours</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceTasks.map((invoiceTask, index) => (
                            <TableRow key={index}>
                              <TableCell>{invoiceTask.tasks.name}</TableCell>
                              <TableCell>{invoiceTask.tasks.hours}h</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Navigation>
  );
};

export default Invoices;
