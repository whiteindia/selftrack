
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
      console.log('=== usePrivileges fetchPrivileges START ===');
      console.log('User:', user?.email);
      console.log('UserRole from AuthContext:', userRole);
      
      if (!user) {
        console.log('No user found, setting loading to false');
        setLoading(false);
        return;
      }

      // First, let's check what's in the user_roles table
      console.log('🔍 Step 1: Checking user_roles table for user:', user.id);
      const { data: userRoleData, error: userRoleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('user_roles query result:', { data: userRoleData, error: userRoleError });

      // Check if user has a role assigned
      if (!userRole) {
        console.log('❌ No user role found in AuthContext');
        setPrivileges([]);
        setLoading(false);
        return;
      }

      // Now let's check what roles exist in the roles table
      console.log('🔍 Step 2: Checking roles table');
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*');
      
      console.log('roles table data:', { data: rolesData, error: rolesError });

      // Check if the role exists in the roles table
      const roleExists = rolesData?.find(r => r.role === userRole);
      console.log('Does role exist in roles table?', roleExists);

      // Now let's check the role_privileges table
      console.log('🔍 Step 3: Checking role_privileges table for role:', userRole);
      const { data: allPrivilegesData, error: allPrivilegesError } = await supabase
        .from('role_privileges')
        .select('*');
      
      console.log('ALL role_privileges data:', { data: allPrivilegesData, error: allPrivilegesError });

      // Filter for the specific role
      const roleSpecificPrivileges = allPrivilegesData?.filter(p => p.role === userRole);
      console.log('Role-specific privileges:', roleSpecificPrivileges);

      try {
        console.log('✅ Fetching privileges for role:', userRole);
        
        const { data, error } = await supabase
          .from('role_privileges')
          .select('page_name, operation, allowed')
          .eq('role', userRole);

        if (error) {
          console.error('❌ Error fetching privileges:', error);
          setPrivileges([]);
        } else {
          console.log('✅ Privileges fetched for role', userRole, ':', data);
          console.log('Total privileges found:', data?.length || 0);
          
          // Log specific invoices privileges
          const invoicesPrivileges = data?.filter(p => p.page_name === 'invoices') || [];
          console.log('Invoices specific privileges:', invoicesPrivileges);
          
          setPrivileges(data || []);
        }
      } catch (error) {
        console.error('❌ Exception while fetching privileges:', error);
        setPrivileges([]);
      } finally {
        setLoading(false);
        console.log('=== usePrivileges fetchPrivileges END ===');
      }
    };

    fetchPrivileges();
  }, [userRole, user]);

  const hasPageAccess = (pageName: string) => {
    console.log(`=== hasPageAccess check for ${pageName} ===`);
    console.log('User role:', userRole);
    console.log('User email:', user?.email);
    console.log('All privileges:', privileges);
    
    // Admin and yugandhar@whiteindia.in have full access
    if (userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in') {
      console.log(`✅ Full access granted for ${pageName} to admin/superuser`);
      return true;
    }

    // If no role, deny access
    if (!userRole) {
      console.log(`❌ No role assigned, denying access to ${pageName}`);
      return false;
    }

    // Check if user has read access to the page with allowed=true
    const readPrivilege = privileges.find(
      p => p.page_name === pageName && p.operation === 'read' && p.allowed === true
    );
    const hasAccess = !!readPrivilege;
    console.log(`Page access check for ${pageName}:`, hasAccess, 'Role:', userRole, 'Read privilege found:', readPrivilege);
    console.log(`Specific privilege search: looking for page_name='${pageName}', operation='read', allowed=true`);
    console.log(`Matching privileges:`, privileges.filter(p => p.page_name === pageName));
    console.log(`=== End hasPageAccess ===`);
    return hasAccess;
  };

  const hasOperationAccess = (pageName: string, operation: 'create' | 'read' | 'update' | 'delete') => {
    console.log(`=== hasOperationAccess check for ${pageName}-${operation} ===`);
    console.log('User role:', userRole);
    
    // Admin and yugandhar@whiteindia.in have full access
    if (userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in') {
      console.log(`✅ Full operation access granted for ${pageName}-${operation} to admin/superuser`);
      return true;
    }

    // If no role, deny access
    if (!userRole) {
      console.log(`❌ No role assigned, denying ${operation} access to ${pageName}`);
      return false;
    }

    // Find the specific privilege for this page and operation with allowed=true
    const privilege = privileges.find(
      p => p.page_name === pageName && p.operation === operation && p.allowed === true
    );
    
    const hasAccess = !!privilege;
    console.log(`Operation access check for ${pageName}-${operation}:`, hasAccess, 'Privilege found:', privilege, 'Role:', userRole);
    console.log(`=== End hasOperationAccess ===`);
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
