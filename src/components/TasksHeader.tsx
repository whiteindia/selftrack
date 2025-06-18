
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface Service {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  service: string;
  clients: {
    name: string;
  } | null;
}

interface TasksHeaderProps {
  globalServiceFilter: string;
  setGlobalServiceFilter: (value: string) => void;
  globalClientFilter: string;
  setGlobalClientFilter: (value: string) => void;
  projectFilter: string;
  setProjectFilter: (value: string) => void;
  services: Service[];
  clients: Client[];
  projects: Project[];
  canCreate: boolean;
  onCreateTask: () => void;
}

const TasksHeader: React.FC<TasksHeaderProps> = ({
  globalServiceFilter,
  setGlobalServiceFilter,
  globalClientFilter,
  setGlobalClientFilter,
  projectFilter,
  setProjectFilter,
  services,
  clients,
  projects,
  canCreate,
  onCreateTask
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Client:</span>
            <Select value={globalClientFilter} onValueChange={setGlobalClientFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Project:</span>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {canCreate && (
        <Button onClick={onCreateTask} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      )}
    </div>
  );
};

export default TasksHeader;
