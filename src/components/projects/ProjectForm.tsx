
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

interface Assignee {
  id: string;
  full_name: string;
  email: string;
}

interface ProjectData {
  id: string;
  name: string;
  client_id: string;
  type: string;
  hourly_rate: number;
  project_amount: number | null;
  start_date: string | null;
  deadline: string | null;
  status: string;
  assignee_id: string | null;
  brd_file_url?: string | null;
}

interface ProjectFormProps {
  newProject: {
    name: string;
    client_id: string;
    type: string;
    billing_type: 'hourly' | 'project';
    hourly_rate: number;
    project_amount: number;
    start_date: string;
    deadline: string;
    assignee_id: string;
    brd_file: File | null;
  };
  setNewProject: (project: any) => void;
  editingProject: ProjectData | null;
  editBillingType: 'hourly' | 'project';
  setEditBillingType: (type: 'hourly' | 'project') => void;
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
  assignees: Assignee[];
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
  assignees
}: ProjectFormProps) => {
  const { createProjectMutation, updateProjectMutation } = useProjectOperations();

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
      type: '',
      billing_type: 'hourly',
      hourly_rate: 0,
      project_amount: 0,
      start_date: '',
      deadline: '',
      assignee_id: '',
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
              <Select onValueChange={(value) => setNewProject({...newProject, assignee_id: value})}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an assignee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Service Type</Label>
              <Select onValueChange={(value) => setNewProject({...newProject, type: value})}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select service type" />
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
              <Select onValueChange={(value: 'hourly' | 'project') => setNewProject({...newProject, billing_type: value})}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select billing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="project">Fixed Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newProject.billing_type === 'hourly' && (
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
            {newProject.billing_type === 'project' && (
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
                <Select onValueChange={(value) => onSetEditingProject({...editingProject, client_id: value})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a client" defaultValue={editingProject.client_id} />
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
                <Select onValueChange={(value) => onSetEditingProject({...editingProject, assignee_id: value === "unassigned" ? null : value})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an assignee (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editType">Service Type</Label>
                <Select onValueChange={(value) => onSetEditingProject({...editingProject, type: value})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select service type" defaultValue={editingProject.type} />
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
                <Select onValueChange={(value: 'hourly' | 'project') => setEditBillingType(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select billing type" defaultValue={editBillingType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="project">Fixed Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editBillingType === 'hourly' && (
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
              {editBillingType === 'project' && (
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
                <Select onValueChange={(value) => onSetEditingProject({...editingProject, status: value})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" defaultValue={editingProject.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
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
