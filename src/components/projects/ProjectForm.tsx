
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectOperations } from '@/hooks/useProjectOperations';

interface Client {
  id: string;
  name: string;
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
  type: string; // Changed from hourly_rate to type for billing type
  hourly_rate: number;
  project_amount: number | null;
  start_date: string | null;
  deadline: string | null;
  status: string;
  assignee_employee_id: string | null;
  brd_file_url?: string | null;
}

interface ProjectFormProps {
  newProject: {
    name: string;
    client_id: string;
    service: string;
    billing_type: 'Hourly' | 'Fixed';
    hourly_rate: number;
    project_amount: number;
    start_date: string;
    deadline: string;
    assignee_employee_id: string;
    brd_file: File | null;
  };
  setNewProject: (project: any) => void;
  editingProject: ProjectData | null;
  editBillingType: 'Hourly' | 'Fixed';
  setEditBillingType: (type: 'Hourly' | 'Fixed') => void;
  editBrdFile: File | null;
  setEditBrdFile: (file: File | null) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  uploadingBRD: boolean;
  onCreateProject: () => void;
  onUpdateProject: () => void;
  onViewBRD: (url: string) => void;
  onSetEditingProject: (project: ProjectData) => void;
  employees: Employee[];
}

const ProjectForm = ({ 
  newProject, 
  setNewProject, 
  editingProject, 
  editBillingType, 
  setEditBillingType, 
  editBrdFile, 
  setEditBrdFile,
  isDialogOpen, 
  setIsDialogOpen, 
  isEditDialogOpen, 
  setIsEditDialogOpen, 
  uploadingBRD, 
  onCreateProject, 
  onUpdateProject, 
  onViewBRD,
  onSetEditingProject,
  employees
}: ProjectFormProps) => {
  const { createProjectMutation, updateProjectMutation } = useProjectOperations();

  // Available status options including new ones
  const statusOptions = [
    'Active',
    'On Hold', 
    'Completed',
    'Imp',
    'On-Head',
    'Targeted',
    'OverDue'
  ];

  // Fetch clients and services for dropdowns
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    }
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Service[];
    }
  });

  const handleCreateSubmit = () => {
    onCreateProject();
  };

  const handleEditSubmit = () => {
    onUpdateProject();
  };

  const resetNewProject = () => {
    setNewProject({
      name: '',
      client_id: '',
      service: '',
      billing_type: 'Hourly',
      hourly_rate: 0,
      project_amount: 0,
      start_date: '',
      deadline: '',
      assignee_employee_id: '',
      brd_file: null
    });
  };

  return (
    <>
      {/* Create Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project for your client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={newProject.name}
                onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                placeholder="e.g., New Website Design"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select onValueChange={(value) => setNewProject({...newProject, client_id: value})}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select 
                value={newProject.assignee_employee_id || "unassigned"}
                onValueChange={(value) => setNewProject({...newProject, assignee_employee_id: value === "unassigned" ? "" : value})}
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
              <Label htmlFor="service">Service</Label>
              <Select onValueChange={(value) => setNewProject({...newProject, service: value})}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.name}>{service.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingType">Billing Type</Label>
              <Select 
                value={newProject.billing_type}
                onValueChange={(value: 'Hourly' | 'Fixed') => setNewProject({...newProject, billing_type: value})}
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
            {newProject.billing_type === 'Hourly' && (
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  value={newProject.hourly_rate}
                  onChange={(e) => setNewProject({...newProject, hourly_rate: parseFloat(e.target.value) || 0})}
                  placeholder="e.g., 50.00"
                />
              </div>
            )}
            {newProject.billing_type === 'Fixed' && (
              <div className="space-y-2">
                <Label htmlFor="projectAmount">Project Amount</Label>
                <Input
                  id="projectAmount"
                  type="number"
                  value={newProject.project_amount}
                  onChange={(e) => setNewProject({...newProject, project_amount: parseFloat(e.target.value) || 0})}
                  placeholder="e.g., 5000.00"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={newProject.start_date}
                onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={newProject.deadline}
                onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brdFile">BRD File (Optional)</Label>
              <Input
                id="brdFile"
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setNewProject({...newProject, brd_file: e.target.files[0]});
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              resetNewProject();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createProjectMutation.isPending}>
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details
            </DialogDescription>
          </DialogHeader>
          {editingProject && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editProjectName">Project Name</Label>
                <Input
                  id="editProjectName"
                  value={editingProject.name}
                  onChange={(e) => onSetEditingProject({...editingProject, name: e.target.value})}
                  placeholder="e.g., New Website Design"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editClient">Client</Label>
                <Select 
                  value={editingProject.client_id}
                  onValueChange={(value) => onSetEditingProject({...editingProject, client_id: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAssignee">Assignee</Label>
                <Select 
                  value={editingProject.assignee_employee_id || "unassigned"}
                  onValueChange={(value) => onSetEditingProject({...editingProject, assignee_employee_id: value === "unassigned" ? null : value})}
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
                <Label htmlFor="editService">Service</Label>
                <Select 
                  value={editingProject.service}
                  onValueChange={(value) => onSetEditingProject({...editingProject, service: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.name}>{service.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBillingType">Billing Type</Label>
                <Select 
                  value={editBillingType}
                  onValueChange={(value: 'Hourly' | 'Fixed') => setEditBillingType(value)}
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
              {editBillingType === 'Hourly' && (
                <div className="space-y-2">
                  <Label htmlFor="editHourlyRate">Hourly Rate</Label>
                  <Input
                    id="editHourlyRate"
                    type="number"
                    value={editingProject.hourly_rate}
                    onChange={(e) => onSetEditingProject({...editingProject, hourly_rate: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 50.00"
                  />
                </div>
              )}
              {editBillingType === 'Fixed' && (
                <div className="space-y-2">
                  <Label htmlFor="editProjectAmount">Project Amount</Label>
                  <Input
                    id="editProjectAmount"
                    type="number"
                    value={editingProject.project_amount || 0}
                    onChange={(e) => onSetEditingProject({...editingProject, project_amount: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 5000.00"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="editStartDate">Start Date</Label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={editingProject.start_date?.split('T')[0] || ''}
                  onChange={(e) => onSetEditingProject({...editingProject, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDeadline">Deadline</Label>
                <Input
                  id="editDeadline"
                  type="date"
                  value={editingProject.deadline?.split('T')[0] || ''}
                  onChange={(e) => onSetEditingProject({...editingProject, deadline: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select 
                  value={editingProject.status}
                  onValueChange={(value) => onSetEditingProject({...editingProject, status: value})}
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
              <div className="space-y-2">
                <Label htmlFor="editBrdFile">BRD File</Label>
                <div className="flex items-center space-x-2">
                  {editingProject.brd_file_url && (
                    <Button variant="outline" size="sm" onClick={() => onViewBRD(editingProject.brd_file_url!)}>
                      View Current BRD
                    </Button>
                  )}
                  <Input
                    id="editBrdFile"
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setEditBrdFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditBrdFile(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateProjectMutation.isPending || uploadingBRD}>
              Update Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectForm;
