import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Download, Eye, DollarSign, ChevronDown, ChevronUp, Filter, TrendingUp, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Navigation from '@/components/Navigation';
import InvoiceComments from '@/components/InvoiceComments';
import { logActivity } from '@/utils/activityLogger';
import { usePrivileges } from '@/hooks/usePrivileges';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import InvoiceCreateDialog from './invoices/InvoiceCreateDialog';
import InvoiceEditDialog from './invoices/InvoiceEditDialog';
import InvoiceCard from './invoices/InvoiceCard';

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
    service: string;
  };
}

interface Task {
  id: string;
  name: string;
  hours: number;
  hourly_rate: number;
}

interface Project {
  id: string;
  name: string;
  status: string;
  client_id: string;
  client_name: string;
  service: string;
  type: string; // Billing type field (Fixed or Hourly)
  project_amount: number | null;
}

interface InvoiceTask {
  id: string;
  name: string;
  hours: number;
}

interface Client {
  id: string;
  name: string;
}

const Invoices = () => {
  const queryClient = useQueryClient();
  const { hasOperationAccess, userRole, userId, employeeId } = usePrivileges();
  const [newInvoice, setNewInvoice] = useState({
    project_id: '',
    selectedTasks: [] as string[],
    description: ''
  });
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');
  
  // Filter states
  const [statusFilters, setStatusFilters] = useState<string[]>(['Sent', 'Draft']);
  const [dueDateFilter, setDueDateFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Add state to hold selected project's billing_type (from type column) and project_amount
  const [selectedProjectBillingType, setSelectedProjectBillingType] = useState<string | null>(null);
  const [selectedProjectAmount, setSelectedProjectAmount] = useState<number | null>(null);

  // Clear all filters
  const clearFilters = () => {
    setStatusFilters(['Sent', 'Draft']);
    setDueDateFilter('all');
    setClientFilter('all');
    setProjectFilter('all');
    setGlobalServiceFilter('all');
  };

  // Handle status filter changes
  const handleStatusFilterChange = (value: string[]) => {
    setStatusFilters(value);
  };

  // Fetch invoices with client and project data including service type
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      console.log('Fetching invoices...');
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(name),
          projects(name, service)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching invoices:', error);
        throw error;
      }
      console.log('Invoices fetched:', data);
      return data as Invoice[];
    }
  });

  // Fetch clients for filter
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log('Fetching clients for filter...');
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
      console.log('Clients fetched for filter:', data);
      return data as Client[];
    }
  });

  // Fetch projects using the updated security definer function that now includes type
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-invoices', hasOperationAccess('invoices', 'create')],
    queryFn: async () => {
      console.log('🔍 Fetching projects for invoices using security definer function...');
      console.log('User has invoice create access:', hasOperationAccess('invoices', 'create'));
      
      if (!hasOperationAccess('invoices', 'create')) {
        console.log('User does not have invoice create permissions');
        return [];
      }
      
      // Use the security definer function that bypasses RLS restrictions
      const { data, error } = await supabase
        .rpc('get_active_projects_for_invoicing');
      
      if (error) {
        console.error('Error fetching projects for dropdown:', error);
        throw error;
      }
      
      console.log('Projects fetched for dropdown:', data);
      console.log('Total projects found:', data?.length || 0);
      
      // The function now returns the type column directly
      return (data as any[]).map((proj) => ({
        ...proj,
        // No need to default type anymore since it comes from the database
      })) as Project[];
    },
    enabled: !!userId && hasOperationAccess('invoices', 'create'),
  });

  // Fetch available tasks using the new security definer function
  const { data: availableTasks = [] } = useQuery({
    queryKey: ['available-tasks', newInvoice.project_id],
    queryFn: async () => {
      if (!newInvoice.project_id) return [];
      
      console.log('🔍 Fetching available tasks for project using security definer function:', newInvoice.project_id);
      
      // Use the security definer function that bypasses RLS restrictions
      const { data, error } = await supabase
        .rpc('get_completed_tasks_for_invoicing', { 
          project_uuid: newInvoice.project_id 
        });
      
      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
      console.log('Available tasks fetched:', data);
      return data as Task[];
    },
    enabled: !!newInvoice.project_id
  });

  // Fetch tasks for expanded invoice using the new security definer function
  const { data: invoiceTasks = [] } = useQuery({
    queryKey: ['invoice-tasks', expandedInvoice],
    queryFn: async () => {
      if (!expandedInvoice) return [];
      
      console.log('🔍 Fetching invoice tasks using security definer function for:', expandedInvoice);
      
      // Use the new security definer function that bypasses RLS restrictions
      const { data, error } = await supabase
        .rpc('get_invoice_tasks', { 
          invoice_id_param: expandedInvoice 
        });
      
      if (error) {
        console.error('Error fetching invoice tasks:', error);
        throw error;
      }
      console.log('Invoice tasks fetched:', data);
      return data as InvoiceTask[];
    },
    enabled: !!expandedInvoice
  });

  // Fetch services for the filter
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      console.log('Fetching services...');
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching services:', error);
        throw error;
      }
      console.log('Services fetched:', data);
      return data;
    }
  });

  // Helper function to check if an invoice is overdue
  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'Paid') return false;
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    return dueDate < today;
  };

  // Helper function to check if invoice is due today
  const isDueToday = (invoice: Invoice) => {
    if (invoice.status === 'Paid') return false;
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    return dueDate.toDateString() === today.toDateString();
  };

  // Helper function to check if invoice is due this week
  const isDueThisWeek = (invoice: Invoice) => {
    if (invoice.status === 'Paid') return false;
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= weekFromNow;
  };

  // Helper function to check if invoice is due this month
  const isDueThisMonth = (invoice: Invoice) => {
    if (invoice.status === 'Paid') return false;
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
  };

  // Filter invoices based on all filters
  const filteredInvoices = invoices.filter(invoice => {
    // Service filter
    if (globalServiceFilter !== 'all' && invoice.projects?.service !== globalServiceFilter) {
      return false;
    }

    // Client filter
    if (clientFilter !== 'all') {
      const clientMatch = clients.find(client => client.id === clientFilter);
      if (clientMatch && invoice.clients?.name !== clientMatch.name) {
        return false;
      }
    }

    // Project filter
    if (projectFilter !== 'all') {
      const projectMatch = projects.find(project => project.id === projectFilter);
      if (projectMatch && invoice.projects?.name !== projectMatch.name) {
        return false;
      }
    }

    // Status filter with special handling for overdue
    let statusMatch = false;
    if (statusFilters.includes('Overdue') && isOverdue(invoice)) {
      statusMatch = true;
    } else if (statusFilters.includes(invoice.status)) {
      statusMatch = true;
    }
    
    if (!statusMatch && statusFilters.length > 0) {
      return false;
    }

    // Due date filter
    if (dueDateFilter !== 'all') {
      switch (dueDateFilter) {
        case 'today':
          if (!isDueToday(invoice)) return false;
          break;
        case 'week':
          if (!isDueThisWeek(invoice)) return false;
          break;
        case 'month':
          if (!isDueThisMonth(invoice)) return false;
          break;
        case 'overdue':
          if (!isOverdue(invoice)) return false;
          break;
      }
    }

    return true;
  });

  // Generate unique invoice ID function
  const generateUniqueInvoiceId = async (): Promise<string> => {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      // Use timestamp + random number for better uniqueness
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
      const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
      const invoiceId = `INV-${timestamp}${random}`;
      
      // Check if this ID already exists
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', invoiceId)
        .single();
      
      if (!existingInvoice) {
        return invoiceId;
      }
      
      attempts++;
    }
    
    // Fallback: use UUID-like format
    return `INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  };

  // Create invoice mutation using the new security definer function
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      // Generate unique invoice ID
      const invoiceId = await generateUniqueInvoiceId();
      
      // Calculate totals
      const selectedTasksData = availableTasks.filter(task => 
        newInvoice.selectedTasks.includes(task.id)
      );
      
      const totalHours = selectedTasksData.reduce((sum, task) => sum + task.hours, 0);
      const rate = selectedTasksData[0]?.hourly_rate || 0;
      const totalAmount = totalHours * rate;
      
      // Get project and client info
      const project = projects.find(p => p.id === newInvoice.project_id);
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      // Use the security definer function to create invoice with tasks
      const { data: invoice, error } = await supabase
        .rpc('create_invoice_with_tasks', {
          p_invoice_id: invoiceId,
          p_client_id: project?.client_id,
          p_project_id: newInvoice.project_id,
          p_amount: totalAmount,
          p_hours: totalHours,
          p_rate: rate,
          p_due_date: dueDate.toISOString().split('T')[0],
          p_task_ids: newInvoice.selectedTasks
        });
      
      if (error) throw error;
      
      // Log activity
      await logActivity({
        action_type: 'created',
        entity_type: 'invoice',
        entity_id: invoiceId,
        entity_name: invoiceId,
        description: `Created invoice ${invoiceId} for ${project?.client_name} - ₹${totalAmount}`,
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

  // Update invoice mutation - only for due_date
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, due_date }: { id: string; due_date: string }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ due_date })
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
        description: `Updated invoice ${id} due date`,
        comment: `Due date changed to ${due_date}`
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsEditDialogOpen(false);
      setEditInvoice(null);
      toast.success(`Invoice ${data.id} updated successfully`);
    },
    onError: (error) => {
      toast.error('Failed to update invoice: ' + error.message);
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

  // Delete invoice mutation - use the new robust database function
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // Use the new robust delete function that handles everything
      const { error } = await supabase
        .rpc('delete_invoice_and_unmark_tasks', { 
          invoice_id_param: invoiceId 
        });
      
      if (error) throw error;

      // Log activity
      await logActivity({
        action_type: 'deleted',
        entity_type: 'invoice',
        entity_id: invoiceId,
        entity_name: invoiceId,
        description: `Deleted invoice ${invoiceId}`,
        comment: `Invoice and related tasks have been removed`
      });
      
      return invoiceId;
    },
    onSuccess: (invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['available-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-tasks'] });
      toast.success(`Invoice ${invoiceId} deleted successfully`);
    },
    onError: (error) => {
      toast.error('Failed to delete invoice: ' + error.message);
    }
  });

  // ⏬ Update: When project changes, check billing type and handle accordingly
  const handleProjectChange = (projectId: string) => {
    const selectedProject = projects.find((p: Project) => p.id === projectId);
    if (!selectedProject) {
      setSelectedProjectBillingType(null);
      setSelectedProjectAmount(null);
      setNewInvoice({
        project_id: '',
        selectedTasks: [],
        description: ''
      });
      return;
    }

    // Use project.type for billing type (now coming directly from database)
    console.log('Selected project billing type (from type column):', selectedProject.type);
    setSelectedProjectBillingType(selectedProject.type);
    setSelectedProjectAmount(selectedProject.project_amount ?? null);

    // For Fixed projects, validate project amount and auto-create if valid
    if (selectedProject.type === "Fixed") {
      if (!selectedProject.project_amount || selectedProject.project_amount <= 0) {
        toast.error('Project amount not set. Please update the project before invoicing.');
        setNewInvoice({
          project_id: '',
          selectedTasks: [],
          description: ''
        });
        setSelectedProjectBillingType(null);
        setSelectedProjectAmount(null);
        return;
      }

      // Auto-create fixed invoice
      const createFixedInvoice = async () => {
        if (createInvoiceMutation.isPending) return;
        
        try {
          const invoiceId = await generateUniqueInvoiceId();
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);

          // Create invoice with description for project completion
          const { error } = await supabase
            .from('invoices')
            .insert([{
              id: invoiceId,
              client_id: selectedProject.client_id,
              project_id: selectedProject.id,
              amount: selectedProject.project_amount,
              hours: 0,
              rate: 0,
              status: 'Draft',
              due_date: dueDate.toISOString().split('T')[0]
            }]);

          if (error) throw error;

          // Mark all project tasks as invoiced (implicit inclusion)
          await supabase
            .from('tasks')
            .update({ invoiced: true })
            .eq('project_id', selectedProject.id);

          // Mark project as completed
          await supabase
            .from('projects')
            .update({ status: 'Completed' })
            .eq('id', selectedProject.id);

          // Log activity
          await logActivity({
            action_type: 'created',
            entity_type: 'invoice',
            entity_id: invoiceId,
            entity_name: invoiceId,
            description: `Created fixed price invoice ${invoiceId} for ${selectedProject.client_name} - ₹${selectedProject.project_amount}`,
            comment: `Project Completion Invoice: ${selectedProject.name} (Fixed), Amount: ₹${selectedProject.project_amount}`
          });

          setIsDialogOpen(false);
          setNewInvoice({ project_id: '', selectedTasks: [], description: '' });
          setSelectedProjectBillingType(null);
          setSelectedProjectAmount(null);
          toast.success('Fixed price invoice created successfully!');
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['projects-for-invoices'] });

          // Expand the card for the newly created invoice
          setTimeout(() => {
            setExpandedInvoice(invoiceId);
            const el = document.getElementById(`invoice-${invoiceId}`);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }, 300);
        } catch (error) {
          console.error('Error creating fixed invoice:', error);
          toast.error('Failed to create fixed price invoice: ' + (error as Error).message);
        }
      };

      // Execute the fixed invoice creation
      void createFixedInvoice();
    } else {
      // For Hourly projects, just set the project and wait for task selection
      setNewInvoice({
        project_id: projectId,
        selectedTasks: [],
        description: ''
      });
    }
  };

  // Handle task selection
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

  // Get selected tasks total
  const getSelectedTasksTotal = () => {
    const selectedTasks = availableTasks.filter(task => 
      newInvoice.selectedTasks.includes(task.id)
    );
    const totalHours = selectedTasks.reduce((sum, task) => sum + task.hours, 0);
    const rate = selectedTasks[0]?.hourly_rate || 0;
    const totalAmount = totalHours * rate;
    return { totalHours, totalAmount };
  };

  // Handle create invoice
  const handleCreateInvoice = () => {
    if (!newInvoice.project_id || newInvoice.selectedTasks.length === 0) {
      toast.error('Please select a project and at least one task');
      return;
    }
    createInvoiceMutation.mutate({});
  };

  // Handle edit invoice
  const handleEditInvoice = (invoice: Invoice) => {
    setEditInvoice(invoice);
    setIsEditDialogOpen(true);
  };

  // Handle update invoice - only due_date is editable
  const handleUpdateInvoice = () => {
    if (!editInvoice) return;
    
    updateInvoiceMutation.mutate({
      id: editInvoice.id,
      due_date: editInvoice.due_date
    });
  };

  // Handle delete invoice
  const handleDeleteInvoice = (invoiceId: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This will also remove all associated invoice tasks and mark the tasks as not invoiced.')) {
      deleteInvoiceMutation.mutate(invoiceId);
    }
  };

  // Get status color
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

  // Update invoice status
  const updateInvoiceStatus = (invoiceId: string, newStatus: InvoiceStatus) => {
    updateInvoiceStatusMutation.mutate({ id: invoiceId, status: newStatus });
  };

  // Generate PDF with tasks
  const generatePDF = async (invoice: Invoice) => {
    try {
      // Fetch invoice tasks with logged hours
      const { data: tasks, error } = await supabase
        .rpc('get_invoice_tasks', { 
          invoice_id_param: invoice.id 
        });
      
      if (error) {
        console.error('Error fetching invoice tasks for PDF:', error);
        toast.error('Failed to fetch invoice tasks for PDF');
        return;
      }

      // Create tasks table HTML
      let tasksTableHTML = '';
      if (tasks && tasks.length > 0) {
        tasksTableHTML = `
          <h3 style="margin-top: 30px; margin-bottom: 15px; font-size: 16px;">Tasks Completed:</h3>
          <table class="table" style="margin-bottom: 20px;">
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Task Name</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Hours Logged</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Rate (₹/hr)</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left; font-weight: bold;">Amount (₹)</th>
            </tr>
            ${tasks.map(task => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px;">${task.name || 'N/A'}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">${task.hours || 0}h</td>
                <td style="border: 1px solid #ddd; padding: 12px;">₹${invoice.rate}</td>
                <td style="border: 1px solid #ddd; padding: 12px;">₹${((task.hours || 0) * invoice.rate).toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
        `;
      }

      // Simple PDF generation using browser print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice ${invoice.id}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.4; }
                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .invoice-details { margin-bottom: 30px; }
                .invoice-details div { margin-bottom: 8px; }
                .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                .table th { background-color: #f5f5f5; font-weight: bold; }
                .total { font-weight: bold; font-size: 18px; background-color: #f0f0f0; }
                .company-info { margin-bottom: 30px; }
                h1 { color: #333; margin-bottom: 10px; }
                h2 { color: #666; margin-top: 0; }
                h3 { color: #444; }
                .summary-table { margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>INVOICE</h1>
                <h2>${invoice.id}</h2>
              </div>
              
              <div class="company-info">
                <h3>From:</h3>
                <div><strong>White India</strong></div>
                <div>Software Development Company</div>
              </div>
              
              <div class="invoice-details">
                <h3>Bill To:</h3>
                <div><strong>Client:</strong> ${invoice.clients?.name || 'N/A'}</div>
                <div><strong>Project:</strong> ${invoice.projects?.name || 'N/A'}</div>
                <div><strong>Service Type:</strong> ${invoice.projects?.service || 'N/A'}</div>
                <div><strong>Invoice Date:</strong> ${invoice.date}</div>
                <div><strong>Due Date:</strong> ${invoice.due_date}</div>
                <div><strong>Status:</strong> ${invoice.status}</div>
              </div>
              
              ${tasksTableHTML}
              
              <div class="summary-table">
                <h3>Summary:</h3>
                <table class="table">
                  <tr>
                    <th>Description</th>
                    <th>Total Hours</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                  <tr>
                    <td>${invoice.projects?.name || 'N/A'} - ${invoice.projects?.service || 'Service'}</td>
                    <td>${invoice.hours}h</td>
                    <td>₹${invoice.rate}/hr</td>
                    <td>₹${invoice.amount.toFixed(2)}</td>
                  </tr>
                  <tr class="total">
                    <td colspan="3"><strong>Total Amount</strong></td>
                    <td><strong>₹${invoice.amount.toFixed(2)}</strong></td>
                  </tr>
                </table>
              </div>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
                <p>Thank you for your business!</p>
                <p>Please remit payment by the due date to avoid late fees.</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
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
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-2 text-sm lg:text-base">Generate and manage your invoices</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Global Service Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm font-medium">Service:</span>
              </div>
              <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
                <SelectTrigger className="w-full sm:w-48 min-w-0">
                  <SelectValue placeholder="Filter by service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Service Types</SelectItem>
                  {services.filter(service => service != null).map((service) => (
                    <SelectItem key={service.id} value={service.name}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasOperationAccess('invoices', 'create') && (
              <InvoiceCreateDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                projects={projects}
                availableTasks={availableTasks}
                services={services}
                selectedProjectBillingType={selectedProjectBillingType}
                selectedProjectAmount={selectedProjectAmount}
                hasOperationAccess={hasOperationAccess}
                newInvoice={newInvoice}
                setNewInvoice={setNewInvoice}
                handleProjectChange={handleProjectChange}
                handleCreateInvoice={handleCreateInvoice}
                handleTaskSelection={handleTaskSelection}
                createInvoiceMutationPending={createInvoiceMutation.isPending}
              />
            )}
          </div>
        </div>

        {/* Enhanced Filter Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Filters */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <ToggleGroup 
                type="multiple" 
                value={statusFilters} 
                onValueChange={handleStatusFilterChange}
                className="justify-start flex-wrap"
              >
                <ToggleGroupItem value="Draft" className="data-[state=on]:bg-yellow-100 data-[state=on]:text-yellow-800">
                  Draft
                </ToggleGroupItem>
                <ToggleGroupItem value="Sent" className="data-[state=on]:bg-blue-100 data-[state=on]:text-blue-800">
                  Sent
                </ToggleGroupItem>
                <ToggleGroupItem value="Paid" className="data-[state=on]:bg-green-100 data-[state=on]:text-green-800">
                  Paid
                </ToggleGroupItem>
                <ToggleGroupItem value="Overdue" className="data-[state=on]:bg-red-100 data-[state=on]:text-red-800">
                  Overdue
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Horizontal Layout for Due Date, Client, and Project Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Due Date Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Due Date</Label>
                <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by due date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Due Dates</SelectItem>
                    <SelectItem value="today">Due Today</SelectItem>
                    <SelectItem value="week">Due This Week</SelectItem>
                    <SelectItem value="month">Due This Month</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Client Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Client</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Project</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Showing {filteredInvoices.length} of {invoices.length} invoices</span>
                {(statusFilters.length > 0 || dueDateFilter !== 'all' || clientFilter !== 'all' || projectFilter !== 'all' || globalServiceFilter !== 'all') && (
                  <div className="flex items-center gap-1">
                    <span>•</span>
                    <span>Filters active</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <p className="text-sm font-medium text-gray-600">Filtered Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Invoice Dialog */}
        <InvoiceEditDialog
          open={isEditDialogOpen}
          invoice={editInvoice}
          onOpenChange={setIsEditDialogOpen}
          setEditInvoice={inv => setEditInvoice(inv)}
          onDueDateChange={(date) => {
            if (editInvoice) {
              setEditInvoice({
                ...editInvoice,
                due_date: date
              });
            }
          }}
          onUpdateInvoice={handleUpdateInvoice}
          isPending={updateInvoiceMutation.isPending}
        />

        {/* Invoices List */}
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">
                  No invoices found with the current filters.
                </p>
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                invoiceTasks={expandedInvoice === invoice.id ? invoiceTasks : []}
                expanded={expandedInvoice === invoice.id}
                onExpand={setExpandedInvoice}
                isOverdue={isOverdue}
                isDueToday={isDueToday}
                getStatusColor={getStatusColor}
                hasOperationAccess={hasOperationAccess}
                onPDF={generatePDF}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                deletePending={deleteInvoiceMutation.isPending}
                onUpdateStatus={updateInvoiceStatus}
                updateStatusPending={updateInvoiceStatusMutation.isPending}
              />
            ))
          )}
        </div>
      </div>
    </Navigation>
  );
};

export default Invoices;
