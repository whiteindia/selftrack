
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';

interface Privilege {
  page_name: string;
  operation: 'create' | 'read' | 'update' | 'delete';
  allowed: boolean;
}

export const usePrivileges = () => {
  const { userRole, user } = useAuth();
  const { employeeId } = useCurrentEmployee();
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
    // Admin and yugandhar@whiteindia.in have full access
    if (userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in') {
      console.log(`Full access granted for ${pageName} to admin/superuser`);
      return true;
    }

    // Check if user has read access to the page
    const readPrivilege = privileges.find(
      p => p.page_name === pageName && p.operation === 'read' && p.allowed === true
    );
    const hasAccess = !!readPrivilege;
    console.log(`Page access check for ${pageName}:`, hasAccess, 'Role:', userRole, 'Privilege found:', !!readPrivilege);
    return hasAccess;
  };

  const hasOperationAccess = (pageName: string, operation: 'create' | 'read' | 'update' | 'delete') => {
    // Admin and yugandhar@whiteindia.in have full access
    if (userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in') {
      console.log(`Full operation access granted for ${pageName}-${operation} to admin/superuser`);
      return true;
    }

    // Find the specific privilege for this page and operation
    const privilege = privileges.find(
      p => p.page_name === pageName && p.operation === operation && p.allowed === true
    );
    
    const hasAccess = !!privilege;
    console.log(`Operation access check for ${pageName}-${operation}:`, hasAccess, 'Privilege found:', !!privilege, 'Role:', userRole);
    return hasAccess;
  };

  // Updated function to check if RLS-based filtering is active
  const isRlsFilteringActive = (pageName: string) => {
    console.log(`=== isRlsFilteringActive for ${pageName} ===`);
    console.log('User role:', userRole);
    console.log('User email:', user?.email);
    
    // RLS filtering is active for Manager role (not admin)
    if (userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in') {
      console.log('User is admin/superuser - no RLS filtering applied');
      return false;
    }
    
    // RLS filtering is active for Manager role on these pages
    const isActive = userRole === 'manager' && ['projects', 'sprints', 'tasks'].includes(pageName);
    console.log(`RLS filtering active: ${isActive} (role: ${userRole}, page: ${pageName})`);
    console.log(`=== End isRlsFilteringActive ===`);
    return isActive;
  };

  return {
    privileges,
    loading,
    hasPageAccess,
    hasOperationAccess,
    isRlsFilteringActive,
    userRole,
    userId: user?.id,
    employeeId
  };
};
