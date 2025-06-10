
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

interface RoleDialogProps {
  open: boolean;
  onClose: () => void;
  role: string | null;
  isEditing: boolean;
}

const RoleDialog: React.FC<RoleDialogProps> = ({ open, onClose, role, isEditing }) => {
  const [roleName, setRoleName] = useState('');
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
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
        fetchRolePrivileges(role);
      } else {
        setRoleName('');
        initializeDefaultPrivileges();
      }
    }
  }, [open, isEditing, role]);

  const fetchRolePrivileges = async (roleToFetch: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_privileges')
        .select('*')
        .eq('role', roleToFetch)
        .order('page_name')
        .order('operation');

      if (error) throw error;
      setPrivileges(data || []);
    } catch (error) {
      console.error('Error fetching privileges:', error);
      toast.error('Failed to fetch role privileges');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPrivileges = () => {
    const defaultPrivileges: Privilege[] = [];
    pages.forEach(page => {
      operations.forEach(operation => {
        defaultPrivileges.push({
          role: 'associate',
          page_name: page,
          operation,
          allowed: false
        });
      });
    });
    setPrivileges(defaultPrivileges);
  };

  const updatePrivilege = (page: string, operation: CrudOperation, allowed: boolean) => {
    console.log('Updating privilege:', { page, operation, allowed });
    setPrivileges(prev => {
      const updated = prev.map(p => 
        p.page_name === page && p.operation === operation 
          ? { ...p, allowed } 
          : p
      );
      console.log('Updated privileges:', updated.filter(p => p.page_name === page));
      return updated;
    });
  };

  const handleSave = async () => {
    if (!roleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    const validRole = getValidRole(roleName);

    setSaving(true);
    try {
      if (isEditing && role) {
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

            if (error) throw error;
          }
        }
        toast.success('Role updated successfully');
      } else {
        // First, check if privileges already exist for this role
        const { data: existingPrivileges, error: checkError } = await supabase
          .from('role_privileges')
          .select('*')
          .eq('role', validRole);

        if (checkError) throw checkError;

        if (existingPrivileges && existingPrivileges.length > 0) {
          toast.error(`Role type "${validRole}" already exists. Please edit the existing role instead.`);
          return;
        }

        // Create new role privileges
        const privilegesToInsert = privileges.map(p => ({
          role: validRole,
          page_name: p.page_name,
          operation: p.operation,
          allowed: p.allowed
        }));

        const { error } = await supabase
          .from('role_privileges')
          .insert(privilegesToInsert);

        if (error) throw error;
        toast.success(`Role "${roleName}" created successfully (mapped to ${validRole})`);
      }

      onClose();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Role: ${role}` : 'Create New Role'}
          </DialogTitle>
          <DialogDescription>
            Configure role permissions for different pages and operations. 
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
            onUpdatePrivilege={updatePrivilege}
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
