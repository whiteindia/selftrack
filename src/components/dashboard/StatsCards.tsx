
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  Users, 
  FolderOpen, 
  CheckSquare, 
  TrendingUp
} from 'lucide-react';

interface StatsCardsProps {
  stats: {
    clients: number;
    projects: number;
    tasks: number;
    revenue: number;
  } | undefined;
  isError: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, isError }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.clients || 0}</div>
          {isError && <p className="text-xs text-red-500 mt-1">Error loading data</p>}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.projects || 0}</div>
          {isError && <p className="text-xs text-red-500 mt-1">Error loading data</p>}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.tasks || 0}</div>
          {isError && <p className="text-xs text-red-500 mt-1">Error loading data</p>}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{stats?.revenue || 0}</div>
          {isError && <p className="text-xs text-red-500 mt-1">Error loading data</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
