import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import EmployeeServicesSelect from '@/components/EmployeeServicesSelect';
import { useRoles } from '@/hooks/useRoles';
import { useInvitations } from '@/hooks/useInvitations';
import { usePrivileges } from '@/hooks/usePrivileges';

interface Employee {
  id: string;
  name: string;
  email: string;
  contact_number: string | null;
  role: string;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

interface EmployeeService {
  employee_id: string;
  service_id: string;
}

interface Service {
  id: string;
  name: string;
}

const Employees = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    contact_number: '',
    role: 'associate',
    hourly_rate: 0
  });

  // Use privileges hook to check permissions
  const { hasOperationAccess, loading: privilegesLoading } = usePrivileges();
  
  // Check specific permissions for employees page
  const canCreate = hasOperationAccess('employees', 'create');
  const canUpdate = hasOperationAccess('employees', 'update');
  const canDelete = hasOperationAccess('employees', 'delete');

  console.log('Employee permissions - Create:', canCreate, 'Update:', canUpdate, 'Delete:', canDelete);

  // Fetch dynamic roles
  const { roles, loading: rolesLoading } = useRoles();
  const { sendInvitation } = useInvitations();

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Employee[];
    }
  });

  // Get employee services - simplified query
  const { data: employeeServices = [] } = useQuery({
    queryKey: ['employee-services'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('employee_services')
          .select('employee_id, service_id');
        
        if (error) throw error;
        return data as EmployeeService[];
      } catch (error) {
        console.log('Employee services query failed:', error);
        return [];
      }
    }
  });

  // Get all services for mapping
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name');
      
      if (error) throw error;
      return data as Service[];
    }
  });

  // Add mutation to manually create auth user
  const createAuthUserMutation = useMutation({
    mutationFn: async (employee: Employee) => {
      console.log('Manually creating auth user for:', employee.email, 'with role:', employee.role);
      
      try {
        const { data: response, error } = await supabase.functions.invoke(
          'create-invited-user',
          {
            body: {
              email: employee.email,
              password: employee.email, // Use email as default password
              userData: {
                name: employee.name,
                role: employee.role // Use the employee's actual role from the database
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

        console.log('Auth user created successfully with role:', employee.role, response);
        return response;
        
      } catch (error) {
        console.error('Error creating auth user:', error);
        throw error;
      }
    },
    onSuccess: (data, employee) => {
      toast.success(`Auth user created successfully with role ${employee.role}! They can now login.`);
    },
    onError: (error) => {
      console.error('Failed to create auth user:', error);
      toast.error(`Failed to create auth user: ${error.message}`);
    }
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (employeeData: typeof newEmployee) => {
      console.log('Creating employee with data:', employeeData);
      
      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('Employee created successfully:', data);
      
      // Add employee services if any selected
      if (selectedServices.length > 0) {
        try {
          const serviceInserts = selectedServices.map(serviceId => ({
            employee_id: data.id,
            service_id: serviceId
          }));
          
          const { error: servicesError } = await supabase
            .from('employee_services')
            .insert(serviceInserts);
          
          if (servicesError) throw servicesError;
        } catch (servicesError) {
          console.log('Failed to add employee services:', servicesError);
        }
      }

      // Send invitation email if enabled and not editing
      if (sendInviteEmail && !editingEmployee) {
        console.log('Sending invitation email for employee:', employeeData.email, 'with role:', employeeData.role);
        
        try {
          await sendInvitation.mutateAsync({
            email: employeeData.email,
            role: employeeData.role,
            employee_data: {
              name: employeeData.name,
              contact_number: employeeData.contact_number || ''
            }
          });
          console.log('Employee invitation sent successfully with role:', employeeData.role);
        } catch (inviteError) {
          console.error('Failed to send employee invitation:', inviteError);
          toast.error(`Employee created but invitation email failed: ${(inviteError as Error).message}`);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-services'] });
      setNewEmployee({ name: '', email: '', contact_number: '', role: 'associate', hourly_rate: 0 });
      setSelectedServices([]);
      setSendInviteEmail(true);
      setIsDialogOpen(false);
      toast.success(editingEmployee ? 'Employee updated successfully!' : 'Employee created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create employee: ' + error.message);
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update employee services
      try {
        // First delete existing services
        await supabase
          .from('employee_services')
          .delete()
          .eq('employee_id', id);
        
        // Then add new services
        if (selectedServices.length > 0) {
          const serviceInserts = selectedServices.map(serviceId => ({
            employee_id: id,
            service_id: serviceId
          }));
          
          const { error: servicesError } = await supabase
            .from('employee_services')
            .insert(serviceInserts);
          
          if (servicesError) throw servicesError;
        }
      } catch (servicesError) {
        console.log('Failed to update employee services:', servicesError);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-services'] });
      setEditingEmployee(null);
      setSelectedServices([]);
      setSendInviteEmail(true);
      setIsDialogOpen(false);
      toast.success('Employee updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update employee: ' + error.message);
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      // First get the employee data to find the email
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('email')
        .eq('id', employeeId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching employee for deletion:', fetchError);
        throw new Error('Failed to fetch employee details for deletion');
      }

      console.log('Deleting employee:', employee?.email);

      // Try to clean up activity feed records first if we have the email
      if (employee?.email) {
        try {
          console.log('Cleaning up activity feed records for user:', employee.email);
          
          const { error: activityCleanupError } = await supabase.functions.invoke(
            'delete-auth-user',
            {
              body: {
                email: employee.email,
                cleanup_only: true // Flag to only clean up activity feed
              }
            }
          );

          if (activityCleanupError) {
            console.error('Failed to cleanup activity feed:', activityCleanupError);
          } else {
            console.log('Activity feed cleanup completed for:', employee.email);
          }
        } catch (cleanupError) {
          console.error('Error during activity feed cleanup:', cleanupError);
        }
      }

      // Delete the employee record from database
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);
      
      if (error) {
        console.error('Error deleting employee record:', error);
        throw error;
      }

      console.log('Employee record deleted successfully');

      // Try to delete the auth user if we have the email
      if (employee?.email) {
        try {
          console.log('Attempting to delete auth user for:', employee.email);
          
          const { data: response, error: authError } = await supabase.functions.invoke(
            'delete-auth-user',
            {
              body: {
                email: employee.email
              }
            }
          );

          console.log('Auth deletion response:', response);

          if (authError) {
            console.error('Failed to delete auth user - function error:', authError);
            // Don't throw here - employee deletion was successful
          } else if (response?.success) {
            console.log('Auth user deleted successfully for:', employee.email);
          } else {
            console.error('Auth user deletion failed - response error:', response?.error || 'Unknown error');
            // Don't throw here - employee deletion was successful
          }
        } catch (authError) {
          console.error('Error calling delete auth user function:', authError);
          // Don't throw here - employee deletion was successful
        }
      } else {
        console.warn('No email found for employee, cannot delete auth user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-services'] });
      toast.success('Employee and associated auth user deleted successfully!');
    },
    onError: (error) => {
      console.error('Employee deletion error:', error);
      toast.error('Failed to delete employee: ' + error.message);
    }
  });

  const handleSubmit = () => {
    if (editingEmployee && !canUpdate) {
      toast.error('You do not have permission to update employees');
      return;
    }
    
    if (!editingEmployee && !canCreate) {
      toast.error('You do not have permission to create employees');
      return;
    }

    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, ...newEmployee });
    } else {
      if (!newEmployee.name || !newEmployee.email) {
        toast.error('Please fill in all required fields');
        return;
      }
      addEmployeeMutation.mutate(newEmployee);
    }
  };

  const handleEdit = async (employee: Employee) => {
    if (!canUpdate) {
      toast.error('You do not have permission to edit employees');
      return;
    }

    setEditingEmployee(employee);
    setNewEmployee({
      name: employee.name,
      email: employee.email,
      contact_number: employee.contact_number || '',
      role: employee.role,
      hourly_rate: employee.hourly_rate
    });
    
    // Load employee services
    const empServices = employeeServices
      .filter(es => es.employee_id === employee.id)
      .map(es => es.service_id);
    setSelectedServices(empServices);
    
    setSendInviteEmail(false);
    setIsDialogOpen(true);
  };

  const handleDelete = (employeeId: string) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete employees');
      return;
    }

    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteEmployeeMutation.mutate(employeeId);
    }
  };

  const handleCreateAuthUser = (employee: Employee) => {
    if (!canUpdate) {
      toast.error('You do not have permission to create auth users');
      return;
    }

    if (window.confirm(`Create auth user for ${employee.email} with role ${employee.role}? They will be able to login with email as password.`)) {
      createAuthUserMutation.mutate(employee);
    }
  };

  const resetForm = () => {
    setNewEmployee({ name: '', email: '', contact_number: '', role: roles[0] || 'associate', hourly_rate: 0 });
    setSelectedServices([]);
    setEditingEmployee(null);
    setSendInviteEmail(true);
  };

  const getEmployeeServices = (employeeId: string) => {
    const empServiceIds = employeeServices
      .filter(es => es.employee_id === employeeId)
      .map(es => es.service_id);
    
    const serviceNames = empServiceIds
      .map(serviceId => services.find(s => s.id === serviceId)?.name)
      .filter(Boolean);
    
    return serviceNames.join(', ') || 'None';
  };

  if (isLoading || rolesLoading || privilegesLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading employees...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-600 mt-2">Manage your team members, their roles, and services</p>
          </div>
          
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                  <DialogDescription>
                    {editingEmployee ? 'Update employee information and services.' : 'Add a new team member. An invitation email will be sent automatically.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                      placeholder="Enter employee name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact Number</Label>
                    <Input
                      id="contact"
                      value={newEmployee.contact_number}
                      onChange={(e) => setNewEmployee({...newEmployee, contact_number: e.target.value})}
                      placeholder="Enter contact number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate (₹) *</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newEmployee.hourly_rate}
                      onChange={(e) => setNewEmployee({...newEmployee, hourly_rate: parseFloat(e.target.value) || 0})}
                      placeholder="Enter hourly rate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={newEmployee.role} onValueChange={(value) => setNewEmployee({...newEmployee, role: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role} className="capitalize">
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <EmployeeServicesSelect 
                    selectedServices={selectedServices}
                    onServicesChange={setSelectedServices}
                  />
                  {!editingEmployee && (
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
                    disabled={addEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                  >
                    {addEmployeeMutation.isPending || updateEmployeeMutation.isPending 
                      ? (editingEmployee ? 'Updating...' : 'Creating...') 
                      : (editingEmployee ? 'Update Employee' : 'Create Employee')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {!canCreate && (
            <div className="text-sm text-gray-500">
              You don't have permission to add employees
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.contact_number || 'N/A'}</TableCell>
                    <TableCell>
                      <span className="capitalize">{employee.role}</span>
                    </TableCell>
                    <TableCell>₹{(employee.hourly_rate || 0).toFixed(2)}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {getEmployeeServices(employee.id)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {canUpdate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canUpdate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateAuthUser(employee)}
                            title="Create auth user"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {employees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No employees found. {canCreate ? 'Add your first team member to get started.' : 'You need create permission to add employees.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default Employees;
