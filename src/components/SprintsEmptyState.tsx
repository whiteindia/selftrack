
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FilterX } from 'lucide-react';

interface SprintsEmptyStateProps {
  sprintsLength: number;
  hasActiveFilters: boolean;
  resetFilters: () => void;
  canCreate: boolean;
  onCreateSprint: () => void;
}

const SprintsEmptyState: React.FC<SprintsEmptyStateProps> = ({
  sprintsLength,
  hasActiveFilters,
  resetFilters,
  canCreate,
  onCreateSprint
}) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="text-center">
          {sprintsLength === 0 ? (
            <>
              <h3 className="text-lg font-semibold mb-2">No sprints found</h3>
              <p className="text-gray-600 mb-6">
                {canCreate 
                  ? "Get started by creating your first sprint to organize and track project tasks."
                  : "No sprints have been created yet. Contact an admin to create sprints."
                }
              </p>
              {canCreate && (
                <Button onClick={onCreateSprint}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Sprint
                </Button>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-2">No sprints match your filters</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your filters to see more sprints, or clear all filters to view everything.
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={resetFilters}>
                  <FilterX className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
                {canCreate && (
                  <Button onClick={onCreateSprint}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Sprint
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SprintsEmptyState;
