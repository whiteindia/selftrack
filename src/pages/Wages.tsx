import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Filter, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
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

interface TimeEntry {
  id: string;
  employee_id: string;
  task_id: string;
  duration_minutes: number;
  created_at: string;
  start_time: string;
  tasks: {
    id: string;
    name: string;
    wage_status: string;
    projects: {
      name: string;
      hourly_rate: number;
      service: string;
    };
  };
  employees: {
    name: string;
    hourly_rate: number;
  };
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

const Wages = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');
  const [wageStatusFilter, setWageStatusFilter] = useState<string>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { hasOperationAccess, loading: privilegesLoading } = usePrivileges();
  
  // Check specific permissions for wages page
  const canUpdate = hasOperationAccess('wages', 'update');

  // Fetch time entries with employee hourly rate data
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['time-entries', selectedEmployee, selectedMonth],
    queryFn: async () => {
      const startDate = startOfMonth(selectedMonth).toISOString();
      const endDate = endOfMonth(selectedMonth).toISOString();

      let query = supabase
        .from('time_entries')
        .select(`
          *,
          tasks(
            id,
            name,
            wage_status,
            projects(
              name,
              hourly_rate,
              service
            )
          ),
          employees(
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

      return data as TimeEntry[];
    }
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
    }
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
    }
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
    }
  });

  // Calculate wages from time entries using employee hourly rates
  const wageRecords = timeEntries.map(entry => ({
    id: entry.id,
    employee_id: entry.employee_id,
    task_id: entry.task_id,
    hours_worked: entry.duration_minutes ? entry.duration_minutes / 60 : 0,
    hourly_rate: entry.employees?.hourly_rate || 0,
    wage_amount: entry.duration_minutes && entry.employees?.hourly_rate ? 
      (entry.duration_minutes / 60) * entry.employees.hourly_rate : 0,
    date: entry.start_time,
    wage_status: entry.tasks?.wage_status || 'wnotpaid',
    tasks: entry.tasks,
    employees: entry.employees,
    project_service_type: entry.tasks?.projects?.service
  }));

  // Filter wage records based on all filters
  const filteredWageRecords = wageRecords.filter(record => {
    const matchesEmployee = selectedEmployee === 'all' || record.employee_id === selectedEmployee;
    
    // Service filter - check project service type instead of employee service
    const matchesService = globalServiceFilter === 'all' || 
      record.project_service_type === globalServiceFilter;
    
    // Wage status filter
    const matchesWageStatus = wageStatusFilter === 'all' || record.wage_status === wageStatusFilter;
    
    return matchesEmployee && matchesService && matchesWageStatus;
  });

  // Group wage records by task
  const groupedWageRecords = filteredWageRecords.reduce((groups, record) => {
    const taskId = record.task_id;
    if (!groups[taskId]) {
      groups[taskId] = {
        task: record.tasks,
        employee: record.employees,
        project_service_type: record.project_service_type,
        wage_status: record.wage_status,
        hourly_rate: record.hourly_rate,
        entries: [],
        totalHours: 0,
        totalAmount: 0
      };
    }
    groups[taskId].entries.push(record);
    groups[taskId].totalHours += record.hours_worked;
    groups[taskId].totalAmount += record.wage_amount;
    return groups;
  }, {} as Record<string, any>);

  // Calculate totals
  const totalHours = filteredWageRecords.reduce((sum, record) => sum + record.hours_worked, 0);
  const totalWages = filteredWageRecords.reduce((sum, record) => sum + record.wage_amount, 0);
  const paidWages = filteredWageRecords
    .filter(record => record.wage_status === 'wpaid')
    .reduce((sum, record) => sum + record.wage_amount, 0);
  const unpaidWages = filteredWageRecords
    .filter(record => record.wage_status === 'wnotpaid')
    .reduce((sum, record) => sum + record.wage_amount, 0);

  const handleWageStatusChange = (taskId: string, status: string) => {
    if (!canUpdate) {
      toast.error('You do not have permission to update wage status');
      return;
    }

    updateWageStatusMutation.mutate({ taskId, status });
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

  const exportToCSV = () => {
    // Create CSV headers
    const headers = [
      'Task Name',
      'Employee Name',
      'Project Name',
      'Service Type',
      'Date',
      'Hours Worked',
      'Employee Rate (₹)',
      'Amount (₹)',
      'Status'
    ];

    // Create CSV rows from filtered data
    const csvRows = [];
    
    // Add filter information as header comments
    const filterInfo = [];
    filterInfo.push(`# Employee Wage Report - ${format(selectedMonth, "MMMM yyyy")}`);
    if (selectedEmployee !== 'all') {
      const employeeName = employees.find(emp => emp.id === selectedEmployee)?.name || 'Unknown';
      filterInfo.push(`# Employee: ${employeeName}`);
    }
    if (globalServiceFilter !== 'all') {
      filterInfo.push(`# Service Type: ${globalServiceFilter}`);
    }
    if (wageStatusFilter !== 'all') {
      filterInfo.push(`# Wage Status: ${wageStatusFilter === 'wpaid' ? 'Paid' : 'Not Paid'}`);
    }
    filterInfo.push(`# Total Hours: ${totalHours.toFixed(2)}`);
    filterInfo.push(`# Total Wages: ₹${totalWages.toFixed(2)}`);
    filterInfo.push(`# Paid Wages: ₹${paidWages.toFixed(2)}`);
    filterInfo.push(`# Unpaid Wages: ₹${unpaidWages.toFixed(2)}`);
    filterInfo.push(''); // Empty line
    
    // Add filter info to CSV
    csvRows.push(...filterInfo);
    
    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows - expand all grouped records
    Object.entries(groupedWageRecords).forEach(([taskId, group]) => {
      group.entries.forEach((entry: any) => {
        const row = [
          `"${group.task?.name || ''}"`,
          `"${group.employee?.name || ''}"`,
          `"${group.task?.projects?.name || ''}"`,
          `"${group.project_service_type || ''}"`,
          `"${format(new Date(entry.date), "yyyy-MM-dd")}"`,
          entry.hours_worked.toFixed(2),
          group.hourly_rate,
          entry.wage_amount.toFixed(2),
          group.wage_status === 'wpaid' ? 'Paid' : 'Not Paid'
        ];
        csvRows.push(row.join(','));
      });
    });

    // Create and download CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with filters
      let filename = `wages_report_${format(selectedMonth, "yyyy_MM")}`;
      if (selectedEmployee !== 'all') {
        const employeeName = employees.find(emp => emp.id === selectedEmployee)?.name || 'employee';
        filename += `_${employeeName.replace(/\s+/g, '_')}`;
      }
      if (globalServiceFilter !== 'all') {
        filename += `_${globalServiceFilter.replace(/\s+/g, '_')}`;
      }
      filename += '.csv';
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Wage report exported successfully!');
    }
  };

  if (isLoading || privilegesLoading) {
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
            <p className="text-gray-600 mt-2">Track employee hours and calculate wages using employee hourly rates</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
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
                <Label>Project Service Type</Label>
                <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by project service type" />
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
              <CardDescription>Total hours worked this month</CardDescription>
              <div className="text-2xl font-bold">{totalHours.toFixed(2)} hours</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <CardTitle>Total Wages</CardTitle>
              <CardDescription>Total wages for this month</CardDescription>
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

        {/* Detailed Wage Records */}
        <Card>
          <CardHeader>
            <CardTitle>Wage Records</CardTitle>
            <CardDescription>
              Employee wage records for {format(selectedMonth, "MMMM yyyy")} (calculated using individual employee hourly rates)
              {globalServiceFilter !== 'all' && ` filtered by ${globalServiceFilter} service type`}
              {wageStatusFilter !== 'all' && ` - ${wageStatusFilter === 'wpaid' ? 'Paid' : 'Not Paid'} wages`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Service Type</TableHead>
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
                              {group.task?.name}
                            </Button>
                          </CollapsibleTrigger>
                        </Collapsible>
                      </TableCell>
                      <TableCell>{group.employee?.name}</TableCell>
                      <TableCell>{group.task?.projects?.name}</TableCell>
                      <TableCell>{group.project_service_type}</TableCell>
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
                                      Time Entry
                                    </TableCell>
                                    <TableCell className="text-sm">-</TableCell>
                                    <TableCell className="text-sm">-</TableCell>
                                    <TableCell className="text-sm">-</TableCell>
                                    <TableCell className="text-sm">{format(new Date(entry.date), "PPP")}</TableCell>
                                    <TableCell className="text-sm">{entry.hours_worked.toFixed(2)}</TableCell>
                                    <TableCell className="text-sm">-</TableCell>
                                    <TableCell className="text-sm">₹{entry.wage_amount.toFixed(2)}</TableCell>
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
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default Wages;
