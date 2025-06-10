
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Service {
  id: string;
  name: string;
}

interface EmployeeServicesSelectProps {
  selectedServices: string[];
  onServicesChange: (services: string[]) => void;
}

const EmployeeServicesSelect: React.FC<EmployeeServicesSelectProps> = ({
  selectedServices,
  onServicesChange
}) => {
  const { data: services = [] } = useQuery({
    queryKey: ['services-for-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Service[];
    }
  });

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    if (checked) {
      onServicesChange([...selectedServices, serviceId]);
    } else {
      onServicesChange(selectedServices.filter(id => id !== serviceId));
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Services</Label>
      <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
        {services.map((service) => (
          <div key={service.id} className="flex items-center space-x-2">
            <Checkbox
              id={`service-${service.id}`}
              checked={selectedServices.includes(service.id)}
              onCheckedChange={(checked) => 
                handleServiceToggle(service.id, checked as boolean)
              }
            />
            <Label 
              htmlFor={`service-${service.id}`} 
              className="text-sm font-normal cursor-pointer"
            >
              {service.name}
            </Label>
          </div>
        ))}
      </div>
      {services.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          No services available. Add services first to assign them to employees.
        </p>
      )}
    </div>
  );
};

export default EmployeeServicesSelect;
