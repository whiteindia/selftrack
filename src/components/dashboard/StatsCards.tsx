
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  FolderOpen, 
  CheckSquare, 
  Target
} from 'lucide-react';

interface StatsCardsProps {
  stats: {
    clients: number;
    projects: number;
    onHeadProjects: number;
    onHeadTasks: number;
  } | undefined;
  isError: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, isError }) => {
  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Clients</p>
                <p className="text-xl font-bold">{stats?.clients || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <FolderOpen className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Projects</p>
                <p className="text-xl font-bold">{stats?.projects || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Target className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">On-Head Projects</p>
                <p className="text-xl font-bold">{stats?.onHeadProjects || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckSquare className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">On-Head Tasks</p>
                <p className="text-xl font-bold">{stats?.onHeadTasks || 0}</p>
              </div>
            </div>
          </div>
          {isError && <p className="text-xs text-red-500 mt-3">Error loading stats data</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
