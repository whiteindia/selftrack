
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface LandingPageSelectProps {
  roleName: string;
  currentLandingPage: string | null;
  availablePages: string[];
  onLandingPageChange: (page: string | null) => void;
  disabled?: boolean;
}

const LandingPageSelect: React.FC<LandingPageSelectProps> = ({
  roleName,
  currentLandingPage,
  availablePages,
  onLandingPageChange,
  disabled = false
}) => {
  // Create friendly labels for pages
  const getPageLabel = (pageName: string): string => {
    const labels: Record<string, string> = {
      'dashboard': 'Dashboard',
      'clients': 'Clients',
      'employees': 'Employees',
      'projects': 'Projects',
      'tasks': 'Tasks',
      'sprints': 'Sprints',
      'invoices': 'Invoices',
      'payments': 'Payments',
      'services': 'Services',
      'wages': 'Wages',
      'gantt-view': 'Gantt View',
      'agenda-cal': 'Agenda Calendar',
      'log-cal': 'Log Calendar'
    };
    return labels[pageName] || pageName.charAt(0).toUpperCase() + pageName.slice(1);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`landing-page-${roleName}`}>Landing Page (Optional)</Label>
      <Select
        value={currentLandingPage || 'none'}
        onValueChange={(value) => onLandingPageChange(value === 'none' ? null : value)}
        disabled={disabled}
      >
        <SelectTrigger id={`landing-page-${roleName}`}>
          <SelectValue placeholder="Select default landing page" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No specific landing page</SelectItem>
          {availablePages.map((page) => (
            <SelectItem key={page} value={page}>
              {getPageLabel(page)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-gray-500">
        {availablePages.length === 0 
          ? 'No pages available. Configure read privileges first.' 
          : `Choose from ${availablePages.length} available pages with read access.`
        }
      </p>
    </div>
  );
};

export default LandingPageSelect;
