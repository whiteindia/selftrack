
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
        console.log('No user role found, setting loading to false');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching privileges for role:', userRole);
        
        const { data, error } = await supabase
          .from('role_privileges')
          .select('page_name, operation, allowed')
          .eq('role', userRole);

        if (error) {
          console.error('Error fetching privileges:', error);
          setPrivileges([]);
        } else {
          console.log('Privileges fetched for role', userRole, ':', data);
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
    const hasAccess = readPrivilege?.allowed || false;
    console.log(`Page access check for ${pageName}:`, hasAccess, 'Role:', userRole);
    return hasAccess;
  };

  const hasOperationAccess = (pageName: string, operation: 'create' | 'read' | 'update' | 'delete') => {
    // Find the specific privilege for this page and operation
    const privilege = privileges.find(
      p => p.page_name === pageName && p.operation === operation
    );
    
    // If no privilege record exists, deny access (don't default to true)
    const hasAccess = privilege?.allowed === true;
    console.log(`Operation access check for ${pageName}-${operation}:`, hasAccess, 'Privilege found:', !!privilege, 'Role:', userRole);
    return hasAccess;
  };

  return {
    privileges,
    loading,
    hasPageAccess,
    hasOperationAccess
  };
};
