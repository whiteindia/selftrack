
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, FileText, Target } from 'lucide-react';

interface UpcomingDeadlinesProps {
  upcomingDeadlines: any[];
  isError: boolean;
  onBRDClick: (brdUrl: string) => void;
  onViewAllProjects: () => void;
  onViewAllSprints: () => void;
  getTimeUntilDeadline: (deadline: string) => string;
}

const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({
  upcomingDeadlines,
  isError,
  onBRDClick,
  onViewAllProjects,
  onViewAllSprints,
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
        {upcomingDeadlines.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No upcoming deadlines</p>
            <p className="text-sm">Projects and sprints with deadlines will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingDeadlines.map((item: any) => (
              <div
                key={`${item.type}-${item.id}`}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{item.name || item.title}</h4>
                  <div className="flex items-center space-x-2">
                    {item.type === 'project' ? (
                      <Badge variant="outline">{item.service}</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Target className="h-3 w-3 mr-1" />
                        Sprint
                      </Badge>
                    )}
                  </div>
                </div>
                
                {item.type === 'project' && (
                  <p className="text-sm text-gray-600 mb-3">{item.clients?.name}</p>
                )}
                
                {item.type === 'sprint' && (
                  <p className="text-sm text-gray-600 mb-3">Status: {item.status}</p>
                )}
                
                <div className="flex items-center justify-between">
                  {item.type === 'project' && item.brd_file_url ? (
                    <div 
                      className="flex items-center space-x-2 cursor-pointer text-blue-600 hover:text-blue-800"
                      onClick={() => onBRDClick(item.brd_file_url)}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">View BRD</span>
                    </div>
                  ) : item.type === 'project' ? (
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">₹{item.hourly_rate}/hr</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <Target className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Sprint Deadline</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">{getTimeUntilDeadline(item.deadline)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onViewAllProjects}
              >
                View All Projects
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={onViewAllSprints}
              >
                View All Sprints
              </Button>
            </div>
          </div>
        )}
        {isError && <p className="text-xs text-red-500 mt-1">Error loading upcoming deadlines</p>}
      </CardContent>
    </Card>
  );
};

export default UpcomingDeadlines;
