import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import ProjectForm from '@/components/projects/ProjectForm';
import ProjectFilters from '@/components/projects/ProjectFilters';
import ProjectTable from '@/components/projects/ProjectTable';
import ProjectDebugInfo from '@/components/projects/ProjectDebugInfo';
import { useProjectOperations } from '@/hooks/useProjectOperations';
import { usePrivileges } from '@/hooks/usePrivileges';
import RlsStatusAlert from '@/components/RlsStatusAlert';
import { Plus, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProjectData {
  id: string;
  name: string;
  client_id: string;
  service: string;
  hourly_rate: number;
  project_amount: number | null;
  total_hours: number;
  status: string;
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
  const { hasOperationAccess, isRlsFilteringActive, userId, userRole, employeeId, loading: privilegesLoading } = usePrivileges();
  
  // Check specific permissions for projects page
  const canCreate = hasOperationAccess('projects', 'create');
  const canUpdate = hasOperationAccess('projects', 'update');
  const canDelete = hasOperationAccess('projects', 'delete');
  const canRead = hasOperationAccess('projects', 'read');

  console.log('Projects page permissions:', { canCreate, canUpdate, canDelete, canRead });
  console.log('Should apply user filtering:', isRlsFilteringActive('projects'), 'User ID:', userId, 'Employee ID:', employeeId);
  console.log('User role:', userRole);
  console.log('Privileges loading:', privilegesLoading);

  const [newProject, setNewProject] = useState({
    name: '',
    client_id: '',
    service: '',
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
  const [selectedService, setSelectedService] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { createProjectMutation, updateProjectMutation, deleteProjectMutation } = useProjectOperations();

  // Enhanced projects query with better debugging and error handling
  const { data: projects = [], isLoading, error: projectsError } = useQuery({
    queryKey: ['projects', userId, userRole, employeeId],
    queryFn: async () => {
      console.log('=== PROJECTS QUERY START ===');
      console.log('Fetching projects...');
      console.log('User ID:', userId);
      console.log('Employee ID:', employeeId);
      console.log('User role:', userRole);
      console.log('RLS filtering active:', isRlsFilteringActive('projects'));
      
      // Get current user's info for debugging
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current auth user:', {
        id: user?.id,
        email: user?.email,
        user_metadata: user?.user_metadata
      });

      // Debug: Check what's in the projects table
      console.log('=== DEBUG: Checking all projects (admin view) ===');
      const { data: allProjects, error: debugError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          assignee_id,
          status,
          clients(name)
        `);
      
      if (!debugError) {
        console.log('All projects in database:', allProjects);
        allProjects?.forEach((proj, idx) => {
          console.log(`Project ${idx + 1}: ${proj.name}, assignee_id: "${proj.assignee_id}", client: ${proj.clients?.name}`);
        });
      }

      // Debug: Check employee record for current user
      if (user?.email) {
        const { data: empRecord, error: empError } = await supabase
          .from('employees')
          .select('id, name, email')
          .eq('email', user.email);
        
        console.log('Employee record for current user:', empRecord);
        if (empError) console.log('Employee query error:', empError);
      }
      
      let query = supabase
        .from('projects')
        .select(`
          *,
          clients(name),
          assignee:profiles!assignee_id(full_name)
        `);

      // For manager role with RLS active, the RLS policy should handle filtering automatically
      if (isRlsFilteringActive('projects') && userRole === 'manager') {
        console.log('Manager role with RLS - letting RLS policies handle filtering');
        console.log('Expected: Projects where assignee_id matches current user employee ID');
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      
      console.log('Final projects data returned:', data);
      console.log('Number of projects found:', data?.length || 0);
      
      if (data && data.length > 0) {
        data.forEach((project, index) => {
          console.log(`Returned Project ${index + 1}:`, {
            id: project.id,
            name: project.name,
            assignee_id: project.assignee_id,
            status: project.status,
            client: project.clients?.name
          });
        });
      } else if (isRlsFilteringActive('projects')) {
        console.log('=== NO PROJECTS FOUND - DEBUGGING ===');
        console.log('This could mean:');
        console.log('1. No projects have assignee_id matching employee ID:', employeeId);
        console.log('2. RLS policy is not matching correctly');
        console.log('3. assignee_id field contains wrong format (username vs UUID)');
        console.log('4. Employee record email does not match auth user email');
      }
      
      console.log('=== PROJECTS QUERY END ===');
      return data as ProjectData[];
    },
    enabled: canRead && !!userId
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log('Fetching clients for projects...');
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
      console.log('Clients fetched for projects:', data?.length || 0, 'clients');
      return data as Client[];
    },
    enabled: canRead
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
      const matchesService = selectedService === 'all' || project.service === selectedService;
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Year and month filtering based on created_at
      const projectDate = new Date(project.created_at);
      const matchesYear = selectedYear === 'all' || projectDate.getFullYear().toString() === selectedYear;
      const matchesMonth = selectedMonth === 'all' || (projectDate.getMonth() + 1).toString() === selectedMonth;
      
      return matchesClient && matchesStatus && matchesService && matchesSearch && matchesYear && matchesMonth;
    });
  }, [projects, selectedClient, selectedStatus, selectedService, selectedYear, selectedMonth, searchTerm]);

  // Get unique years from projects
  const availableYears = React.useMemo(() => {
    const years = projects.map(project => new Date(project.created_at).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [projects]);

  const handleCreateProject = () => {
    if (!canCreate) {
      toast.error('You do not have permission to create projects');
      return;
    }

    const projectData = {
      name: newProject.name,
      client_id: newProject.client_id,
      service: newProject.service,
      hourly_rate: newProject.service === 'BRD' ? 0 : newProject.hourly_rate,
      project_amount: newProject.billing_type === 'project' || newProject.service === 'BRD' ? newProject.project_amount : null,
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
            service: '',
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
    if (!canUpdate) {
      toast.error('You do not have permission to update projects');
      return;
    }

    if (editingProject) {
      const updates = {
        name: editingProject.name,
        client_id: editingProject.client_id,
        service: editingProject.service,
        hourly_rate: editingProject.service === 'BRD' ? 0 : editingProject.hourly_rate,
        project_amount: editBillingType === 'project' || editingProject.service === 'BRD' ? editingProject.project_amount : null,
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
    if (!canDelete) {
      toast.error('You do not have permission to delete projects');
      return;
    }

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
    setSelectedService('all');
    setSelectedYear('all');
    setSelectedMonth('all');
    setSearchTerm('');
  };

  const handleEditProject = (project: ProjectData) => {
    if (!canUpdate) {
      toast.error('You do not have permission to edit projects');
      return;
    }

    setEditingProject(project);
    setEditBillingType(isProjectBased(project) ? 'project' : 'hourly');
    setIsEditDialogOpen(true);
  };

  if (isLoading || privilegesLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading projects...</div>
        </div>
      </Navigation>
    );
  }

  // Check if user has read access
  if (!canRead) {
    return (
      <Navigation>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to view projects.</p>
          </div>
        </div>
      </Navigation>
    );
  }

  if (projectsError) {
    return (
      <Navigation>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">Failed to load projects: {projectsError.message}</p>
          </div>
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
            <p className="text-gray-600 mt-2">
              {userRole === 'manager' ? 'Projects assigned to you' : 'Manage your client projects'}
            </p>
          </div>
          
          {canCreate && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          )}
        </div>

        <RlsStatusAlert 
          userRole={userRole} 
          pageName="Projects" 
          description="Showing only projects where you are the assignee." 
        />

        {/* Add the debug component */}
        <ProjectDebugInfo 
          userRole={userRole}
          employeeId={employeeId}
          userId={userId}
        />

        {/* Enhanced debug information */}
        {process.env.NODE_ENV === 'development' && isRlsFilteringActive('projects') && (
          <Alert className="mb-6 bg-blue-50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Debug Info:</strong> User Role: {userRole} | Employee ID: {employeeId || 'Not found'} | 
              RLS Active: {isRlsFilteringActive('projects') ? 'Yes' : 'No'} | 
              Projects Found: {projects.length}
              {projects.length === 0 && userRole === 'manager' && (
                <div className="mt-2 text-sm">
                  <strong>Troubleshooting:</strong> No projects found for manager. Check that:
                  <br />• Projects table has assignee_id matching your employee ID
                  <br />• Your employee record exists with correct email
                  <br />• RLS policies are properly configured
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <ProjectFilters
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedType={selectedService}
          setSelectedType={setSelectedService}
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
          canUpdate={canUpdate}
          canDelete={canDelete}
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
