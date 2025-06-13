
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import RoleForm from './roles/RoleForm';
import PrivilegesMatrix from './roles/PrivilegesMatrix';
import LandingPageSelect from './roles/LandingPageSelect';
import { useRolesManagement } from '@/hooks/useRolesManagement';

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

interface RoleDialogProps {
  open: boolean;
  onClose: () => void;
  role: string | null;
  isEditing: boolean;
}

const RoleDialog: React.FC<RoleDialogProps> = ({ open, onClose, role, isEditing }) => {
  const [roleName, setRoleName] = useState('');
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [rlsPolicies, setRlsPolicies] = useState<RLSPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [landingPage, setLandingPage] = useState<string | null>(null);
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const { fetchAvailablePages, updateRoleLandingPage } = useRolesManagement();

  // Updated pages list to include TrakEzy navigation items
  const pages = [
    'dashboard', 
    'clients', 
    'employees', 
    'projects', 
    'tasks', 
    'sprints', 
    'invoices', 
    'payments', 
    'services', 
    'wages',
    'gantt-view',
    'agenda-cal',
    'log-cal'
  ];
  const operations: CrudOperation[] = ['create', 'read', 'update', 'delete'];

  // Map of common role names to standardized values
  const roleMapping: Record<string, string> = {
    'admin': 'admin',
    'administrator': 'admin',
    'manager': 'manager',
    'supervisor': 'manager',
    'teamlead': 'teamlead',
    'team-lead': 'teamlead',
    'team lead': 'teamlead',
    'lead': 'teamlead',
    'associate': 'associate',
    'employee': 'associate',
    'staff': 'associate',
    'worker': 'associate',
    'sales-executive': 'sales-executive',
    'sales executive': 'sales-executive',
    'sales': 'sales-executive',
    'accountant': 'accountant',
    'finance': 'accountant',
    'accounting': 'accountant'
  };

  const getValidRole = (inputRole: string): string => {
    const normalized = inputRole.toLowerCase().trim();
    return roleMapping[normalized] || normalized;
  };

  useEffect(() => {
    if (open) {
      if (isEditing && role) {
        setRoleName(role);
        fetchRoleData(role);
      } else {
        setRoleName('');
        setLandingPage(null);
        setAvailablePages([]);
        initializeDefaultData();
      }
    }
  }, [open, isEditing, role]);

  // Update available pages when privileges change
  useEffect(() => {
    const updateAvailablePages = async () => {
      if (roleName) {
        const validRole = getValidRole(roleName);
        const pages = await fetchAvailablePages(validRole);
        setAvailablePages(pages);
        
        // If current landing page is not in available pages, reset it
        if (landingPage && !pages.includes(landingPage)) {
          setLandingPage(null);
        }
      }
    };

    updateAvailablePages();
  }, [privileges, roleName, fetchAvailablePages]);

  const fetchRoleData = async (roleToFetch: string) => {
    setLoading(true);
    try {
      console.log('Fetching privileges, RLS policies, and landing page for role:', roleToFetch);
      
      // Fetch privileges
      const { data: privilegesData, error: privilegesError } = await supabase
        .from('role_privileges')
        .select('*')
        .eq('role', roleToFetch)
        .order('page_name')
        .order('operation');

      if (privilegesError) {
        console.error('Error fetching privileges:', privilegesError);
        throw privilegesError;
      }
      
      console.log('Fetched privileges:', privilegesData);
      setPrivileges(privilegesData || []);

      // Fetch RLS policies
      const { data: rlsData, error: rlsError } = await supabase
        .from('role_rls_policies')
        .select('*')
        .eq('role', roleToFetch)
        .order('page_name');

      if (rlsError) {
        console.error('Error fetching RLS policies:', rlsError);
        throw rlsError;
      }

      console.log('Fetched RLS policies:', rlsData);
      
      // Initialize RLS policies for each page, using existing data or defaults
      const rlsPolicies: RLSPolicy[] = pages.map(page => {
        const existingPolicy = rlsData?.find(p => p.page_name === page);
        return {
          id: existingPolicy?.id,
          role: roleToFetch,
          page_name: page,
          rls_enabled: existingPolicy?.rls_enabled || false
        };
      });
      setRlsPolicies(rlsPolicies);

      // Fetch landing page from roles table
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('landing_page')
        .eq('role', roleToFetch)
        .single();

      if (roleError && roleError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching role landing page:', roleError);
      } else if (roleData) {
        console.log('Fetched landing page:', roleData.landing_page);
        setLandingPage(roleData.landing_page);
      }

    } catch (error) {
      console.error('Error fetching role data:', error);
      toast.error('Failed to fetch role data');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultData = () => {
    const defaultPrivileges: Privilege[] = [];
    const defaultRlsPolicies: RLSPolicy[] = [];
    
    pages.forEach(page => {
      operations.forEach(operation => {
        defaultPrivileges.push({
          role: 'new-role',
          page_name: page,
          operation,
          allowed: false
        });
      });
      
      defaultRlsPolicies.push({
        role: 'new-role',
        page_name: page,
        rls_enabled: false
      });
    });
    
    setPrivileges(defaultPrivileges);
    setRlsPolicies(defaultRlsPolicies);
  };

  const updatePrivilege = (page: string, operation: CrudOperation, allowed: boolean) => {
    setPrivileges(prev => {
      const updated = prev.map(p => 
        p.page_name === page && p.operation === operation 
          ? { ...p, allowed } 
          : p
      );
      return updated;
    });
  };

  const updateRlsPolicy = (page: string, enabled: boolean) => {
    setRlsPolicies(prev => {
      const updated = prev.map(p => 
        p.page_name === page 
          ? { ...p, rls_enabled: enabled } 
          : p
      );
      return updated;
    });
  };

  const applyRlsPolicies = async () => {
    try {
      console.log('Applying RLS policies to database...');
      const { error } = await supabase.rpc('apply_rls_policies');
      
      if (error) {
        console.error('Error applying RLS policies:', error);
        throw error;
      }
      
      console.log('RLS policies applied successfully');
    } catch (error) {
      console.error('Error applying RLS policies:', error);
      toast.error('Failed to apply RLS policies');
    }
  };

  const handleSave = async () => {
    if (!roleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    const validRole = getValidRole(roleName);
    console.log('Saving role:', validRole, 'from input:', roleName);

    setSaving(true);
    try {
      if (isEditing && role) {
        console.log('Updating existing role privileges, RLS policies, and landing page...');
        
        // Update existing privileges
        for (const privilege of privileges) {
          if (privilege.id) {
            const { error } = await supabase
              .from('role_privileges')
              .update({ 
                allowed: privilege.allowed, 
                updated_at: new Date().toISOString() 
              })
              .eq('id', privilege.id);

            if (error) {
              console.error('Error updating privilege:', privilege.id, error);
              throw error;
            }
          }
        }

        // Update RLS policies
        for (const rlsPolicy of rlsPolicies) {
          if (rlsPolicy.id) {
            // Update existing RLS policy
            const { error } = await supabase
              .from('role_rls_policies')
              .update({ 
                rls_enabled: rlsPolicy.rls_enabled,
                updated_at: new Date().toISOString() 
              })
              .eq('id', rlsPolicy.id);

            if (error) {
              console.error('Error updating RLS policy:', rlsPolicy.id, error);
              throw error;
            }
          } else {
            // Insert new RLS policy
            const { error } = await supabase
              .from('role_rls_policies')
              .insert({
                role: validRole,
                page_name: rlsPolicy.page_name,
                rls_enabled: rlsPolicy.rls_enabled
              });

            if (error) {
              console.error('Error inserting RLS policy:', error);
              throw error;
            }
          }
        }

        // Update landing page in roles table
        await updateRoleLandingPage(validRole, landingPage);

        // Apply the RLS policies to the database
        await applyRlsPolicies();
        
        toast.success('Role updated successfully');
      } else {
        console.log('Creating new role privileges, RLS policies, and landing page...');
        
        // Check if privileges already exist for this role
        const { data: existingPrivileges, error: checkError } = await supabase
          .from('role_privileges')
          .select('*')
          .eq('role', validRole);

        if (checkError) {
          console.error('Error checking existing privileges:', checkError);
          throw checkError;
        }

        if (existingPrivileges && existingPrivileges.length > 0) {
          toast.error(`Role type "${validRole}" already exists. Please edit the existing role instead.`);
          return;
        }

        // Create new role privileges
        const privilegesToInsert = [];
        
        for (const page of pages) {
          for (const operation of operations) {
            const privilege = privileges.find(p => p.page_name === page && p.operation === operation);
            privilegesToInsert.push({
              role: validRole,
              page_name: page,
              operation: operation,
              allowed: privilege?.allowed || false
            });
          }
        }

        const { error: privilegesError } = await supabase
          .from('role_privileges')
          .insert(privilegesToInsert);

        if (privilegesError) {
          console.error('Error inserting privileges:', privilegesError);
          throw privilegesError;
        }

        // Create RLS policies
        const rlsPoliciesToInsert = rlsPolicies.map(policy => ({
          role: validRole,
          page_name: policy.page_name,
          rls_enabled: policy.rls_enabled
        }));

        const { error: rlsError } = await supabase
          .from('role_rls_policies')
          .insert(rlsPoliciesToInsert);

        if (rlsError) {
          console.error('Error inserting RLS policies:', rlsError);
          throw rlsError;
        }

        // Create role with landing page
        const { error: roleError } = await supabase
          .from('roles')
          .insert({
            role: validRole,
            landing_page: landingPage
          });

        if (roleError) {
          console.error('Error inserting role:', roleError);
          throw roleError;
        }

        // Apply the RLS policies to the database
        await applyRlsPolicies();

        toast.success(`Role "${roleName}" created successfully with privileges, RLS policies, and landing page`);
      }

      onClose();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Role: ${role}` : 'Create New Role'}
          </DialogTitle>
          <DialogDescription>
            Configure role permissions, RLS policies, and default landing page for different pages and operations. 
            This includes main pages, TrakEzy navigation items, and configuration pages.
            RLS policies will be applied to the database when enabled, restricting data access based on the role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <RoleForm
            roleName={roleName}
            onRoleNameChange={setRoleName}
            isEditing={isEditing}
            getValidRole={getValidRole}
          />

          <LandingPageSelect
            roleName={roleName}
            currentLandingPage={landingPage}
            availablePages={availablePages}
            onLandingPageChange={setLandingPage}
            disabled={!roleName || loading}
          />

          <PrivilegesMatrix
            pages={pages}
            operations={operations}
            privileges={privileges}
            rlsPolicies={rlsPolicies}
            onUpdatePrivilege={updatePrivilege}
            onUpdateRlsPolicy={updateRlsPolicy}
            loading={loading}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleDialog;
