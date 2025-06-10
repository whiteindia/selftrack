
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Edit, Trash2 } from 'lucide-react';
import { Service } from '@/types/service';

interface ServiceCardProps {
  service: Service;
  userRole: string;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
}

const ServiceCard = ({ service, userRole, onEdit, onDelete }: ServiceCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{service.name}</CardTitle>
          {userRole === 'admin' && (
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(service)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(service.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          )}
        </div>
        {service.description && (
          <CardDescription>{service.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <DollarSign className="h-3 w-3" />
            <span>₹{service.hourly_rate}/hour</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;
