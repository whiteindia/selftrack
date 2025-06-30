
import { useState } from 'react';

export type ViewMode = 'table' | 'kanban';

export const useViewMode = (defaultMode: ViewMode = 'kanban') => {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);

  const toggleView = () => {
    setViewMode(prev => prev === 'table' ? 'kanban' : 'table');
  };

  const setTableView = () => setViewMode('table');
  const setKanbanView = () => setViewMode('kanban');

  return {
    viewMode,
    setViewMode,
    toggleView,
    setTableView,
    setKanbanView,
    isTableView: viewMode === 'table',
    isKanbanView: viewMode === 'kanban'
  };
};
