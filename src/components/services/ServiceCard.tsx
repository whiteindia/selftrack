
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  hourly_rate: number;
}

interface ServiceCardProps {
  service: Service;
  userRole: string | null;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (service: Service) => void;
  onDelete: (serviceId: string) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  service, 
  userRole, 
  canUpdate,
  canDelete,
  onEdit, 
  onDelete 
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{service.name}</CardTitle>
            {service.description && (
              <CardDescription className="mt-2">
                {service.description}
              </CardDescription>
            )}
          </div>
          {(canUpdate || canDelete) && (
            <div className="flex space-x-2">
              {canUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(service)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(service.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-blue-600">
          ₹{service.hourly_rate}/hour
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;
