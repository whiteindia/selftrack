
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
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sprints</h1>
        <p className="text-gray-600 mt-2">Manage project sprints and track progress</p>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Global Service Filter:</label>
          <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
            <SelectTrigger className="w-48">
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
          <Button onClick={onCreateSprint}>
            <Plus className="h-4 w-4 mr-2" />
            Create Sprint
          </Button>
        )}

        {!canCreate && (
          <div className="text-sm text-gray-500">
            You don't have permission to create sprints
          </div>
        )}
      </div>
    </div>
  );
};

export default SprintsHeader;
