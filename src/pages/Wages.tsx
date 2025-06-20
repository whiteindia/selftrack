import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Filter, Check, X, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePrivileges } from '@/hooks/usePrivileges';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import 'jspdf-autotable';

interface TimeEntry {
  id: string;
  employee_id: string;
  task_id: string;
  duration_minutes: number;
  created_at: string;
  start_time: string;
  comment?: string;
  entry_type: string;
  task_name: string;
  wage_status: string;
  project_id: string;
  assignee_id: string | null;
  assigner_id: string | null;
  employee_name: string;
  hourly_rate: number;
  project_name: string;
  project_service: string;
  client_name: string;
  project_type: string;
}

interface Employee {
  id: string;
  name: string;
  hourly_rate: number;
}

interface Service {
  id: string;
  name: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  service: string;
  client_name: string;
  type: string; // Added billing type
}

interface TaskWageAmount {
  id: string;
  task_id: string;
  user_id: string;
  amount: number;
}

const Wages = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');
  const [wageStatusFilter, setWageStatusFilter] = useState<string>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [projectsData, setProjectsData] = useState<Record<string, ProjectInfo>>({});
  const [activeTab, setActiveTab] = useState<string>('hourly');
  const [editingTaskAmount, setEditingTaskAmount] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const queryClient = useQueryClient();

  const { hasPageAccess, hasOperationAccess, loading: privilegesLoading, userRole, userId } = usePrivileges();
  
  // Check if user has access to wages page
  const hasWagesAccess = hasPageAccess('wages') || userRole === 'admin';
  
  // Check specific permissions for wages page operations
  const canUpdate = hasOperationAccess('wages', 'update') || userRole === 'admin';
  const canDelete = hasOperationAccess('wages', 'delete') || userRole === 'admin';

  // Fetch task wage amounts for fixed projects
  const { data: taskWageAmounts = [] } = useQuery({
    queryKey: ['task-wage-amounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_wage_amounts')
        .select('*');

      if (error) {
        console.error("Error fetching task wage amounts:", error);
        throw error;
      }

      return data as TaskWageAmount[];
    },
    enabled: hasWagesAccess && !privilegesLoading
  });

  // Fetch time entries with employee hourly rate data and comments - RLS will filter automatically
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['time-entries', selectedEmployee, selectedMonth],
    queryFn: async () => {
      console.log('Fetching time entries with RLS filtering active');
      const startDate = startOfMonth(selectedMonth).toISOString();
      const endDate = endOfMonth(selectedMonth).toISOString();

      let query = supabase
        .from('time_entries')
        .select(`
          id,
          task_id,
          employee_id,
          start_time,
          end_time,
          duration_minutes,
          comment,
          entry_type,
          employees!employee_id(
            name,
            hourly_rate
          )
        `)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching time entries:", error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} time entries after RLS filtering`);
      
      // Process each entry to get task/subtask details
      const enrichedEntries: TimeEntry[] = [];
      
      for (const entry of data || []) {
        let taskDetails = null;

        if (entry.entry_type === 'task') {
          // Get task details
          const { data: taskData } = await supabase
            .from('tasks')
            .select(`
              id,
              name,
              wage_status,
              project_id,
              assignee_id,
              assigner_id,
              projects (
                name,
                service,
                type,
                client_id,
                clients (
                  name
                )
              )
            `)
            .eq('id', entry.task_id)
            .single();

          if (taskData) {
            taskDetails = {
              name: taskData.name,
              wage_status: taskData.wage_status,
              project_id: taskData.project_id,
              assignee_id: taskData.assignee_id,
              assigner_id: taskData.assigner_id,
              project_name: taskData.projects?.name || 'Unknown Project',
              project_service: taskData.projects?.service || 'Unknown Service',
              client_name: taskData.projects?.clients?.name || 'Unknown Client',
              project_type: taskData.projects?.type || 'Hourly'
            };
          }
        } else if (entry.entry_type === 'subtask') {
          // Get subtask details
          const { data: subtaskData } = await supabase
            .from('subtasks')
            .select(`
              id,
              name,
              assignee_id,
              assigner_id,
              task_id,
              tasks!inner (
                wage_status,
                project_id,
                projects (
                  name,
                  service,
                  type,
                  client_id,
                  clients (
                    name
                  )
                )
              )
            `)
            .eq('id', entry.task_id)
            .single();

          if (subtaskData) {
            taskDetails = {
              name: subtaskData.name,
              wage_status: subtaskData.tasks?.wage_status || 'wnotpaid',
              project_id: subtaskData.tasks?.project_id,
              assignee_id: subtaskData.assignee_id,
              assigner_id: subtaskData.assigner_id,
              project_name: subtaskData.tasks?.projects?.name || 'Unknown Project',
              project_service: subtaskData.tasks?.projects?.service || 'Unknown Service',
              client_name: subtaskData.tasks?.projects?.clients?.name || 'Unknown Client',
              project_type: subtaskData.tasks?.projects?.type || 'Hourly'
            };
          }
        }

        if (taskDetails && entry.employees) {
          enrichedEntries.push({
            id: entry.id,
            employee_id: entry.employee_id,
            task_id: entry.task_id,
            duration_minutes: entry.duration_minutes || 0,
            created_at: entry.start_time,
            start_time: entry.start_time,
            comment: entry.comment,
            entry_type: entry.entry_type,
            task_name: taskDetails.name,
            wage_status: taskDetails.wage_status,
            project_id: taskDetails.project_id,
            assignee_id: taskDetails.assignee_id,
            assigner_id: taskDetails.assigner_id,
            employee_name: entry.employees.name,
            hourly_rate: entry.employees.hourly_rate,
            project_name: taskDetails.project_name,
            project_service: taskDetails.project_service,
            client_name: taskDetails.client_name,
            project_type: taskDetails.project_type
          });
        }
      }

      return enrichedEntries;
    },
    enabled: hasWagesAccess && !privilegesLoading
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, hourly_rate')
        .order('name');

      if (error) {
        console.error("Error fetching employees:", error);
        throw error;
      }

      return data as Employee[];
    },
    enabled: hasWagesAccess
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) {
        console.error("Error fetching services:", error);
        throw error;
      }

      return data as Service[];
    },
    enabled: hasWagesAccess
  });

  // Update wage status mutation
  const updateWageStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ wage_status: status })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Wage status updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update wage status: ' + error.message);
    }
  });

  // Update task amount mutation for fixed projects
  const updateTaskAmountMutation = useMutation({
    mutationFn: async ({ taskId, amount }: { taskId: string; amount: number }) => {
      const { error } = await supabase
        .from('task_wage_amounts')
        .upsert({
          task_id: taskId,
          user_id: userId,
          amount: amount
        }, {
          onConflict: 'task_id,user_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-wage-amounts'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Task amount updated successfully!');
      setEditingTaskAmount(null);
      setEditAmount('');
    },
    onError: (error) => {
      toast.error('Failed to update task amount: ' + error.message);
    }
  });

  // Calculate wages from time entries using employee hourly rates
  const wageRecords = timeEntries.map(entry => ({
    id: entry.id,
    employee_id: entry.employee_id,
    task_id: entry.task_id,
    hours_worked: entry.duration_minutes ? entry.duration_minutes / 60 : 0,
    hourly_rate: entry.hourly_rate || 0,
    wage_amount: entry.duration_minutes && entry.hourly_rate ? 
      (entry.duration_minutes / 60) * entry.hourly_rate : 0,
    date: entry.start_time,
    wage_status: entry.wage_status || 'wnotpaid',
    task_name: entry.task_name,
    employee_name: entry.employee_name,
    project_name: entry.project_name,
    project_service_type: entry.project_service,
    project_billing_type: entry.project_type,
    comment: entry.comment,
    project_id: entry.project_id
  }));

  // Filter wage records based on all filters and billing type
  const filteredWageRecords = wageRecords.filter(record => {
    const matchesEmployee = selectedEmployee === 'all' || record.employee_id === selectedEmployee;
    const matchesService = globalServiceFilter === 'all' || record.project_service_type === globalServiceFilter;
    const matchesWageStatus = wageStatusFilter === 'all' || record.wage_status === wageStatusFilter;
    const matchesBillingType = activeTab === 'hourly' ? 
      record.project_billing_type === 'Hourly' : 
      record.project_billing_type === 'Fixed';
    
    return matchesEmployee && matchesService && matchesWageStatus && matchesBillingType;
  });

  // Group wage records by task
  const groupedWageRecords = filteredWageRecords.reduce((groups, record) => {
    const taskId = record.task_id;
    if (!groups[taskId]) {
      const customWageAmount = taskWageAmounts.find(twa => twa.task_id === taskId)?.amount || 0;
      
      groups[taskId] = {
        task_name: record.task_name,
        employee_name: record.employee_name,
        project_name: record.project_name,
        project_service_type: record.project_service_type,
        project_billing_type: record.project_billing_type,
        wage_status: record.wage_status,
        hourly_rate: record.hourly_rate,
        entries: [],
        totalHours: 0,
        totalAmount: 0,
        customAmount: customWageAmount
      };
    }
    groups[taskId].entries.push(record);
    groups[taskId].totalHours += record.hours_worked;
    if (activeTab === 'hourly') {
      groups[taskId].totalAmount += record.wage_amount;
    }
    return groups;
  }, {} as Record<string, any>);

  // Calculate totals based on active tab
  const totalHours = filteredWageRecords.reduce((sum, record) => sum + record.hours_worked, 0);
  const totalWages = activeTab === 'hourly' ? 
    filteredWageRecords.reduce((sum, record) => sum + record.wage_amount, 0) :
    Object.values(groupedWageRecords).reduce((sum: number, group: any) => sum + (group.customAmount || 0), 0);
  const paidWages = filteredWageRecords
    .filter(record => record.wage_status === 'wpaid')
    .reduce((sum, record) => activeTab === 'hourly' ? sum + record.wage_amount : sum + 0, 0); // For fixed, calculate based on custom amounts
  const unpaidWages = totalWages - paidWages;

  const handleWageStatusChange = (taskId: string, status: string) => {
    if (!canUpdate) {
      toast.error('You do not have permission to update wage status');
      return;
    }

    console.log('Updating wage status:', { taskId, status, userRole, canUpdate });
    updateWageStatusMutation.mutate({ taskId, status });
  };

  const handleTaskAmountEdit = (taskId: string, currentAmount: number) => {
    setEditingTaskAmount(taskId);
    setEditAmount(currentAmount.toString());
  };

  const handleTaskAmountSave = (taskId: string) => {
    const amount = parseFloat(editAmount) || 0;
    updateTaskAmountMutation.mutate({ taskId, amount });
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title and filter information
    doc.setFontSize(20);
    doc.text(`Employee Wage Report - ${activeTab === 'hourly' ? 'Hourly' : 'Fixed'} Projects`, 20, 20);
    
    doc.setFontSize(12);
    let yPosition = 35;
    
    // Add filter information
    doc.text(`Month: ${format(selectedMonth, "MMMM yyyy")}`, 20, yPosition);
    yPosition += 10;
    
    if (selectedEmployee !== 'all') {
      const employeeName = employees.find(emp => emp.id === selectedEmployee)?.name || 'Unknown';
      doc.text(`Employee: ${employeeName}`, 20, yPosition);
      yPosition += 10;
    }
    
    if (globalServiceFilter !== 'all') {
      doc.text(`Service: ${globalServiceFilter}`, 20, yPosition);
      yPosition += 10;
    }
    
    if (wageStatusFilter !== 'all') {
      doc.text(`Wage Status: ${wageStatusFilter === 'wpaid' ? 'Paid' : 'Not Paid'}`, 20, yPosition);
      yPosition += 10;
    }
    
    // Add summary information
    yPosition += 5;
    doc.text(`Total Hours: ${totalHours.toFixed(2)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Wages: ₹${totalWages.toFixed(2)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Paid Wages: ₹${paidWages.toFixed(2)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Unpaid Wages: ₹${unpaidWages.toFixed(2)}`, 20, yPosition);
    
    yPosition += 15;
    
    // Prepare table data
    const tableData: any[] = [];
    
    Object.entries(groupedWageRecords).forEach(([taskId, group]) => {
      // Add main task row
      const amount = activeTab === 'hourly' ? group.totalAmount : (group.customAmount || 0);
      tableData.push([
        group.task_name || '',
        group.employee_name || '',
        group.project_name || '',
        group.project_service_type || '',
        group.totalHours.toFixed(2),
        activeTab === 'hourly' ? `₹${group.hourly_rate}` : 'Custom',
        `₹${amount.toFixed(2)}`,
        group.wage_status === 'wpaid' ? 'Paid' : 'Not Paid'
      ]);
      
      // Add individual time entries (indented)
      group.entries.forEach((entry: any) => {
        tableData.push([
          `  → ${format(new Date(entry.date), "PPP")}`,
          '',
          '',
          '',
          entry.hours_worked.toFixed(2),
          '',
          activeTab === 'hourly' ? `₹${entry.wage_amount.toFixed(2)}` : '',
          ''
        ]);
      });
    });
    
    // Create the table using autoTable
    (doc as any).autoTable({
      head: [['Task/Date', 'Employee', 'Project', 'Service', 'Hours', 'Rate', 'Amount', 'Status']],
      body: tableData,
      startY: yPosition,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didParseCell: function(data: any) {
        // Style the indented rows differently
        if (data.cell.text[0] && data.cell.text[0].startsWith('  →')) {
          data.cell.styles.fillColor = [240, 248, 255];
          data.cell.styles.textColor = [100, 100, 100];
          data.cell.styles.fontSize = 8;
        }
      }
    });
    
    // Generate filename with filters
    let filename = `wages_report_${activeTab}_${format(selectedMonth, "yyyy_MM")}`;
    if (selectedEmployee !== 'all') {
      const employeeName = employees.find(emp => emp.id === selectedEmployee)?.name || 'employee';
      filename += `_${employeeName.replace(/\s+/g, '_')}`;
    }
    if (globalServiceFilter !== 'all') {
      filename += `_${globalServiceFilter.replace(/\s+/g, '_')}`;
    }
    filename += '.pdf';
    
    // Save the PDF
    doc.save(filename);
    
    toast.success('Wage report exported successfully!');
  };

  if (privilegesLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading...</div>
        </div>
      </Navigation>
    );
  }

  if (!hasWagesAccess) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access the wages page.</p>
          </div>
        </div>
      </Navigation>
    );
  }

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading wages...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Wages</h1>
            <p className="text-gray-600 mt-2">Track employee hours and calculate wages based on project billing type</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} (₹{employee.hourly_rate}/hr)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Month</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedMonth && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedMonth ? format(selectedMonth, "MMMM yyyy") : "Select month"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedMonth}
                      onSelect={(date) => date && setSelectedMonth(date)}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Second row of filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.name}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Wage Status</Label>
                <Select value={wageStatusFilter} onValueChange={setWageStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by wage status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="wpaid">Paid</SelectItem>
                    <SelectItem value="wnotpaid">Not Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <CardTitle>Total Hours</CardTitle>
              <CardDescription>Total hours worked this month ({activeTab} projects)</CardDescription>
              <div className="text-2xl font-bold">{totalHours.toFixed(2)} hours</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <CardTitle>Total Wages</CardTitle>
              <CardDescription>Total wages for this month ({activeTab} projects)</CardDescription>
              <div className="text-2xl font-bold">₹{totalWages.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <CardTitle>Paid Wages</CardTitle>
              <CardDescription>Wages already paid</CardDescription>
              <div className="text-2xl font-bold text-green-600">₹{paidWages.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <CardTitle>Unpaid Wages</CardTitle>
              <CardDescription>Wages pending payment</CardDescription>
              <div className="text-2xl font-bold text-red-600">₹{unpaidWages.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Hourly vs Fixed Projects */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hourly">Hourly Projects</TabsTrigger>
            <TabsTrigger value="fixed">Fixed Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="hourly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hourly Project Wage Records</CardTitle>
                <CardDescription>
                  Employee wage records for {format(selectedMonth, "MMMM yyyy")} (hourly projects - calculated using employee hourly rates)
                  {globalServiceFilter !== 'all' && ` filtered by ${globalServiceFilter} service`}
                  {wageStatusFilter !== 'all' && ` - ${wageStatusFilter === 'wpaid' ? 'Paid' : 'Not Paid'} wages`}
                  {Object.keys(groupedWageRecords).length === 0 && ' - No wage records found for the selected filters'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(groupedWageRecords).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      No wage records found for hourly projects with the selected filters.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Employee Rate</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedWageRecords).map(([taskId, group]) => (
                        <React.Fragment key={taskId}>
                          {/* Main task row */}
                          <TableRow className="border-b-2">
                            <TableCell>
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 h-auto font-normal justify-start"
                                    onClick={() => toggleTaskExpansion(taskId)}
                                  >
                                    {expandedTasks.has(taskId) ? (
                                      <ChevronDown className="h-4 w-4 mr-2" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 mr-2" />
                                    )}
                                    {group.task_name}
                                  </Button>
                                </CollapsibleTrigger>
                              </Collapsible>
                            </TableCell>
                            <TableCell>{group.employee_name}</TableCell>
                            <TableCell>{group.project_name || 'N/A'}</TableCell>
                            <TableCell>{group.project_service_type || 'N/A'}</TableCell>
                            <TableCell className="font-semibold">{group.totalHours.toFixed(2)}</TableCell>
                            <TableCell>₹{group.hourly_rate}</TableCell>
                            <TableCell className="font-semibold">₹{group.totalAmount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={group.wage_status === 'wpaid' ? 'default' : 'destructive'}>
                                {group.wage_status === 'wpaid' ? 'Paid' : 'Not Paid'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {canUpdate ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      Actions
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem
                                      onClick={() => handleWageStatusChange(taskId, 'wpaid')}
                                      disabled={group.wage_status === 'wpaid'}
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleWageStatusChange(taskId, 'wnotpaid')}
                                      disabled={group.wage_status === 'wnotpaid'}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Mark as Not Paid
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-sm text-gray-500">No permission</span>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Collapsible time entries */}
                          {expandedTasks.has(taskId) && (
                            <TableRow>
                              <TableCell colSpan={9} className="p-0">
                                <div className="bg-gray-50 border-l-4 border-blue-200">
                                  <Table>
                                    <TableBody>
                                      {group.entries.map((entry: any) => (
                                        <TableRow key={entry.id} className="bg-gray-50">
                                          <TableCell className="pl-8 text-sm text-gray-600">
                                            <div className="flex flex-col">
                                              <span className="font-medium">{format(new Date(entry.date), "PPP")}</span>
                                              {entry.comment && (
                                                <span className="text-xs text-gray-500 mt-1 italic">
                                                  "{entry.comment}"
                                                </span>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                          <TableCell className="text-sm">{entry.hours_worked.toFixed(2)}</TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                          <TableCell className="text-sm">₹{entry.wage_amount.toFixed(2)}</TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fixed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fixed Project Wage Records</CardTitle>
                <CardDescription>
                  Employee wage records for {format(selectedMonth, "MMMM yyyy")} (fixed projects - manual amount allocation required)
                  {globalServiceFilter !== 'all' && ` filtered by ${globalServiceFilter} service`}
                  {wageStatusFilter !== 'all' && ` - ${wageStatusFilter === 'wpaid' ? 'Paid' : 'Not Paid'} wages`}
                  {Object.keys(groupedWageRecords).length === 0 && ' - No wage records found for the selected filters'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(groupedWageRecords).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      No wage records found for fixed projects with the selected filters.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Employee Rate</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedWageRecords).map(([taskId, group]) => (
                        <React.Fragment key={taskId}>
                          {/* Main task row */}
                          <TableRow className="border-b-2">
                            <TableCell>
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 h-auto font-normal justify-start"
                                    onClick={() => toggleTaskExpansion(taskId)}
                                  >
                                    {expandedTasks.has(taskId) ? (
                                      <ChevronDown className="h-4 w-4 mr-2" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 mr-2" />
                                    )}
                                    {group.task_name}
                                  </Button>
                                </CollapsibleTrigger>
                              </Collapsible>
                            </TableCell>
                            <TableCell>{group.employee_name}</TableCell>
                            <TableCell>{group.project_name || 'N/A'}</TableCell>
                            <TableCell>{group.project_service_type || 'N/A'}</TableCell>
                            <TableCell className="font-semibold">{group.totalHours.toFixed(2)}</TableCell>
                            <TableCell>₹{group.hourly_rate}</TableCell>
                            <TableCell className="font-semibold">
                              {editingTaskAmount === taskId ? (
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-24"
                                    placeholder="0.00"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleTaskAmountSave(taskId)}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingTaskAmount(null);
                                      setEditAmount('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <span>₹{(group.customAmount || 0).toFixed(2)}</span>
                                  {canUpdate && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleTaskAmountEdit(taskId, group.customAmount || 0)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={group.wage_status === 'wpaid' ? 'default' : 'destructive'}>
                                {group.wage_status === 'wpaid' ? 'Paid' : 'Not Paid'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {canUpdate ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      Actions
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem
                                      onClick={() => handleWageStatusChange(taskId, 'wpaid')}
                                      disabled={group.wage_status === 'wpaid'}
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleWageStatusChange(taskId, 'wnotpaid')}
                                      disabled={group.wage_status === 'wnotpaid'}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Mark as Not Paid
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-sm text-gray-500">No permission</span>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Collapsible time entries */}
                          {expandedTasks.has(taskId) && (
                            <TableRow>
                              <TableCell colSpan={9} className="p-0">
                                <div className="bg-gray-50 border-l-4 border-blue-200">
                                  <Table>
                                    <TableBody>
                                      {group.entries.map((entry: any) => (
                                        <TableRow key={entry.id} className="bg-gray-50">
                                          <TableCell className="pl-8 text-sm text-gray-600">
                                            <div className="flex flex-col">
                                              <span className="font-medium">{format(new Date(entry.date), "PPP")}</span>
                                              {entry.comment && (
                                                <span className="text-xs text-gray-500 mt-1 italic">
                                                  "{entry.comment}"
                                                </span>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                          <TableCell className="text-sm">{entry.hours_worked.toFixed(2)}</TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                          <TableCell className="text-sm">Custom allocation</TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                          <TableCell className="text-sm">-</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Navigation>
  );
};

export default Wages;
