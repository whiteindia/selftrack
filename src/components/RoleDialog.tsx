
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

  const pages = ['dashboard', 'clients', 'employees', 'projects', 'tasks', 'sprints', 'invoices', 'payments', 'services', 'wages'];
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
        initializeDefaultData();
      }
    }
  }, [open, isEditing, role]);

  const fetchRoleData = async (roleToFetch: string) => {
    setLoading(true);
    try {
      console.log('Fetching privileges for role:', roleToFetch);
      
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

      // Initialize RLS policies for each page
      const rlsData: RLSPolicy[] = pages.map(page => ({
        role: roleToFetch,
        page_name: page,
        rls_enabled: false
      }));
      setRlsPolicies(rlsData);
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
        console.log('Updating existing role privileges...');
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
        toast.success('Role updated successfully');
      } else {
        console.log('Creating new role privileges...');
        
        // First, check if privileges already exist for this role
        const { data: existingPrivileges, error: checkError } = await supabase
          .from('role_privileges')
          .select('*')
          .eq('role', validRole);

        if (checkError) {
          console.error('Error checking existing privileges:', checkError);
          throw checkError;
        }

        console.log('Existing privileges check:', existingPrivileges);

        if (existingPrivileges && existingPrivileges.length > 0) {
          toast.error(`Role type "${validRole}" already exists. Please edit the existing role instead.`);
          return;
        }

        // Create new role privileges - ensure we create entries for all page/operation combinations
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

        console.log('Inserting privileges:', privilegesToInsert.length, 'entries');
        console.log('Sample privilege:', privilegesToInsert[0]);

        const { data: insertedData, error } = await supabase
          .from('role_privileges')
          .insert(privilegesToInsert)
          .select('*');

        if (error) {
          console.error('Error inserting privileges:', error);
          throw error;
        }

        console.log('Successfully inserted privileges:', insertedData?.length, 'rows');
        toast.success(`Role "${roleName}" created successfully with ${insertedData?.length} privilege entries`);
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
            Configure role permissions and RLS policies for different pages and operations. 
            You can create any role name - common ones include: admin, manager, teamlead, associate, accountant, sales-executive
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <RoleForm
            roleName={roleName}
            onRoleNameChange={setRoleName}
            isEditing={isEditing}
            getValidRole={getValidRole}
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
