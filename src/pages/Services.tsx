
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useServices } from '@/hooks/useServices';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceForm from '@/components/services/ServiceForm';

const Services = () => {
  const { userRole } = useAuth();
  const {
    services,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    editingService,
    formData,
    setFormData,
    handleSubmit,
    handleEdit,
    handleDelete,
    openCreateDialog,
    resetForm,
    isSubmitting
  } = useServices();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading services...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Services</h1>
              <p className="text-gray-600 mt-2">Manage your service offerings and hourly rates</p>
            </div>
            
            {userRole === 'admin' && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </DialogTrigger>
              </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                userRole={userRole}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <ServiceForm
            isOpen={isDialogOpen}
            onClose={resetForm}
            editingService={editingService}
            formData={formData}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </Navigation>
    </div>
  );
};

export default Services;
