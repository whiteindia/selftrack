
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ProjectData } from '@/hooks/projects/types';

interface ExtendedProjectData extends ProjectData {
  assignee_id: string | null;
  assignee_employee?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface ProjectTableProps {
  projects: ExtendedProjectData[];
  totalProjects: number;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (project: ExtendedProjectData) => void;
  onDelete: (id: string) => void;
  onViewBRD: (url: string) => void;
}

const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  totalProjects,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onViewBRD
}) => {
  const getBillingType = (project: ExtendedProjectData) => {
    // Use the type column directly from the database
    return project.type || "Hourly";
  };

  const getAssigneeName = (project: ExtendedProjectData) => {
    // Use the new employee relationship
    if (project.assignee_employee?.name) {
      return project.assignee_employee.name;
    }
    
    // Fallback to show that no assignee is set
    return 'Unassigned';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Projects ({projects.length} of {totalProjects} total)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Billing Type</TableHead>
              <TableHead>Rate/Amount</TableHead>
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
                <TableCell>{project.service}</TableCell>
                <TableCell>
                  <Badge 
                    variant={getBillingType(project) === "Fixed" ? "default" : "secondary"}
                    className={getBillingType(project) === "Hourly" ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : ""}
                  >
                    {getBillingType(project)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getBillingType(project) === "Fixed"
                    ? `₹${project.project_amount?.toLocaleString() || 0}` 
                    : `₹${project.hourly_rate}/hr`}
                </TableCell>
                <TableCell>
                  <Badge variant={project.status === 'Active' ? "default" : "secondary"}>
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell>{getAssigneeName(project)}</TableCell>
                <TableCell>
                  {project.deadline ? format(new Date(project.deadline), 'PPP') : 'No deadline'}
                </TableCell>
                <TableCell>
                  {project.brd_file_url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewBRD(project.brd_file_url!)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : (
                    'No BRD'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {canUpdate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(project)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this project?')) {
                            onDelete(project.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No projects found matching your filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectTable;

