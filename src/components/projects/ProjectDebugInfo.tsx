
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface ProjectDebugInfoProps {
  userRole: string;
  employeeId: string | undefined;
  userId: string | undefined;
}

const ProjectDebugInfo: React.FC<ProjectDebugInfoProps> = ({ userRole, employeeId, userId }) => {
  const { data: debugInfo } = useQuery({
    queryKey: ['project-debug', userId, employeeId],
    queryFn: async () => {
      if (userRole !== 'manager') return null;

      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get employee record
      const { data: employee } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('email', user?.email || '')
        .single();

      // Get projects with assignee info using the new foreign key relationship
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          assignee_id,
          assignee_employee_id,
          clients(name),
          assignee_employee:employees!assignee_employee_id(id, name, email, role)
        `);

      // Check migration status - projects using old assignee_id vs new assignee_employee_id
      const oldAssigneeProjects = projects?.filter(p => 
        p.assignee_id && !p.assignee_employee_id
      );

      const newAssigneeProjects = projects?.filter(p => 
        p.assignee_employee_id
      );

      // Check if there are projects where assignee_id matches username pattern
      const usernameProjects = projects?.filter(p => 
        p.assignee_id && !p.assignee_id.includes('-') // Not a UUID
      );

      return {
        userEmail: user?.email,
        userUuid: user?.id,
        employeeRecord: employee,
        totalProjects: projects?.length || 0,
        oldAssigneeProjects: oldAssigneeProjects || [],
        newAssigneeProjects: newAssigneeProjects || [],
        usernameAssignedProjects: usernameProjects || [],
        allProjects: projects?.slice(0, 3) // Show first 3 for debugging
      };
    },
    enabled: userRole === 'manager' && process.env.NODE_ENV === 'development'
  });

  if (userRole !== 'manager' || !debugInfo) return null;

  return (
    <Alert className="mb-6 bg-yellow-50 border-yellow-200">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <strong>Project Assignment Migration Debug:</strong>
        <div className="mt-2 space-y-1 text-sm">
          <div><strong>User Email:</strong> {debugInfo.userEmail}</div>
          <div><strong>User UUID:</strong> {debugInfo.userUuid}</div>
          <div><strong>Employee Record:</strong> {debugInfo.employeeRecord ? 
            `ID: ${debugInfo.employeeRecord.id}, Name: ${debugInfo.employeeRecord.name}` : 
            'Not found!'
          }</div>
          <div><strong>Total Projects:</strong> {debugInfo.totalProjects}</div>
          
          <div className="mt-2">
            <strong>Migration Status:</strong>
            <div className="ml-2">
              • Projects using new assignee_employee_id: <span className="text-green-600">{debugInfo.newAssigneeProjects.length}</span>
            </div>
            <div className="ml-2">
              • Projects still using old assignee_id: <span className="text-orange-600">{debugInfo.oldAssigneeProjects.length}</span>
            </div>
          </div>

          {debugInfo.usernameAssignedProjects.length > 0 && (
            <div className="mt-2">
              <strong>Projects with username assignments (need migration):</strong>
              {debugInfo.usernameAssignedProjects.map(p => (
                <div key={p.id} className="ml-2">
                  • {p.name} (old assignee_id: "{p.assignee_id}")
                </div>
              ))}
              <div className="text-red-600 mt-1">
                ⚠️ These projects use username/email strings instead of employee UUIDs!
              </div>
            </div>
          )}
          
          {debugInfo.newAssigneeProjects.length > 0 && (
            <div className="mt-2">
              <strong>Successfully migrated projects:</strong>
              {debugInfo.newAssigneeProjects.map(p => (
                <div key={p.id} className="ml-2">
                  • {p.name} → {p.assignee_employee?.name || 'Unknown Employee'}
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-2">
            <strong>Sample projects debug:</strong>
            {debugInfo.allProjects.map(p => (
              <div key={p.id} className="ml-2">
                • {p.name} | old: {p.assignee_id || 'NULL'} | new: {p.assignee_employee_id || 'NULL'} | employee: {p.assignee_employee?.name || 'N/A'}
              </div>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ProjectDebugInfo;
