
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface Service {
  id: string;
  name: string;
}

interface SprintsHeaderProps {
  globalServiceFilter: string;
  setGlobalServiceFilter: (filter: string) => void;
  services: Service[];
  canCreate: boolean;
  onCreateSprint: () => void;
}

const SprintsHeader: React.FC<SprintsHeaderProps> = ({
  globalServiceFilter,
  setGlobalServiceFilter,
  services,
  canCreate,
  onCreateSprint
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Sprints</h1>
        <p className="text-gray-600 mt-2 text-sm lg:text-base">Manage project sprints and track progress</p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm font-medium whitespace-nowrap">Global Service Filter:</label>
          <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
            <SelectTrigger className="w-full sm:w-48 min-w-0">
              <SelectValue placeholder="Filter by service" />
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
        
        {canCreate && (
          <Button onClick={onCreateSprint} className="w-full sm:w-auto whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Create Sprint
          </Button>
        )}

        {!canCreate && (
          <div className="text-sm text-gray-500 text-center sm:text-left">
            You don't have permission to create sprints
          </div>
        )}
      </div>
    </div>
  );
};

export default SprintsHeader;
