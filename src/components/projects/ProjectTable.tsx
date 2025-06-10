
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Eye } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ProjectType = Database['public']['Enums']['project_type'];
type ProjectStatus = Database['public']['Enums']['project_status'];

interface ProjectData {
  id: string;
  name: string;
  client_id: string;
  type: ProjectType;
  hourly_rate: number;
  project_amount: number | null;
  total_hours: number;
  status: ProjectStatus;
  start_date: string | null;
  deadline: string | null;
  brd_file_url: string | null;
  assignee_id: string | null;
  created_at: string;
  clients: {
    name: string;
  };
  assignee?: {
    full_name: string;
  };
}

interface ProjectTableProps {
  projects: ProjectData[];
  totalProjects: number;
  onEdit: (project: ProjectData) => void;
  onDelete: (id: string) => void;
  onViewBRD: (url: string) => void;
}

const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  totalProjects,
  onEdit,
  onDelete,
  onViewBRD
}) => {
  const isProjectBased = (project: ProjectData) => {
    return project.project_amount !== null || project.brd_file_url !== null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects ({projects.length})</CardTitle>
        <CardDescription>
          {projects.length !== totalProjects 
            ? `Showing ${projects.length} of ${totalProjects} projects`
            : `All projects and their details`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Rate/Amount</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>BRD</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>{project.clients?.name}</TableCell>
                <TableCell>
                  <Badge className="bg-purple-100 text-purple-800">
                    {project.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={isProjectBased(project) ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                    {isProjectBased(project) ? 'Project' : 'Hourly'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isProjectBased(project) ? `₹${project.project_amount || 0}` : `₹${project.hourly_rate}/hr`}
                </TableCell>
                <TableCell>{project.total_hours}</TableCell>
                <TableCell>
                  <Badge className={
                    project.status === 'Active' ? 'bg-green-100 text-green-800' : 
                    project.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {project.assignee?.full_name || 'Unassigned'}
                </TableCell>
                <TableCell>
                  {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  {project.brd_file_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewBRD(project.brd_file_url!)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(project.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ProjectTable;
