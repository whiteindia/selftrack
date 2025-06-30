
import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, Kanban } from 'lucide-react';
import { ViewMode } from '@/hooks/useViewMode';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium">View:</span>
      <div className="flex border rounded-md overflow-hidden">
        <Button
          variant={viewMode === 'table' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('table')}
          className="rounded-none border-r"
        >
          <Table className="h-4 w-4 mr-1" />
          Table
        </Button>
        <Button
          variant={viewMode === 'kanban' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('kanban')}
          className="rounded-none"
        >
          <Kanban className="h-4 w-4 mr-1" />
          Kanban
        </Button>
      </div>
    </div>
  );
};

export default ViewModeToggle;
