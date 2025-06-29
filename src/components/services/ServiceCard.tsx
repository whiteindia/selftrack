
import React from 'react';
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
    <div className="flex items-center justify-between p-4 border-b hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
        {service.description && (
          <p className="text-sm text-gray-600 mt-1">
            {service.description}
          </p>
        )}
      </div>
      {(canUpdate || canDelete) && (
        <div className="flex space-x-2 ml-4">
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
  );
};

export default ServiceCard;
