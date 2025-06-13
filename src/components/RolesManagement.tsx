
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Home } from 'lucide-react';
import RoleDialog from './RoleDialog';
import { useRolesManagement } from '@/hooks/useRolesManagement';

interface RoleWithDetails {
  role: string;
  privilegeCount: number;
  totalEntries: number;
  landingPage: string | null;
}

const RolesManagement = () => {
  const [rolesWithDetails, setRolesWithDetails] = useState<RoleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { roles, deleteRole } = useRolesManagement();

  useEffect(() => {
    fetchRolesWithDetails();
  }, [roles]);

  const fetchRolesWithDetails = async () => {
    try {
      console.log('Fetching roles with details...');
      
      // Get unique roles from role_privileges table with counts
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

          // Get landing page for this role
          const { data: roleInfo, error: roleInfoError } = await supabase
            .from('roles')
            .select('landing_page')
            .eq('role', role)
            .single();

          if (roleInfoError && roleInfoError.code !== 'PGRST116') {
            console.error(`Error fetching landing page for role ${role}:`, roleInfoError);
          }

          console.log(`Role ${role}: ${allowedCount} allowed out of ${totalCount} total entries, landing page: ${roleInfo?.landing_page || 'none'}`);

          return {
            role,
            privilegeCount: allowedCount || 0,
            totalEntries: totalCount || 0,
            landingPage: roleInfo?.landing_page || null
          };
        })
      );

      console.log('Final role stats:', roleStats);
      setRolesWithDetails(roleStats);
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

    await deleteRole(role);
    fetchRolesWithDetails(); // Refresh the data
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedRole(null);
    setIsEditing(false);
    fetchRolesWithDetails();
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

  const getPageLabel = (pageName: string): string => {
    const labels: Record<string, string> = {
      'dashboard': 'Dashboard',
      'clients': 'Clients',
      'employees': 'Employees',
      'projects': 'Projects',
      'tasks': 'Tasks',
      'sprints': 'Sprints',
      'invoices': 'Invoices',
      'payments': 'Payments',
      'services': 'Services',
      'wages': 'Wages',
      'gantt-view': 'Gantt View',
      'agenda-cal': 'Agenda Calendar',
      'log-cal': 'Log Calendar'
    };
    return labels[pageName] || pageName.charAt(0).toUpperCase() + pageName.slice(1);
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
                Manage roles, their permissions, and default landing pages across the system. You can create any custom role name.
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
            {rolesWithDetails.map((roleData) => (
              <Card key={roleData.role} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg capitalize">{roleData.role}</CardTitle>
                      <CardDescription>
                        {roleData.privilegeCount} privileges assigned
                      </CardDescription>
                      {roleData.landingPage && (
                        <div className="flex items-center gap-1 mt-2">
                          <Home className="h-3 w-3 text-blue-600" />
                          <Badge variant="secondary" className="text-xs">
                            {getPageLabel(roleData.landingPage)}
                          </Badge>
                        </div>
                      )}
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
                  {!roleData.landingPage && (
                    <div className="text-xs text-gray-400 mt-2">
                      No custom landing page set
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
