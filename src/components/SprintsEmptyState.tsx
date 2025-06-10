
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';

interface SprintsEmptyStateProps {
  sprintsLength: number;
  hasActiveFilters: boolean;
  resetFilters: () => void;
  onCreateSprint: () => void;
}

const SprintsEmptyState: React.FC<SprintsEmptyStateProps> = ({
  sprintsLength,
  hasActiveFilters,
  resetFilters,
  onCreateSprint
}) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No sprints found</h3>
        <p className="text-gray-500 text-center mb-4">
          {sprintsLength === 0 
            ? "Get started by creating your first sprint to organize your tasks."
            : "No sprints match the current filters. Try adjusting your filter criteria."
          }
        </p>
        {hasActiveFilters && (
          <Button variant="outline" onClick={resetFilters} className="mb-4">
            Clear Filters
          </Button>
        )}
        <Button onClick={onCreateSprint}>
          <Plus className="h-4 w-4 mr-2" />
          Create Sprint
        </Button>
      </CardContent>
    </Card>
  );
};

export default SprintsEmptyState;
