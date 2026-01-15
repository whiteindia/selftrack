
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Filter } from 'lucide-react';

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
  selectedServices: string[];
  setSelectedServices: React.Dispatch<React.SetStateAction<string[]>>;
  selectedClients: string[];
  setSelectedClients: React.Dispatch<React.SetStateAction<string[]>>;
  selectedProject: string;
  setSelectedProject: (value: string) => void;
  services: Service[];
  clients: Client[];
  projects: Project[];
  showTitle?: boolean;
}

const TasksHeader: React.FC<TasksHeaderProps> = ({
  selectedServices = [],
  setSelectedServices,
  selectedClients = [],
  setSelectedClients,
  selectedProject = '',
  setSelectedProject,
  services = [],
  clients = [],
  projects = [],
  showTitle = true
}) => {
  const [activeFilterTab, setActiveFilterTab] = useState<'services' | 'clients' | 'projects'>('services');

  const selectedClientNames = useMemo(() => {
    return selectedClients
      .map(clientId => clients.find(c => c.id === clientId)?.name)
      .filter((name): name is string => !!name);
  }, [selectedClients, clients]);

  const availableClients = useMemo(() => {
    if (selectedServices.length === 0) return clients;
    const clientNameSet = new Set(
      projects
        .filter(project => selectedServices.includes(project.service))
        .map(project => project.clients?.name)
        .filter((name): name is string => !!name)
    );
    return clients.filter(client => clientNameSet.has(client.name));
  }, [clients, projects, selectedServices]);

  const availableProjects = useMemo(() => {
    let filtered = projects;
    if (selectedServices.length > 0) {
      filtered = filtered.filter(project => selectedServices.includes(project.service));
    }
    if (selectedClientNames.length > 0) {
      filtered = filtered.filter(project => selectedClientNames.includes(project.clients?.name || ''));
    }
    return filtered;
  }, [projects, selectedServices, selectedClientNames]);

  const toggleService = (serviceName: string) => {
    setSelectedServices(prev => {
      const newServices = prev.includes(serviceName)
        ? prev.filter(name => name !== serviceName)
        : [...prev, serviceName];

      setSelectedClients([]);
      setSelectedProject('');
      setActiveFilterTab(newServices.length > 0 ? 'clients' : 'services');
      return newServices;
    });
  };

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const newClients = prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId];

      setSelectedProject('');
      setActiveFilterTab(newClients.length > 0 ? 'projects' : 'clients');
      return newClients;
    });
  };

  const handleClearSelection = () => {
    setSelectedServices([]);
    setSelectedClients([]);
    setSelectedProject('');
    setActiveFilterTab('services');
  };

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Tasks</h1>
          {(selectedServices.length > 0 || selectedClients.length > 0 || selectedProject) && (
            <Button variant="outline" size="sm" onClick={handleClearSelection}>
              Clear selection
            </Button>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Select Filters:</span>
        </div>

        <Tabs value={activeFilterTab} onValueChange={(value) => setActiveFilterTab(value as any)}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="services">Services</TabsTrigger>
            {selectedServices.length > 0 && <TabsTrigger value="clients">Clients</TabsTrigger>}
            {selectedClients.length > 0 && <TabsTrigger value="projects">Projects</TabsTrigger>}
          </TabsList>

          <TabsContent value="services" className="mt-3">
            {services.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {services.map((service) => (
                  <Button
                    key={service.id}
                    variant={selectedServices.includes(service.name) ? 'default' : 'outline'}
                    size="sm"
                    type="button"
                    onClick={() => toggleService(service.name)}
                    className="flex items-center gap-2 text-xs"
                  >
                    {selectedServices.includes(service.name) && <Check className="h-3 w-3" />}
                    {service.name}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No services found</div>
            )}
          </TabsContent>

          <TabsContent value="clients" className="mt-3">
            {selectedServices.length === 0 ? (
              <div className="text-xs text-muted-foreground">Select a service to see clients.</div>
            ) : availableClients.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableClients.map((client) => (
                  <Button
                    key={client.id}
                    variant={selectedClients.includes(client.id) ? 'default' : 'outline'}
                    size="sm"
                    type="button"
                    onClick={() => toggleClient(client.id)}
                    className="flex items-center gap-2 text-xs"
                  >
                    {selectedClients.includes(client.id) && <Check className="h-3 w-3" />}
                    {client.name}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No clients found for selected services</div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="mt-3">
            {selectedClients.length === 0 ? (
              <div className="text-xs text-muted-foreground">Select a client to see projects.</div>
            ) : availableProjects.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableProjects.map((project) => (
                  <Button
                    key={project.id}
                    variant={selectedProject === project.id ? 'default' : 'outline'}
                    size="sm"
                    type="button"
                    onClick={() => setSelectedProject(project.id)}
                    className="flex items-center gap-2 text-xs"
                  >
                    {selectedProject === project.id && <Check className="h-3 w-3" />}
                    {project.name}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No projects found for selected clients</div>
            )}
          </TabsContent>
        </Tabs>

        {(selectedServices.length > 0 || selectedClients.length > 0 || selectedProject) && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded flex flex-wrap items-center gap-2">
            {selectedServices.length > 0 && <span>Services: {selectedServices.join(', ')}</span>}
            {selectedClients.length > 0 && (
              <span className="ml-2">
                | Clients: {selectedClients.map(id => clients.find(c => c.id === id)?.name).filter(Boolean).join(', ')}
              </span>
            )}
            {selectedProject && (
              <span className="ml-2">
                | Project: {projects.find(p => p.id === selectedProject)?.name}
              </span>
            )}
            <Button variant="ghost" size="sm" type="button" onClick={handleClearSelection} className="h-auto px-2 py-1 text-xs">
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksHeader;
