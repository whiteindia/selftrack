
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  selectedSprintLeader: string;
  setSelectedSprintLeader: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  globalServiceFilter: string;
  selectedPinFilter: string;
  setSelectedPinFilter: (value: string) => void;
  selectedFavoriteFilter: string;
  setSelectedFavoriteFilter: (value: string) => void;
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
  selectedSprintLeader,
  setSelectedSprintLeader,
  selectedStatus,
  setSelectedStatus,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  globalServiceFilter,
  selectedPinFilter,
  setSelectedPinFilter,
  selectedFavoriteFilter,
  setSelectedFavoriteFilter,
  clients,
  projects,
  employees,
  services,
  availableYears,
  hasActiveFilters,
  resetFilters
}) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  return (
    <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center justify-between w-full p-0 h-auto">
              <CardTitle className="text-base font-medium">Filters</CardTitle>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFilters();
                    }}
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                )}
                {isFiltersOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {/* First row - Date and Status filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-8 text-sm">
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
                <label className="block text-xs font-medium mb-1">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-8 text-sm">
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

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-medium mb-1">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-8 text-sm">
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

            {/* Second row - Sprint and Task-based filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Sprint Leader</label>
                <Select value={selectedSprintLeader} onValueChange={setSelectedSprintLeader}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All Sprint Leaders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sprint Leaders</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Pin Status</label>
                <Select value={selectedPinFilter} onValueChange={setSelectedPinFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All Sprints" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sprints</SelectItem>
                    <SelectItem value="pinned">Pinned Only</SelectItem>
                    <SelectItem value="unpinned">Unpinned Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Favorite Status</label>
                <Select value={selectedFavoriteFilter} onValueChange={setSelectedFavoriteFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All Sprints" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sprints</SelectItem>
                    <SelectItem value="favorite">Favorites Only</SelectItem>
                    <SelectItem value="unfavorite">Not Favorites</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Client</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="h-8 text-sm">
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
                <label className="block text-xs font-medium mb-1">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="h-8 text-sm">
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
                <label className="block text-xs font-medium mb-1">Assignee</label>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="h-8 text-sm">
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
            </div>
            
            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap gap-1">
                {globalServiceFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Service: {services.find(s => s.name === globalServiceFilter)?.name}
                  </Badge>
                )}
                {selectedStatus !== 'active' && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {selectedStatus === 'all' ? 'All' : selectedStatus}
                  </Badge>
                )}
                {selectedYear !== 'all' && (
                  <Badge variant="secondary" className="text-xs">Year: {selectedYear}</Badge>
                )}
                {selectedMonth !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Month: {months.find(m => m.value === selectedMonth)?.label}
                  </Badge>
                )}
                {selectedSprintLeader !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Sprint Leader: {employees.find(e => e.id === selectedSprintLeader)?.name}
                  </Badge>
                )}
                {selectedClient !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Client: {clients.find(c => c.id === selectedClient)?.name}
                  </Badge>
                )}
                {selectedProject !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Project: {projects.find(p => p.id === selectedProject)?.name}
                  </Badge>
                )}
                {selectedAssignee !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Assignee: {employees.find(e => e.id === selectedAssignee)?.name}
                  </Badge>
                )}
                {selectedPinFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Pin: {selectedPinFilter === 'pinned' ? 'Pinned Only' : 'Unpinned Only'}
                  </Badge>
                )}
                {selectedFavoriteFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Favorite: {selectedFavoriteFilter === 'favorite' ? 'Favorites Only' : 'Not Favorites'}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default SprintsFilters;
