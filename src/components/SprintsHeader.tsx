
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
  setGlobalServiceFilter: (value: string) => void;
  services: Service[];
  onCreateSprint: () => void;
}

const SprintsHeader: React.FC<SprintsHeaderProps> = ({
  globalServiceFilter,
  setGlobalServiceFilter,
  services,
  onCreateSprint
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">Sprints</h1>
      <div className="flex items-center gap-4">
        <div className="w-48">
          <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Service" />
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
        <Button onClick={onCreateSprint}>
          <Plus className="h-4 w-4 mr-2" />
          Create Sprint
        </Button>
      </div>
    </div>
  );
};

export default SprintsHeader;
