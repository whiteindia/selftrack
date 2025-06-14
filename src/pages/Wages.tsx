
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
  tasks: {
    id: string;
    name: string;
    wage_status: string;
    project_id: string;
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

interface ProjectInfo {
  id: string;
  name: string;
  service: string;
  client_name: string;
}

const Wages = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');
  const [wageStatusFilter, setWageStatusFilter] = useState<string>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [projectsData, setProjectsData] = useState<Record<string, ProjectInfo>>({});
  const queryClient = useQueryClient();

  const { hasPageAccess, hasOperationAccess, loading: privilegesLoading, userRole, userId } = usePrivileges();
  
  // Check if user has access to wages page
  const hasWagesAccess = hasPageAccess('wages') || userRole === 'admin';
  
  // Check specific permissions for wages page operations
  const canUpdate = hasOperationAccess('wages', 'update') || userRole === 'admin';
  const canDelete = hasOperationAccess('wages', 'delete') || userRole === 'admin';

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
          *,
          tasks(
            id,
            name,
            wage_status,
            project_id
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

      console.log(`Fetched ${data?.length || 0} time entries after RLS filtering`);
      
      // Fetch project information for all unique project IDs
      if (data && data.length > 0) {
        const uniqueProjectIds = [...new Set(data.map(entry => entry.tasks?.project_id).filter(Boolean))];
        
        const projectInfoPromises = uniqueProjectIds.map(async (projectId) => {
          try {
            const { data: projectInfo, error: projectError } = await supabase
              .rpc('get_project_info_for_task', { project_uuid: projectId });
            
            if (projectError) {
              console.error(`Error fetching project info for ${projectId}:`, projectError);
              return null;
            }
            
            return projectInfo && projectInfo[0] ? { 
              id: projectId, 
              info: projectInfo[0] 
            } : null;
          } catch (err) {
            console.error(`Exception fetching project info for ${projectId}:`, err);
            return null;
          }
        });

        const projectInfoResults = await Promise.all(projectInfoPromises);
        const projectsMap: Record<string, ProjectInfo> = {};
        
        projectInfoResults.forEach(result => {
          if (result && result.info) {
            projectsMap[result.id] = result.info;
          }
        });
        
        setProjectsData(projectsMap);
      }

      return data as TimeEntry[];
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

  // Calculate wages from time entries using employee hourly rates
  const wageRecords = timeEntries.map(entry => {
    const projectInfo = projectsData[entry.tasks?.project_id || ''];
    
    return {
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
      project_info: projectInfo,
      project_service_type: projectInfo?.service,
      comment: entry.comment
    };
  });

  // Filter wage records based on all filters
  const filteredWageRecords = wageRecords.filter(record => {
    const matchesEmployee = selectedEmployee === 'all' || record.employee_id === selectedEmployee;
    
    // Service filter - check project service type
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
        project_info: record.project_info,
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
    // Allow admin, or users with specific update permission
    if (!canUpdate && userRole !== 'admin') {
      toast.error('You do not have permission to update wage status');
      return;
    }

    console.log('Updating wage status:', { taskId, status, userRole, canUpdate });
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title and filter information
    doc.setFontSize(20);
    doc.text('Employee Wage Report', 20, 20);
    
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
      tableData.push([
        group.task?.name || '',
        group.employee?.name || '',
        group.project_info?.name || '',
        group.project_service_type || '',
        group.totalHours.toFixed(2),
        `₹${group.hourly_rate}`,
        `₹${group.totalAmount.toFixed(2)}`,
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
          `₹${entry.wage_amount.toFixed(2)}`,
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
    let filename = `wages_report_${format(selectedMonth, "yyyy_MM")}`;
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
            <p className="text-gray-600 mt-2">Track employee hours and calculate wages using employee hourly rates</p>
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
              {globalServiceFilter !== 'all' && ` filtered by ${globalServiceFilter} service`}
              {wageStatusFilter !== 'all' && ` - ${wageStatusFilter === 'wpaid' ? 'Paid' : 'Not Paid'} wages`}
              {Object.keys(groupedWageRecords).length === 0 && ' - No wage records found for the selected filters'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedWageRecords).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  No wage records found for the selected filters. This could be because:
                </p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                  <li>• No time entries exist for the selected month</li>
                  <li>• RLS policies are filtering data based on your permissions</li>
                  <li>• No tasks match the selected filters</li>
                </ul>
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
                                {group.task?.name}
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        </TableCell>
                        <TableCell>{group.employee?.name}</TableCell>
                        <TableCell>{group.project_info?.name || 'N/A'}</TableCell>
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
                          {canUpdate || userRole === 'admin' ? (
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
      </div>
    </Navigation>
  );
};

export default Wages;
