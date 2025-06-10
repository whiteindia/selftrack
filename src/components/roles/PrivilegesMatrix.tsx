
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

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Privileges & RLS Policies Matrix</h3>
      <p className="text-sm text-gray-600">
        Configure CRUD operations and Row Level Security (RLS) policies for each page. 
        RLS policies will restrict data access based on the role when enabled.
      </p>
      {pages.map(page => (
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
  );
};

export default PrivilegesMatrix;
