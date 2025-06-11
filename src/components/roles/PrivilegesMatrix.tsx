
import React from 'react';
import PagePrivileges from './PagePrivileges';
import type { Database } from '@/integrations/supabase/types';

type CrudOperation = Database['public']['Enums']['crud_operation'];

interface Privilege {
  id?: string;
  role: string;
  page_name: string;
  operation: CrudOperation;
  allowed: boolean;
}

interface RLSPolicy {
  id?: string;
  role: string;
  page_name: string;
  rls_enabled: boolean;
}

interface PrivilegesMatrixProps {
  pages: string[];
  operations: CrudOperation[];
  privileges: Privilege[];
  rlsPolicies: RLSPolicy[];
  onUpdatePrivilege: (page: string, operation: CrudOperation, allowed: boolean) => void;
  onUpdateRlsPolicy: (page: string, enabled: boolean) => void;
  loading: boolean;
}

const PrivilegesMatrix: React.FC<PrivilegesMatrixProps> = ({ 
  pages, 
  operations, 
  privileges, 
  rlsPolicies,
  onUpdatePrivilege, 
  onUpdateRlsPolicy,
  loading 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading privileges...</div>
      </div>
    );
  }

  // Organize pages into categories
  const mainPages = ['dashboard', 'projects', 'tasks', 'sprints', 'invoices', 'payments', 'wages'];
  const trakEzyPages = ['gantt-view', 'agenda-cal', 'log-cal'];
  const configPages = ['clients', 'employees', 'services'];

  const renderPageGroup = (groupPages: string[], title: string, description: string) => (
    <div key={title} className="space-y-4">
      <div className="border-b pb-2">
        <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <div className="grid gap-4">
        {groupPages.map(page => (
          <PagePrivileges
            key={page}
            page={page}
            operations={operations}
            privileges={privileges}
            rlsPolicy={rlsPolicies.find(rls => rls.page_name === page)}
            onUpdatePrivilege={onUpdatePrivilege}
            onUpdateRlsPolicy={onUpdateRlsPolicy}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-2">Privileges & RLS Policies Matrix</h3>
        <p className="text-sm text-gray-600">
          Configure CRUD operations and Row Level Security (RLS) policies for each page category. 
          RLS policies will restrict data access based on the role when enabled.
        </p>
      </div>

      {renderPageGroup(
        mainPages, 
        "Main Application Pages", 
        "Core business functionality including dashboard, projects, tasks, and financial pages"
      )}

      {renderPageGroup(
        trakEzyPages, 
        "TrakEzy Navigation Items", 
        "Advanced project tracking and calendar views for enhanced project management"
      )}

      {renderPageGroup(
        configPages, 
        "Configuration Pages", 
        "System configuration and master data management pages"
      )}
    </div>
  );
};

export default PrivilegesMatrix;
