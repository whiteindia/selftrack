
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface RlsStatusAlertProps {
  userRole: string;
  pageName: string;
  description: string;
}

const RlsStatusAlert: React.FC<RlsStatusAlertProps> = ({ userRole, pageName, description }) => {
  if (userRole !== 'manager') {
    return null;
  }

  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertDescription>
        Manager View: {description} Row-Level Security is active.
      </AlertDescription>
    </Alert>
  );
};

export default RlsStatusAlert;
