
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Service, ServiceFormData } from '@/types/service';

interface ServiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingService: Service | null;
  formData: ServiceFormData;
  onFormDataChange: (data: ServiceFormData) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const ServiceForm = ({
  isOpen,
  onClose,
  editingService,
  formData,
  onFormDataChange,
  onSubmit,
  isSubmitting
}: ServiceFormProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingService ? 'Edit Service' : 'Add New Service'}
          </DialogTitle>
          <DialogDescription>
            {editingService ? 'Update service details' : 'Create a new service offering with hourly rate'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceName">Service Name</Label>
            <Input
              id="serviceName"
              value={formData.name}
              onChange={(e) => onFormDataChange({...formData, name: e.target.value})}
              placeholder="e.g., DevOps, Content Writing"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onFormDataChange({...formData, description: e.target.value})}
              placeholder="Describe the service..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              value={formData.hourly_rate}
              onChange={(e) => onFormDataChange({...formData, hourly_rate: e.target.value})}
              placeholder="75.00"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              {editingService ? 'Update' : 'Create'} Service
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceForm;
