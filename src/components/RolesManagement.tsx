
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import RoleDialog from './RoleDialog';

interface RoleWithPrivileges {
  role: string;
  privilegeCount: number;
}

const RolesManagement = () => {
  const [roles, setRoles] = useState<RoleWithPrivileges[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      console.log('Fetching roles...');
      
      // Get unique roles from role_privileges table
      const { data: roleData, error } = await supabase
        .from('role_privileges')
        .select('role')
        .order('role');

      if (error) {
        console.error('Error fetching roles:', error);
        throw error;
      }

      // Get unique roles and count privileges for each
      const uniqueRoles = [...new Set(roleData?.map(r => r.role) || [])];
      
      const roleStats = await Promise.all(
        uniqueRoles.map(async (role: string) => {
          const { count, error } = await supabase
            .from('role_privileges')
            .select('*', { count: 'exact' })
            .eq('role', role)
            .eq('allowed', true);

          if (error) {
            console.error(`Error fetching privileges for role ${role}:`, error);
            throw error;
          }

          console.log(`Role ${role} has ${count} privileges`);

          return {
            role,
            privilegeCount: count || 0
          };
        })
      );

      console.log('Role stats:', roleStats);
      setRoles(roleStats);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = () => {
    setSelectedRole(null);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditRole = (role: string) => {
    setSelectedRole(role);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteRole = async (role: string) => {
    if (!confirm(`Are you sure you want to delete the ${role} role and all its privileges?`)) {
      return;
    }

    try {
      // Delete all privileges for this role
      const { error } = await supabase
        .from('role_privileges')
        .delete()
        .eq('role', role);

      if (error) throw error;

      toast.success(`${role} role deleted successfully`);
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedRole(null);
    setIsEditing(false);
    fetchRoles();
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, string> = {
      'admin': 'Full system access and management',
      'manager': 'Project and team management capabilities',
      'teamlead': 'Task assignment and team coordination',
      'associate': 'Task execution and time logging',
      'accountant': 'Financial management and reporting',
      'sales-executive': 'Sales and client relationship management'
    };
    return descriptions[role] || 'Custom role with specific permissions';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading roles...</div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                Manage roles and their permissions across the system. You can create any custom role name.
              </CardDescription>
            </div>
            <Button onClick={handleAddRole}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((roleData) => (
              <Card key={roleData.role} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg capitalize">{roleData.role}</CardTitle>
                      <CardDescription>
                        {roleData.privilegeCount} privileges assigned
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRole(roleData.role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRole(roleData.role)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-gray-600">
                    {getRoleDescription(roleData.role)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <RoleDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        role={selectedRole}
        isEditing={isEditing}
      />
    </>
  );
};

export default RolesManagement;
