
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface Service {
  id: string;
  name: string;
}

interface ProjectsHeaderProps {
  globalServiceFilter: string;
  setGlobalServiceFilter: (value: string) => void;
  services: Service[];
  canCreate: boolean;
  onCreateProject: () => void;
  userRole?: string;
}

const ProjectsHeader: React.FC<ProjectsHeaderProps> = ({
  globalServiceFilter,
  setGlobalServiceFilter,
  services,
  canCreate,
  onCreateProject,
  userRole
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Service:</span>
            <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Services" />
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
        </div>
        <p className="text-gray-600">
          {userRole === 'admin' ? 'Manage all projects' : 'Projects assigned to you'}
        </p>
      </div>
      
      {canCreate && (
        <Button onClick={onCreateProject} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      )}
    </div>
  );
};

export default ProjectsHeader;
