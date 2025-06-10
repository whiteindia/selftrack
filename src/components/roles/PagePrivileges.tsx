
import React from 'react';
import PrivilegeRow from './PrivilegeRow';
import type { Database } from '@/integrations/supabase/types';

type CrudOperation = Database['public']['Enums']['crud_operation'];

interface Privilege {
  id?: string;
  role: string;
  page_name: string;
  operation: CrudOperation;
  allowed: boolean;
}

interface PagePrivilegesProps {
  page: string;
  operations: CrudOperation[];
  privileges: Privilege[];
  onUpdatePrivilege: (page: string, operation: CrudOperation, allowed: boolean) => void;
}

const PagePrivileges: React.FC<PagePrivilegesProps> = ({ 
  page, 
  operations, 
  privileges, 
  onUpdatePrivilege 
}) => {
  const getPrivilege = (operation: CrudOperation) => {
    return privileges.find(p => p.page_name === page && p.operation === operation);
  };

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-md font-semibold mb-4 capitalize">{page}</h4>
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
    </div>
  );
};

export default PagePrivileges;
