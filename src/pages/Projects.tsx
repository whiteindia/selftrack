import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import ProjectFilters from '@/components/projects/ProjectFilters';
import ProjectCards from '@/components/projects/ProjectCards';
import ProjectTable from '@/components/projects/ProjectTable';
import ProjectFormDialog from '@/components/projects/ProjectFormDialog';
import { Button } from '@/components/ui/button';
import { Grid, List } from 'lucide-react';

const Projects = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  // Show ALL project statuses by default (user can narrow down via filters).
  const allStatusOptions = [
    'Planning',
    'Active',
    'On Hold',
    'Completed',
    'Cancelled',
    'Imp',
    'On-Head',
    'Targeted',
    'OverDue',
  ];
  const [selectedStatus, setSelectedStatus] = useState<string[]>(allStatusOptions);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]); // service names
  const [selectedClients, setSelectedClients] = useState<string[]>([]); // client ids
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients!inner(
            id,
            name,
            company
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Get available years from projects
  const availableYears = React.useMemo(() => {
    const years = projects
      .map(p => new Date(p.created_at).getFullYear())
      .filter((year, index, self) => self.indexOf(year) === index)
      .sort((a, b) => b - a);
    return years;
  }, [projects]);

  // Base filters (everything except client selection) so we can compute available clients in cascade mode.
  const baseFilteredProjects = React.useMemo(() => {
    return projects.filter(project => {
      // Search filter
      if (
        searchTerm &&
        !project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !project.clients.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (selectedStatus.length > 0 && !selectedStatus.includes(project.status)) {
        return false;
      }

      // Year filter
      if (selectedYear !== 'all') {
        const projectYear = new Date(project.created_at).getFullYear();
        if (projectYear.toString() !== selectedYear) return false;
      }

      // Month filter
      if (selectedMonth !== 'all') {
        const projectMonth = new Date(project.created_at).getMonth() + 1;
        if (projectMonth.toString() !== selectedMonth) return false;
      }

      // Service filter (cascade parent)
      if (selectedServices.length > 0 && !selectedServices.includes(project.service)) {
        return false;
      }

      return true;
    });
  }, [projects, searchTerm, selectedStatus, selectedYear, selectedMonth, selectedServices]);

  const availableClients = React.useMemo(() => {
    const clientMap = new Map<string, { id: string; name: string }>();
    baseFilteredProjects.forEach((p: any) => {
      if (p.clients?.id && p.clients?.name) {
        clientMap.set(p.clients.id, { id: p.clients.id, name: p.clients.name });
      }
    });
    return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [baseFilteredProjects]);

  const filteredProjects = React.useMemo(() => {
    if (selectedClients.length === 0) return baseFilteredProjects;
    return baseFilteredProjects.filter((p: any) => selectedClients.includes(p.clients?.id));
  }, [baseFilteredProjects, selectedClients]);

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProject(null);
  };

  const handleFormSuccess = () => {
    refetch();
    handleCloseForm();
  };

  const handleClearFilters = () => {
    setSelectedStatus(allStatusOptions);
    setSelectedYear('all');
    setSelectedMonth('all');
    setSearchTerm('');
    setSelectedServices([]);
    setSelectedClients([]);
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading projects...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="px-3"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="px-3"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            <Button onClick={() => setIsFormOpen(true)}>
              Create Project
            </Button>
          </div>
        </div>

        <ProjectFilters
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          services={services}
          selectedServices={selectedServices}
          setSelectedServices={setSelectedServices}
          availableClients={availableClients}
          selectedClients={selectedClients}
          setSelectedClients={setSelectedClients}
          availableYears={availableYears}
          onClearFilters={handleClearFilters}
        />

        <div className="text-sm text-gray-600">
          Showing {filteredProjects.length} of {projects.length} projects
        </div>

        {viewMode === 'cards' ? (
          <ProjectCards 
            projects={filteredProjects}
            onEditProject={handleEditProject}
          />
        ) : (
          <ProjectTable 
            projects={filteredProjects}
            totalProjects={projects.length}
            canUpdate={true}
            canDelete={true}
            onEdit={handleEditProject}
            onDelete={(id) => {
              // Handle delete functionality
              console.log('Delete project:', id);
            }}
            onViewBRD={(url) => window.open(url, '_blank')}
          />
        )}

        <ProjectFormDialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          project={editingProject}
          onSuccess={handleFormSuccess}
        />
      </div>
    </Navigation>
  );
};

export default Projects;
