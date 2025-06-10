
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

interface PrivilegesMatrixProps {
  pages: string[];
  operations: CrudOperation[];
  privileges: Privilege[];
  onUpdatePrivilege: (page: string, operation: CrudOperation, allowed: boolean) => void;
  loading: boolean;
}

const PrivilegesMatrix: React.FC<PrivilegesMatrixProps> = ({ 
  pages, 
  operations, 
  privileges, 
  onUpdatePrivilege, 
  loading 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading privileges...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Privileges Matrix</h3>
      {pages.map(page => (
        <PagePrivileges
          key={page}
          page={page}
          operations={operations}
          privileges={privileges}
          onUpdatePrivilege={onUpdatePrivilege}
        />
      ))}
    </div>
  );
};

export default PrivilegesMatrix;
