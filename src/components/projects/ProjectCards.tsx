
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Building, Calendar, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useProjectOperations } from '@/hooks/useProjectOperations';

interface Project {
  id: string;
  name: string;
  status: string; // Changed from specific union type to string
  type: string; // Changed from specific union type to string
  project_amount?: number;
  hourly_rate?: number;
  start_date?: string;
  end_date?: string;
  deadline?: string;
  brd_file_url?: string;
  clients: {
    id: string;
    name: string;
    company?: string;
  };
  service?: string;
  description?: string;
}

interface ProjectCardsProps {
  projects: Project[];
  onEditProject: (project: Project) => void;
}

const ProjectCards = ({ projects, onEditProject }: ProjectCardsProps) => {
  const queryClient = useQueryClient();
  const { deleteProjectMutation } = useProjectOperations();

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(projectId, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          toast.success('Project deleted successfully');
        },
        onError: (error) => {
          toast.error('Failed to delete project');
          console.error('Error deleting project:', error);
        },
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'Active': return 'bg-green-100 text-green-800';
      case 'On Hold': return 'bg-orange-100 text-orange-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Imp': return 'bg-purple-100 text-purple-800';
      case 'On-Head': return 'bg-indigo-100 text-indigo-800';
      case 'Targeted': return 'bg-teal-100 text-teal-800';
      case 'OverDue': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'One-time': return 'bg-purple-100 text-purple-800';
      case 'Retainer': return 'bg-indigo-100 text-indigo-800';
      case 'Hourly': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline).getTime() < new Date().getTime();
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Building className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
        <p className="text-sm">No projects match the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const hasOverdueDeadline = project.deadline && isOverdue(project.deadline);
        
        return (
          <Card 
            key={project.id} 
            className={`hover:shadow-lg transition-shadow border-l-4 ${
              hasOverdueDeadline 
                ? 'border-l-red-500 border-red-200 bg-red-50' 
                : 'border-l-blue-500'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg font-semibold leading-tight line-clamp-2">
                  {project.name}
                </CardTitle>
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditProject(project)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProject(project.id, project.name)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
                <Badge variant="outline" className={getTypeColor(project.type)}>
                  {project.type}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Client Info - Only show client name */}
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{project.clients.name}</p>
                </div>
              </div>

              {/* Service */}
              {project.service && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Service: </span>
                  <span className="text-gray-600">{project.service}</span>
                </div>
              )}

              {/* Description */}
              {project.description && (
                <div className="text-sm">
                  <p className="text-gray-600 line-clamp-2">{project.description}</p>
                </div>
              )}

              {/* Dates */}
              <div className="space-y-1 text-sm">
                {project.deadline && (
                  <div className="flex items-center gap-2">
                    <Calendar className={`h-4 w-4 ${hasOverdueDeadline ? 'text-red-500' : 'text-gray-500'}`} />
                    <span className={`font-medium ${hasOverdueDeadline ? 'text-red-600' : 'text-gray-600'}`}>
                      Deadline: {format(new Date(project.deadline), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                {project.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">
                      Start: {format(new Date(project.start_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                {project.end_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">
                      End: {format(new Date(project.end_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>

              {/* BRD File */}
              {project.brd_file_url && (
                <div className="pt-2 border-t">
                  <a
                    href={project.brd_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    <span>View BRD</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ProjectCards;
