import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Filter, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
      type: string;
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
  const queryClient = useQueryClient();

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
              type
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
    project_service_type: entry.tasks?.projects?.type
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
    updateWageStatusMutation.mutate({ taskId, status });
  };

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Wages</h1>
            <p className="text-gray-600 mt-2">Track employee hours and calculate wages using employee hourly rates</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline">
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
                  <TableHead>Employee</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Employee Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWageRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.employees?.name}</TableCell>
                    <TableCell>{record.tasks?.name}</TableCell>
                    <TableCell>{record.tasks?.projects?.name}</TableCell>
                    <TableCell>{record.project_service_type}</TableCell>
                    <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                    <TableCell>{record.hours_worked.toFixed(2)}</TableCell>
                    <TableCell>₹{record.hourly_rate}</TableCell>
                    <TableCell>₹{record.wage_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={record.wage_status === 'wpaid' ? 'default' : 'destructive'}>
                        {record.wage_status === 'wpaid' ? 'Paid' : 'Not Paid'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleWageStatusChange(record.task_id, 'wpaid')}
                            disabled={record.wage_status === 'wpaid'}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Mark as Paid
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleWageStatusChange(record.task_id, 'wnotpaid')}
                            disabled={record.wage_status === 'wnotpaid'}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Mark as Not Paid
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
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
