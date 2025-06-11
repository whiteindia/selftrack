
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Database } from '@/integrations/supabase/types';

type CrudOperation = Database['public']['Enums']['crud_operation'];

interface PrivilegeRowProps {
  operation: CrudOperation;
  allowed: boolean;
  onToggle: (allowed: boolean) => void;
  page: string;
}

const PrivilegeRow: React.FC<PrivilegeRowProps> = ({ operation, allowed, onToggle, page }) => {
  const handleCheckedChange = (checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;
    console.log(`Privilege row checkbox changed for ${page}-${operation}:`, isChecked);
    onToggle(isChecked);
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="p-2 border-b font-medium capitalize">{operation}</td>
      <td className="p-2 border-b text-center">
        <Checkbox
          checked={allowed}
          onCheckedChange={handleCheckedChange}
        />
      </td>
    </tr>
  );
};

export default PrivilegeRow;
