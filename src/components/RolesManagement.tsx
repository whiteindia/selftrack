
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import RoleDialog from './RoleDialog';

interface RoleWithPrivileges {
  role: string;
  privilegeCount: number;
  totalEntries: number; // New field to show total entries in DB
}

const RolesManagement = () => {
  const [roles, setRoles] = useState<RoleWithPrivileges[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      console.log('Fetching roles...');
      
      // Get all role_privileges data for debugging
      const { data: allPrivileges, error: allError } = await supabase
        .from('role_privileges')
        .select('*')
        .order('role')
        .order('page_name')
        .order('operation');

      if (allError) {
        console.error('Error fetching all privileges:', allError);
        throw allError;
      }

      console.log('Total privileges in database:', allPrivileges?.length);
      console.log('Sample privileges:', allPrivileges?.slice(0, 5));

      // Set debug info
      setDebugInfo({
        totalEntries: allPrivileges?.length || 0,
        uniqueRoles: [...new Set(allPrivileges?.map(p => p.role) || [])],
        sampleData: allPrivileges?.slice(0, 10) || []
      });

      // Get unique roles from role_privileges table
      const { data: roleData, error } = await supabase
        .from('role_privileges')
        .select('role')
        .order('role');

      if (error) {
        console.error('Error fetching roles:', error);
        throw error;
      }

      console.log('Raw role data:', roleData?.length, 'entries');

      // Get unique roles and count privileges for each
      const uniqueRoles = [...new Set(roleData?.map(r => r.role) || [])];
      console.log('Unique roles found:', uniqueRoles);
      
      const roleStats = await Promise.all(
        uniqueRoles.map(async (role: string) => {
          // Count total entries for this role
          const { count: totalCount, error: totalError } = await supabase
            .from('role_privileges')
            .select('*', { count: 'exact' })
            .eq('role', role);

          if (totalError) {
            console.error(`Error fetching total count for role ${role}:`, totalError);
            throw totalError;
          }

          // Count allowed privileges for this role
          const { count: allowedCount, error: allowedError } = await supabase
            .from('role_privileges')
            .select('*', { count: 'exact' })
            .eq('role', role)
            .eq('allowed', true);

          if (allowedError) {
            console.error(`Error fetching allowed privileges for role ${role}:`, allowedError);
            throw allowedError;
          }

          console.log(`Role ${role}: ${allowedCount} allowed out of ${totalCount} total entries`);

          return {
            role,
            privilegeCount: allowedCount || 0,
            totalEntries: totalCount || 0
          };
        })
      );

      console.log('Final role stats:', roleStats);
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
      console.log('Deleting role:', role);
      
      // Delete all privileges for this role
      const { error } = await supabase
        .from('role_privileges')
        .delete()
        .eq('role', role);

      if (error) {
        console.error('Error deleting role:', error);
        throw error;
      }

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
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchRoles}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleAddRole}>
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Debug Information */}
          {debugInfo && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Database Debug Info:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>Total privilege entries in database: {debugInfo.totalEntries}</p>
                <p>Unique roles found: {debugInfo.uniqueRoles.join(', ')}</p>
                <p>Expected entries per role: 40 (10 pages × 4 operations)</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((roleData) => (
              <Card key={roleData.role} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg capitalize">{roleData.role}</CardTitle>
                      <CardDescription>
                        {roleData.privilegeCount} privileges assigned
                        <br />
                        <span className="text-xs text-gray-500">
                          ({roleData.totalEntries} total entries in DB)
                        </span>
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
                  {roleData.totalEntries !== 40 && (
                    <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                      Warning: Expected 40 entries, found {roleData.totalEntries}
                    </div>
                  )}
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
