import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import ProjectForm from '@/components/projects/ProjectForm';
import ProjectFilters from '@/components/projects/ProjectFilters';
import ProjectTable from '@/components/projects/ProjectTable';
import ProjectsHeader from '@/components/ProjectsHeader';
import { useProjectOperations } from '@/hooks/useProjectOperations';
import { usePrivileges } from '@/hooks/usePrivileges';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { ProjectData } from '@/hooks/projects/types';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

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

// Extended interface for data returned from the database query
interface ExtendedProjectData extends ProjectData {
  assignee_id: string | null;
  assignee_employee?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const Projects = () => {
  const { hasOperationAccess, isRlsFilteringActive, userId, userRole, employeeId, loading: privilegesLoading } = usePrivileges();
  const { employee: currentEmployee } = useCurrentEmployee();
  
  // Check specific permissions for projects page
  const canCreate = hasOperationAccess('projects', 'create');
  const canUpdate = hasOperationAccess('projects', 'update');
  const canDelete = hasOperationAccess('projects', 'delete');
  const canRead = hasOperationAccess('projects', 'read');

  console.log('=== PROJECTS PAGE PERMISSIONS DEBUG ===');
  console.log('Projects page permissions:', { canCreate, canUpdate, canDelete, canRead });
  console.log('Should apply user filtering:', isRlsFilteringActive('projects'), 'User ID:', userId, 'Employee ID:', employeeId);
  console.log('User role:', userRole);
  console.log('Current employee:', currentEmployee);
  console.log('Privileges loading:', privilegesLoading);

  const [newProject, setNewProject] = useState({
    name: '',
    client_id: '',
    service: '',
    billing_type: 'Hourly' as 'Hourly' | 'Fixed',
    hourly_rate: 0,
    project_amount: 0,
    start_date: '',
    deadline: '',
    assignee_employee_id: '',
    brd_file: null as File | null
  });
  const [editingProject, setEditingProject] = useState<ExtendedProjectData | null>(null);
  const [editBillingType, setEditBillingType] = useState<'Hourly' | 'Fixed'>('Hourly');
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
  const [globalServiceFilter, setGlobalServiceFilter] = useState('all');

  const { createProjectMutation, updateProjectMutation, deleteProjectMutation } = useProjectOperations();

  // Enhanced projects query with proper assignee filtering
  const { data: projects = [], isLoading, error: projectsError } = useQuery({
    queryKey: ['projects', userId, userRole, employeeId, currentEmployee?.email],
    queryFn: async () => {
      console.log('=== PROJECTS QUERY START ===');
      console.log('Fetching projects...');
      console.log('User ID:', userId);
      console.log('Employee ID:', employeeId);
      console.log('Current employee email:', currentEmployee?.email);
      console.log('User role:', userRole);
      console.log('RLS filtering active:', isRlsFilteringActive('projects'));

      let query = supabase
        .from('projects')
        .select(`
          *,
          clients(name),
          assignee_employee:employees!assignee_employee_id(id, name, email, role)
        `);

      // Apply client-side filtering for non-admin users to ensure proper row-level security
      if (userRole !== 'admin' && currentEmployee) {
        console.log('Applying assignee filtering for non-admin user');
        console.log('Filtering by assignee_employee_id:', currentEmployee.id);
        query = query.eq('assignee_employee_id', currentEmployee.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      
      console.log('Raw projects data returned:', data);
      console.log('Number of projects found:', data?.length || 0);
      
      // Additional client-side filtering as a safety measure
      let filteredData = data || [];
      
      if (userRole !== 'admin' && currentEmployee) {
        filteredData = (data || []).filter(project => {
          const isAssignee = project.assignee_employee_id === currentEmployee.id;
          console.log(`Project ${project.name}: assignee_employee_id=${project.assignee_employee_id}, current_employee_id=${currentEmployee.id}, isAssignee=${isAssignee}`);
          return isAssignee;
        });
        console.log('After client-side filtering:', filteredData.length, 'projects');
      }
      
      if (filteredData && filteredData.length > 0) {
        filteredData.forEach((project, index) => {
          console.log(`Final Project ${index + 1}:`, {
            id: project.id,
            name: project.name,
            assignee_employee_id: project.assignee_employee_id,
            assignee_employee: project.assignee_employee,
            status: project.status,
            client: project.clients?.name,
            type: project.type,
            service: project.service
          });
        });
      } else if (userRole !== 'admin') {
        console.log('=== NO PROJECTS FOUND FOR NON-ADMIN USER ===');
        console.log('This means no projects have assignee_employee_id matching:', currentEmployee?.id);
      }
      
      console.log('=== PROJECTS QUERY END ===');
      return filteredData as ExtendedProjectData[];
    },
    enabled: canRead && !!userId && !!currentEmployee
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

  // Fetch employees for assignment (all employees) - Enhanced with better debugging
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      console.log('Fetching employees for assignment...');
      
      const { data: employeesData, error } = await supabase
        .from('employees')
        .select('id, name, email, role')
        .order('name');
      
      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }
      
      console.log('Employees fetched for assignment:', employeesData?.length || 0, 'employees');
      console.log('Available employees:', employeesData);
      
      return employeesData as Employee[];
    }
  });

  // Filter projects based on selected filters
  const filteredProjects = React.useMemo(() => {
    return projects.filter(project => {
      const matchesClient = selectedClient === 'all' || project.client_id === selectedClient;
      const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
      const matchesService = selectedService === 'all' || project.service === selectedService;
      const matchesGlobalService = globalServiceFilter === 'all' || project.service === globalServiceFilter;
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Year and month filtering based on created_at
      const projectDate = new Date(project.created_at);
      const matchesYear = selectedYear === 'all' || projectDate.getFullYear().toString() === selectedYear;
      const matchesMonth = selectedMonth === 'all' || (projectDate.getMonth() + 1).toString() === selectedMonth;
      
      return matchesClient && matchesStatus && matchesService && matchesGlobalService && matchesSearch && matchesYear && matchesMonth;
    });
  }, [projects, selectedClient, selectedStatus, selectedService, selectedYear, selectedMonth, searchTerm, globalServiceFilter]);

  // Get unique years from projects
  const availableYears = React.useMemo(() => {
    const years = projects.map(project => new Date(project.created_at).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [projects]);

  const handleCreateProject = () => {
    if (!canCreate) {
      console.error('=== CREATE PROJECT BLOCKED ===');
      console.error('User does not have create permission');
      console.error('canCreate:', canCreate);
      console.error('User role:', userRole);
      toast.error('You do not have permission to create projects');
      return;
    }

    console.log('=== CREATING PROJECT ===');
    console.log('User has create permission, proceeding...');
    console.log('New project data:', newProject);

    const projectData = {
      name: newProject.name,
      client_id: newProject.client_id,
      service: newProject.service,
      type: newProject.billing_type,
      hourly_rate: newProject.service === 'BRD' ? 0 : newProject.hourly_rate,
      project_amount: newProject.billing_type === 'Fixed' || newProject.service === 'BRD' ? newProject.project_amount : null,
      start_date: newProject.start_date || null,
      deadline: newProject.deadline || null, // Ensure deadline is passed correctly
      assignee_employee_id: newProject.assignee_employee_id || null
    };
    
    console.log('Final project data to insert:', projectData);
    
    createProjectMutation.mutate(
      { projectData, brdFile: newProject.brd_file },
      {
        onSuccess: () => {
          console.log('Project creation successful, resetting form');
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
          setIsDialogOpen(false);
        },
        onError: (error) => {
          console.error('Project creation failed in component:', error);
        }
      }
    );
  };

  const handleUpdateProject = () => {
    if (!canUpdate) {
      console.error('=== UPDATE PROJECT BLOCKED ===');
      console.error('User does not have update permission');
      console.error('canUpdate:', canUpdate);
      console.error('User role:', userRole);
      toast.error('You do not have permission to update projects');
      return;
    }

    console.log('=== UPDATING PROJECT ===');
    console.log('User has update permission, proceeding...');
    console.log('Editing project:', editingProject);

    if (editingProject) {
      const updates = {
        name: editingProject.name,
        client_id: editingProject.client_id,
        service: editingProject.service,
        type: editBillingType,
        hourly_rate: editingProject.service === 'BRD' ? 0 : editingProject.hourly_rate,
        project_amount: editBillingType === 'Fixed' || editingProject.service === 'BRD' ? editingProject.project_amount : null,
        start_date: editingProject.start_date || null,
        deadline: editingProject.deadline || null, // Ensure deadline is passed correctly
        status: editingProject.status,
        assignee_employee_id: editingProject.assignee_employee_id || null
      };
      
      console.log('Final project updates to apply:', updates);
      
      updateProjectMutation.mutate(
        { id: editingProject.id, updates, brdFile: editBrdFile },
        {
          onSuccess: () => {
            console.log('Project update successful, closing dialog');
            setEditingProject(null);
            setEditBrdFile(null);
            setIsEditDialogOpen(false);
          },
          onError: (error) => {
            console.error('Project update failed in component:', error);
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

  const isProjectBased = (project: ExtendedProjectData) => {
    return project.type === 'Fixed' || project.brd_file_url !== null;
  };

  const clearFilters = () => {
    setSelectedClient('all');
    setSelectedStatus('all');
    setSelectedService('all');
    setSelectedYear('all');
    setSelectedMonth('all');
    setSearchTerm('');
    setGlobalServiceFilter('all');
  };

  const handleEditProject = (project: ExtendedProjectData) => {
    if (!canUpdate) {
      toast.error('You do not have permission to edit projects');
      return;
    }

    console.log('Setting editing project:', project);
    setEditingProject(project);
    setEditBillingType(project.type === 'Fixed' ? 'Fixed' : 'Hourly');
    setIsEditDialogOpen(true);
  };

  const handleSetEditingProject = (updatedProject: ExtendedProjectData) => {
    console.log('Updating editing project:', updatedProject);
    setEditingProject(updatedProject);
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
        <ProjectsHeader
          globalServiceFilter={globalServiceFilter}
          setGlobalServiceFilter={setGlobalServiceFilter}
          services={services}
          canCreate={canCreate}
          onCreateProject={() => setIsDialogOpen(true)}
          userRole={userRole}
        />

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
          onSetEditingProject={handleSetEditingProject}
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
          employees={employees}
        />
      </div>
    </Navigation>
  );
};

export default Projects;
