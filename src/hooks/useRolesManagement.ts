
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Role {
  id: string;
  role: string;
  landing_page: string | null;
  created_at: string;
  updated_at: string;
}

interface AvailablePage {
  page_name: string;
}

export const useRolesManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    try {
      console.log('Fetching roles with landing pages...');
      
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('role');

      if (error) {
        console.error('Error fetching roles:', error);
        throw error;
      }

      console.log('Roles fetched:', data);
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePages = async (roleName: string): Promise<string[]> => {
    try {
      console.log('Fetching available pages for role:', roleName);
      
      const { data, error } = await supabase
        .rpc('get_role_available_pages', { role_name: roleName });

      if (error) {
        console.error('Error fetching available pages:', error);
        throw error;
      }

      const pages = data?.map((item: AvailablePage) => item.page_name) || [];
      console.log('Available pages for', roleName, ':', pages);
      return pages;
    } catch (error) {
      console.error('Error fetching available pages:', error);
      return [];
    }
  };

  const updateRoleLandingPage = async (roleName: string, landingPage: string | null) => {
    try {
      console.log('Updating landing page for role:', roleName, 'to:', landingPage);
      
      const { error } = await supabase
        .from('roles')
        .upsert({
          role: roleName,
          landing_page: landingPage,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'role'
        });

      if (error) {
        console.error('Error updating role landing page:', error);
        throw error;
      }

      console.log('Landing page updated successfully');
      toast.success('Landing page updated successfully');
      await fetchRoles(); // Refresh the roles data
    } catch (error) {
      console.error('Error updating role landing page:', error);
      toast.error('Failed to update landing page');
    }
  };

  const createRole = async (roleName: string, landingPage: string | null = null) => {
    try {
      console.log('Creating new role:', roleName, 'with landing page:', landingPage);
      
      const { error } = await supabase
        .from('roles')
        .insert({
          role: roleName,
          landing_page: landingPage
        });

      if (error) {
        console.error('Error creating role:', error);
        throw error;
      }

      console.log('Role created successfully');
      toast.success('Role created successfully');
      await fetchRoles(); // Refresh the roles data
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    }
  };

  const deleteRole = async (roleName: string) => {
    try {
      console.log('Deleting role:', roleName);
      
      // Delete from roles table
      const { error: rolesError } = await supabase
        .from('roles')
        .delete()
        .eq('role', roleName);

      if (rolesError) {
        console.error('Error deleting from roles table:', rolesError);
        throw rolesError;
      }

      // Delete all privileges for this role
      const { error: privilegesError } = await supabase
        .from('role_privileges')
        .delete()
        .eq('role', roleName);

      if (privilegesError) {
        console.error('Error deleting role privileges:', privilegesError);
        throw privilegesError;
      }

      console.log('Role deleted successfully');
      toast.success('Role deleted successfully');
      await fetchRoles(); // Refresh the roles data
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return {
    roles,
    loading,
    fetchRoles,
    fetchAvailablePages,
    updateRoleLandingPage,
    createRole,
    deleteRole
  };
};
