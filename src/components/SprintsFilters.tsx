
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

interface SprintsFiltersProps {
  selectedClient: string;
  setSelectedClient: (value: string) => void;
  selectedProject: string;
  setSelectedProject: (value: string) => void;
  selectedAssignee: string;
  setSelectedAssignee: (value: string) => void;
  selectedAssigner: string;
  setSelectedAssigner: (value: string) => void;
  selectedService: string;
  setSelectedService: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  globalServiceFilter: string;
  clients: Client[];
  projects: Project[];
  employees: Employee[];
  services: Service[];
  availableYears: number[];
  hasActiveFilters: boolean;
  resetFilters: () => void;
}

const months = [
  { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
  { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
  { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' }
];

const SprintsFilters: React.FC<SprintsFiltersProps> = ({
  selectedClient,
  setSelectedClient,
  selectedProject,
  setSelectedProject,
  selectedAssignee,
  setSelectedAssignee,
  selectedAssigner,
  setSelectedAssigner,
  selectedService,
  setSelectedService,
  selectedStatus,
  setSelectedStatus,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  globalServiceFilter,
  clients,
  projects,
  employees,
  services,
  availableYears,
  hasActiveFilters,
  resetFilters
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* First row - Date and Status filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Sprint Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sprints</SelectItem>
                <SelectItem value="active">Active Sprints (Hide Completed)</SelectItem>
                <SelectItem value="Not Started">Not Started</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Month</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second row - Task-based filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Client</label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
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

          <div>
            <label className="block text-sm font-medium mb-2">Project</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
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

          <div>
            <label className="block text-sm font-medium mb-2">Assignee</label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Service</label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
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
        
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {globalServiceFilter !== 'all' && (
              <Badge variant="secondary">
                Service: {services.find(s => s.name === globalServiceFilter)?.name}
              </Badge>
            )}
            {selectedStatus !== 'active' && (
              <Badge variant="secondary">
                Status: {selectedStatus === 'all' ? 'All' : selectedStatus}
              </Badge>
            )}
            {selectedYear !== 'all' && (
              <Badge variant="secondary">Year: {selectedYear}</Badge>
            )}
            {selectedMonth !== 'all' && (
              <Badge variant="secondary">
                Month: {months.find(m => m.value === selectedMonth)?.label}
              </Badge>
            )}
            {selectedClient !== 'all' && (
              <Badge variant="secondary">
                Client: {clients.find(c => c.id === selectedClient)?.name}
              </Badge>
            )}
            {selectedProject !== 'all' && (
              <Badge variant="secondary">
                Project: {projects.find(p => p.id === selectedProject)?.name}
              </Badge>
            )}
            {selectedAssignee !== 'all' && (
              <Badge variant="secondary">
                Assignee: {employees.find(e => e.id === selectedAssignee)?.name}
              </Badge>
            )}
            {selectedService !== 'all' && (
              <Badge variant="secondary">
                Task Service: {services.find(s => s.name === selectedService)?.name}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SprintsFilters;
