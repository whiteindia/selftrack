
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, FileText } from 'lucide-react';

interface UpcomingDeadlinesProps {
  upcomingProjects: any[];
  isError: boolean;
  onBRDClick: (brdUrl: string) => void;
  onViewAllProjects: () => void;
  getTimeUntilDeadline: (deadline: string) => string;
}

const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({
  upcomingProjects,
  isError,
  onBRDClick,
  onViewAllProjects,
  getTimeUntilDeadline
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-orange-600" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No upcoming deadlines</p>
            <p className="text-sm">Projects with deadlines will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingProjects.map((project: any) => (
              <div
                key={project.id}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{project.name}</h4>
                  <Badge variant="outline">{project.type}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{project.clients.name}</p>
                
                <div className="flex items-center justify-between">
                  {project.brd_file_url ? (
                    <div 
                      className="flex items-center space-x-2 cursor-pointer text-blue-600 hover:text-blue-800"
                      onClick={() => onBRDClick(project.brd_file_url)}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">View BRD</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">₹{project.hourly_rate}/hr</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">{getTimeUntilDeadline(project.deadline)}</span>
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={onViewAllProjects}
            >
              View All Projects
            </Button>
          </div>
        )}
        {isError && <p className="text-xs text-red-500 mt-1">Error loading upcoming projects</p>}
      </CardContent>
    </Card>
  );
};

export default UpcomingDeadlines;
