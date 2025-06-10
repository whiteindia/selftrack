
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Privilege {
  page_name: string;
  operation: 'create' | 'read' | 'update' | 'delete';
  allowed: boolean;
}

export const usePrivileges = () => {
  const { userRole } = useAuth();
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrivileges = async () => {
      if (!userRole) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('role_privileges')
          .select('page_name, operation, allowed')
          .eq('role', userRole);

        if (error) {
          console.error('Error fetching privileges:', error);
          setPrivileges([]);
        } else {
          setPrivileges(data || []);
        }
      } catch (error) {
        console.error('Error fetching privileges:', error);
        setPrivileges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrivileges();
  }, [userRole]);

  const hasPageAccess = (pageName: string) => {
    // Check if user has read access to the page
    const readPrivilege = privileges.find(
      p => p.page_name === pageName && p.operation === 'read'
    );
    return readPrivilege?.allowed || false;
  };

  const hasOperationAccess = (pageName: string, operation: 'create' | 'read' | 'update' | 'delete') => {
    const privilege = privileges.find(
      p => p.page_name === pageName && p.operation === operation
    );
    return privilege?.allowed || false;
  };

  return {
    privileges,
    loading,
    hasPageAccess,
    hasOperationAccess
  };
};
