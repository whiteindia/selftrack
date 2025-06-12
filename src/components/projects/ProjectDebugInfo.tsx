
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

      // Get projects with assignee info
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          assignee_id,
          clients(name)
        `);

      // Check if there are projects where assignee_id matches username pattern
      const usernameProjects = projects?.filter(p => 
        p.assignee_id && !p.assignee_id.includes('-') // Not a UUID
      );

      return {
        userEmail: user?.email,
        userUuid: user?.id,
        employeeRecord: employee,
        totalProjects: projects?.length || 0,
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
        <strong>Project Assignment Debug:</strong>
        <div className="mt-2 space-y-1 text-sm">
          <div><strong>User Email:</strong> {debugInfo.userEmail}</div>
          <div><strong>User UUID:</strong> {debugInfo.userUuid}</div>
          <div><strong>Employee Record:</strong> {debugInfo.employeeRecord ? 
            `ID: ${debugInfo.employeeRecord.id}, Name: ${debugInfo.employeeRecord.name}` : 
            'Not found!'
          }</div>
          <div><strong>Total Projects:</strong> {debugInfo.totalProjects}</div>
          
          {debugInfo.usernameAssignedProjects.length > 0 && (
            <div className="mt-2">
              <strong>Projects with username assignments:</strong>
              {debugInfo.usernameAssignedProjects.map(p => (
                <div key={p.id} className="ml-2">
                  • {p.name} (assignee_id: "{p.assignee_id}")
                </div>
              ))}
              <div className="text-red-600 mt-1">
                ⚠️ These projects use username strings instead of employee UUIDs!
              </div>
            </div>
          )}
          
          <div className="mt-2">
            <strong>Sample projects:</strong>
            {debugInfo.allProjects.map(p => (
              <div key={p.id} className="ml-2">
                • {p.name} - assignee_id: {p.assignee_id || 'NULL'}
              </div>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ProjectDebugInfo;
