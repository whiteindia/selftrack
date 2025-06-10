
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare, FolderOpen, Users, FileText } from 'lucide-react';

interface QuickActionsProps {
  onNavigate: (path: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            className="justify-start" 
            variant="outline"
            onClick={() => onNavigate('/tasks')}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            View All Tasks
          </Button>
          <Button 
            className="justify-start" 
            variant="outline"
            onClick={() => onNavigate('/projects')}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Manage Projects
          </Button>
          <Button 
            className="justify-start" 
            variant="outline"
            onClick={() => onNavigate('/employees')}
          >
            <Users className="h-4 w-4 mr-2" />
            Team Management
          </Button>
          <Button 
            className="justify-start" 
            variant="outline"
            onClick={() => onNavigate('/invoices')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
