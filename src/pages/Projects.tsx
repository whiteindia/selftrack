import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import ProjectForm from '@/components/projects/ProjectForm';
import ProjectFilters from '@/components/projects/ProjectFilters';
import ProjectTable from '@/components/projects/ProjectTable';
import { useProjectOperations } from '@/hooks/useProjectOperations';
import { Plus } from 'lucide-react';

type ProjectType = Database['public']['Enums']['project_type'];

interface ProjectData {
  id: string;
  name: string;
  client_id: string;
  type: ProjectType;
  hourly_rate: number;
  project_amount: number | null;
  total_hours: number;
  status: Database['public']['Enums']['project_status'];
  start_date: string | null;
  deadline: string | null;
  brd_file_url: string | null;
  assignee_id: string | null;
  created_at: string;
  clients: {
    name: string;
  };
  assignee?: {
    full_name: string;
  };
}

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
  role: string;
}

const Projects = () => {
  const [newProject, setNewProject] = useState({
    name: '',
    client_id: '',
    type: '' as ProjectType,
    billing_type: 'hourly' as 'hourly' | 'project',
    hourly_rate: 0,
    project_amount: 0,
    start_date: '',
    deadline: '',
    assignee_id: '',
    brd_file: null as File | null
  });
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [editBillingType, setEditBillingType] = useState<'hourly' | 'project'>('hourly');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [uploadingBRD, setUploadingBRD] = useState(false);
  const [editBrdFile, setEditBrdFile] = useState<File | null>(null);

  // Filter states
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { createProjectMutation, updateProjectMutation, deleteProjectMutation } = useProjectOperations();

  // Fetch projects with client and assignee data
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients(name),
          assignee:profiles!assignee_id(full_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProjectData[];
    }
  });

  // Fetch clients for dropdown
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

  // Fetch services for project types and filtering
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

  // Fetch assignees (admin users and managers) - Enhanced with better debugging
  const { data: assignees = [] } = useQuery({
    queryKey: ['assignees'],
    queryFn: async () => {
      console.log('Fetching assignees...');
      
      // First get user roles for admin and manager
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'manager']);
      
      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw rolesError;
      }
      
      console.log('User roles found:', userRoles);
      console.log('Admin roles:', userRoles?.filter(r => r.role === 'admin'));
      console.log('Manager roles:', userRoles?.filter(r => r.role === 'manager'));
      
      if (!userRoles || userRoles.length === 0) {
        console.log('No admin or manager users found');
        return [];
      }
      
      // Extract user IDs
      const userIds = userRoles.map(role => role.user_id);
      console.log('User IDs to fetch profiles for:', userIds);
      
      // Now get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
        .order('full_name');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      console.log('Raw profiles data:', profiles);
      
      // Transform the data to match expected format and include role information
      const transformedData = profiles?.map(profile => {
        const userRole = userRoles.find(ur => ur.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name || profile.email,
          email: profile.email,
          role: userRole?.role || 'unknown'
        };
      }) || [];
      
      console.log('Transformed assignees data:', transformedData);
      console.log('Total assignees found:', transformedData.length);
      console.log('Admins:', transformedData.filter(a => a.role === 'admin'));
      console.log('Managers:', transformedData.filter(a => a.role === 'manager'));
      
      return transformedData as Assignee[];
    }
  });

  // Filter projects based on selected filters
  const filteredProjects = React.useMemo(() => {
    return projects.filter(project => {
      const matchesClient = selectedClient === 'all' || project.client_id === selectedClient;
      const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
      const matchesType = selectedType === 'all' || project.type === selectedType;
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Year and month filtering based on created_at
      const projectDate = new Date(project.created_at);
      const matchesYear = selectedYear === 'all' || projectDate.getFullYear().toString() === selectedYear;
      const matchesMonth = selectedMonth === 'all' || (projectDate.getMonth() + 1).toString() === selectedMonth;
      
      return matchesClient && matchesStatus && matchesType && matchesSearch && matchesYear && matchesMonth;
    });
  }, [projects, selectedClient, selectedStatus, selectedType, selectedYear, selectedMonth, searchTerm]);

  // Get unique years from projects
  const availableYears = React.useMemo(() => {
    const years = projects.map(project => new Date(project.created_at).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [projects]);

  const handleCreateProject = () => {
    const projectData = {
      name: newProject.name,
      client_id: newProject.client_id,
      type: newProject.type,
      hourly_rate: newProject.type === 'BRD' ? 0 : newProject.hourly_rate,
      project_amount: newProject.billing_type === 'project' || newProject.type === 'BRD' ? newProject.project_amount : null,
      start_date: newProject.start_date || null,
      deadline: newProject.billing_type === 'project' && newProject.deadline ? newProject.deadline : null,
      assignee_id: newProject.assignee_id || null
    };
    
    createProjectMutation.mutate(
      { projectData, brdFile: newProject.brd_file },
      {
        onSuccess: () => {
          setNewProject({
            name: '',
            client_id: '',
            type: 'DevOps',
            billing_type: 'hourly',
            hourly_rate: 0,
            project_amount: 0,
            start_date: '',
            deadline: '',
            assignee_id: '',
            brd_file: null
          });
          setIsDialogOpen(false);
        }
      }
    );
  };

  const handleUpdateProject = () => {
    if (editingProject) {
      const updates = {
        name: editingProject.name,
        client_id: editingProject.client_id,
        type: editingProject.type,
        hourly_rate: editingProject.type === 'BRD' ? 0 : editingProject.hourly_rate,
        project_amount: editBillingType === 'project' || editingProject.type === 'BRD' ? editingProject.project_amount : null,
        start_date: editingProject.start_date || null,
        deadline: editBillingType === 'project' && editingProject.deadline ? editingProject.deadline : null,
        status: editingProject.status,
        assignee_id: editingProject.assignee_id || null
      };
      
      updateProjectMutation.mutate(
        { id: editingProject.id, updates, brdFile: editBrdFile },
        {
          onSuccess: () => {
            setEditingProject(null);
            setEditBrdFile(null);
            setIsEditDialogOpen(false);
          }
        }
      );
    }
  };

  const handleDeleteProject = (id: string) => {
    deleteProjectMutation.mutate(id);
  };

  const openBRDFile = (url: string) => {
    window.open(url, '_blank');
  };

  const isProjectBased = (project: ProjectData) => {
    return project.project_amount !== null || project.brd_file_url !== null;
  };

  const clearFilters = () => {
    setSelectedClient('all');
    setSelectedStatus('all');
    setSelectedType('all');
    setSelectedYear('all');
    setSelectedMonth('all');
    setSearchTerm('');
  };

  const handleEditProject = (project: ProjectData) => {
    setEditingProject(project);
    setEditBillingType(isProjectBased(project) ? 'project' : 'hourly');
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading projects...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-2">Manage your client projects</p>
          </div>
          
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </div>

        <ProjectFilters
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          clients={clients}
          services={services}
          availableYears={availableYears}
          onClearFilters={clearFilters}
        />

        <ProjectTable
          projects={filteredProjects}
          totalProjects={projects.length}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
          onViewBRD={openBRDFile}
        />

        <ProjectForm
          newProject={newProject}
          setNewProject={setNewProject}
          editingProject={editingProject}
          onSetEditingProject={handleEditProject}
          editBillingType={editBillingType}
          setEditBillingType={setEditBillingType}
          editBrdFile={editBrdFile}
          setEditBrdFile={setEditBrdFile}
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          isEditDialogOpen={isEditDialogOpen}
          setIsEditDialogOpen={setIsEditDialogOpen}
          uploadingBRD={uploadingBRD}
          onCreateProject={handleCreateProject}
          onUpdateProject={handleUpdateProject}
          onViewBRD={openBRDFile}
          assignees={assignees}
        />
      </div>
    </Navigation>
  );
};

export default Projects;
