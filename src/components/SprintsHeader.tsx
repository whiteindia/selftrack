
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
        
        {/* Sorting Priority Information */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Info className="h-3 w-3" />
            <span>Sorting Priority:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              Recently Updated
            </Badge>
            <span className="text-xs text-gray-400">→</span>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
              Overdue
            </Badge>
            <span className="text-xs text-gray-400">→</span>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
              Near Deadline
            </Badge>
            <span className="text-xs text-gray-400">→</span>
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
              Others
            </Badge>
          </div>
        </div>
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
