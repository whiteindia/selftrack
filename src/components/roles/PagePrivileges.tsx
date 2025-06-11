
import React from 'react';
import PrivilegeRow from './PrivilegeRow';
import { Checkbox } from '@/components/ui/checkbox';
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

interface PagePrivilegesProps {
  page: string;
  operations: CrudOperation[];
  privileges: Privilege[];
  rlsPolicy?: RLSPolicy;
  onUpdatePrivilege: (page: string, operation: CrudOperation, allowed: boolean) => void;
  onUpdateRlsPolicy: (page: string, enabled: boolean) => void;
}

const PagePrivileges: React.FC<PagePrivilegesProps> = ({ 
  page, 
  operations, 
  privileges, 
  rlsPolicy,
  onUpdatePrivilege,
  onUpdateRlsPolicy
}) => {
  const getPrivilege = (operation: CrudOperation) => {
    return privileges.find(p => p.page_name === page && p.operation === operation);
  };

  const handleRlsPolicyChange = (checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;
    console.log(`RLS policy changed for ${page}:`, isChecked);
    onUpdateRlsPolicy(page, isChecked);
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-md font-semibold capitalize">{page}</h4>
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={rlsPolicy?.rls_enabled || false}
            onCheckedChange={handleRlsPolicyChange}
          />
          <label className="text-sm font-medium text-blue-600">
            Enable RLS Policy
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b font-medium">Operation</th>
              <th className="text-center p-2 border-b font-medium">Allowed</th>
            </tr>
          </thead>
          <tbody>
            {operations.map(operation => {
              const privilege = getPrivilege(operation);
              return (
                <PrivilegeRow
                  key={`${page}-${operation}`}
                  operation={operation}
                  allowed={privilege?.allowed || false}
                  onToggle={(allowed) => onUpdatePrivilege(page, operation, allowed)}
                  page={page}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {rlsPolicy?.rls_enabled && (
        <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
          <p className="text-sm text-blue-700">
            <strong>RLS Policy Active:</strong> Database-level Row Level Security is now enforced for this page. 
            Data access will be restricted based on this role's permissions and user context.
          </p>
        </div>
      )}
    </div>
  );
};

export default PagePrivileges;
