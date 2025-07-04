import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectOperations } from '@/hooks/useProjectOperations';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  services: string[] | string;
}

interface Service {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ProjectData {
  id: string;
  name: string;
  client_id: string;
  service: string;
  type: string;
  hourly_rate: number;
  project_amount: number | null;
  start_date: string | null;
  deadline: string | null;
  status: string;
  assignee_employee_id: string | null;
  brd_file_url?: string | null;
}

interface ProjectFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectData | null;
  onSuccess: () => void;
}

const ProjectFormDialog = ({ isOpen, onClose, project, onSuccess }: ProjectFormDialogProps) => {
  const { createProjectMutation, updateProjectMutation } = useProjectOperations();
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    service: '',
    type: 'Hourly',
    hourly_rate: 0,
    project_amount: 0,
    start_date: '',
    deadline: '',
    assignee_employee_id: '',
    status: 'Active'
  });
  const [brdFile, setBrdFile] = useState<File | null>(null);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  // Available status options
  const statusOptions = [
    'Active',
    'On Hold', 
    'Completed',
    'Imp',
    'On-Head',
    'Targeted',
    'OverDue'
  ];

  // Fetch all clients
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log('Fetching all clients...');
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, services')
        .order('name');
      
      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
      
      console.log('All clients data:', data);
      return data as Client[];
    }
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      console.log('Fetching services...');
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching services:', error);
        throw error;
      }
      
      console.log('Services data:', data);
      return data as Service[];
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, role')
        .order('name');
      
      if (error) throw error;
      return data as Employee[];
    }
  });

  // Filter clients based on selected service - Updated to handle UUID-based services
  useEffect(() => {
    const filterClientsByService = async () => {
      if (!formData.service || !allClients.length || !services.length) {
        console.log('Missing data for filtering:', { 
          service: formData.service, 
          clientsCount: allClients.length, 
          servicesCount: services.length 
        });
        setFilteredClients([]);
        return;
      }

      try {
        // First, find the service UUID by name
        const selectedServiceData = services.find(service => service.name === formData.service);
        
        if (!selectedServiceData) {
          console.log('Service not found:', formData.service);
          setFilteredClients([]);
          return;
        }

        console.log('Found service:', selectedServiceData);

        // Filter clients that have this service UUID in their services array
        const matchingClients = allClients.filter(client => {
          console.log('Checking client:', client.name, 'services:', client.services);
          
          if (!client.services) {
            console.log('Client has no services');
            return false;
          }

          // Handle both array format and string format for services
          let servicesList: string[] = [];
          if (Array.isArray(client.services)) {
            servicesList = client.services;
          } else if (typeof client.services === 'string') {
            // Handle comma-separated string or single UUID
            servicesList = client.services.includes(',') ? 
              client.services.split(',').map(s => s.trim()) : 
              [client.services.trim()];
          }
          
          console.log('Processed services list:', servicesList);
          
          // Check if the selected service UUID is in the client's services
          const hasService = servicesList.includes(selectedServiceData.id);
          
          console.log('Client has service:', hasService);
          return hasService;
        });

        console.log('Filtered clients:', matchingClients);
        setFilteredClients(matchingClients);

      } catch (error) {
        console.error('Error filtering clients:', error);
        setFilteredClients([]);
      }
    };

    filterClientsByService();
  }, [formData.service, allClients, services]);

  // Update form data when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        client_id: project.client_id,
        service: project.service,
        type: project.type,
        hourly_rate: project.hourly_rate,
        project_amount: project.project_amount || 0,
        start_date: project.start_date?.split('T')[0] || '',
        deadline: project.deadline?.split('T')[0] || '',
        assignee_employee_id: project.assignee_employee_id || '',
        status: project.status
      });
    } else {
      setFormData({
        name: '',
        client_id: '',
        service: '',
        type: 'Hourly',
        hourly_rate: 0,
        project_amount: 0,
        start_date: '',
        deadline: '',
        assignee_employee_id: '',
        status: 'Active'
      });
    }
  }, [project]);

  // Reset client selection when service changes
  const handleServiceChange = (value: string) => {
    console.log('Service changed to:', value);
    setFormData({
      ...formData,
      service: value,
      client_id: '' // Reset client selection when service changes
    });
  };

  const handleSubmit = () => {
    // Prepare form data with proper date handling
    const processedFormData = {
      ...formData,
      start_date: formData.start_date || null,
      deadline: formData.deadline || null
    };

    if (project) {
      // Update existing project
      updateProjectMutation.mutate({
        id: project.id,
        updates: processedFormData,
        brdFile
      }, {
        onSuccess: () => {
          toast.success('Project updated successfully');
          onSuccess();
        },
        onError: (error) => {
          toast.error('Failed to update project');
          console.error('Error updating project:', error);
        }
      });
    } else {
      // Create new project
      createProjectMutation.mutate({
        projectData: processedFormData,
        brdFile
      }, {
        onSuccess: () => {
          toast.success('Project created successfully');
          onSuccess();
        },
        onError: (error) => {
          toast.error('Failed to create project');
          console.error('Error creating project:', error);
        }
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {project ? 'Update project details' : 'Create a new project for your client'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., New Website Design"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            <Select value={formData.service} onValueChange={handleServiceChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select service first" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.name}>{service.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Select 
              value={formData.client_id} 
              onValueChange={(value) => setFormData({...formData, client_id: value})}
              disabled={!formData.service}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={!formData.service ? "Select service first" : "Select a client"} />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.service && filteredClients.length === 0 && (
              <p className="text-sm text-gray-500">No clients found for the selected service</p>
            )}
            {formData.service && (
              <div className="text-xs text-gray-400">
                Debug: Found {filteredClients.length} clients for service "{formData.service}"
                {filteredClients.length > 0 && (
                  <div>Clients: {filteredClients.map(c => c.name).join(', ')}</div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Select 
              value={formData.assignee_employee_id || "unassigned"}
              onValueChange={(value) => setFormData({...formData, assignee_employee_id: value === "unassigned" ? "" : value})}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an assignee (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} ({employee.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Billing Type</Label>
            <Select 
              value={formData.type}
              onValueChange={(value) => setFormData({...formData, type: value})}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select billing type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hourly">Hourly</SelectItem>
                <SelectItem value="Fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {formData.type === 'Hourly' && (
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value) || 0})}
                placeholder="e.g., 50.00"
              />
            </div>
          )}
          
          {formData.type === 'Fixed' && (
            <div className="space-y-2">
              <Label htmlFor="projectAmount">Project Amount</Label>
              <Input
                id="projectAmount"
                type="number"
                value={formData.project_amount}
                onChange={(e) => setFormData({...formData, project_amount: parseFloat(e.target.value) || 0})}
                placeholder="e.g., 5000.00"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date (Optional)</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline (Optional)</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
            />
          </div>
          
          {project && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="brdFile">BRD File (Optional)</Label>
            <Input
              id="brdFile"
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setBrdFile(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createProjectMutation.isPending || updateProjectMutation.isPending}>
            {project ? 'Update Project' : 'Create Project'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectFormDialog;
