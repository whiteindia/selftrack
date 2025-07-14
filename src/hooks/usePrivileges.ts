
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
      
      if (!user) {
        setLoading(false);
        return;
      }

      // First, let's check what's in the user_roles table
      
      const { data: userRoleData, error: userRoleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
      
      // Check if user has a role assigned
      if (!userRole) {
        setPrivileges([]);
        setLoading(false);
        return;
      }

      // Now let's check what roles exist in the roles table
      
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*');
      
      
      // Check if the role exists in the roles table
      const roleExists = rolesData?.find(r => r.role === userRole);
      

      // Now let's check the role_privileges table
      
      const { data: allPrivilegesData, error: allPrivilegesError } = await supabase
        .from('role_privileges')
        .select('*');
      
      
      // Filter for the specific role
      const roleSpecificPrivileges = allPrivilegesData?.filter(p => p.role === userRole);
      

      try {
        
        const { data, error } = await supabase
          .from('role_privileges')
          .select('page_name, operation, allowed')
          .eq('role', userRole);

        if (error) {
          setPrivileges([]);
        } else {
          
          setPrivileges(data || []);
        }
      } catch (error) {
        setPrivileges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrivileges();
  }, [userRole, user]);

  const hasPageAccess = (pageName: string) => {
    
    // Admin and yugandhar@whiteindia.in have full access
    if (userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in') {
      return true;
    }

    // If no role, deny access
    if (!userRole) {
      return false;
    }

    // Check if user has read access to the page with allowed=true
    const readPrivilege = privileges.find(
      p => p.page_name === pageName && p.operation === 'read' && p.allowed === true
    );
    const hasAccess = !!readPrivilege;
    return hasAccess;
  };

  const hasOperationAccess = (pageName: string, operation: 'create' | 'read' | 'update' | 'delete') => {
    
    // Admin and yugandhar@whiteindia.in have full access
    if (userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in') {
      return true;
    }

    // If no role, deny access
    if (!userRole) {
      return false;
    }

    // Find the specific privilege for this page and operation with allowed=true
    const privilege = privileges.find(
      p => p.page_name === pageName && p.operation === operation && p.allowed === true
    );
    
    const hasAccess = !!privilege;
    return hasAccess;
  };

  // Updated function to check if RLS-based filtering is active
  const isRlsFilteringActive = (pageName: string) => {
    
    // RLS filtering is active for Manager role (not admin)
    if (userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in') {
      return false;
    }
    
    // RLS filtering is active for Manager role on these pages
    const isActive = userRole === 'manager' && ['projects', 'sprints', 'tasks'].includes(pageName);
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
