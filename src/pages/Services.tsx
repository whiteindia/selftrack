
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useServices } from '@/hooks/useServices';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceForm from '@/components/services/ServiceForm';
import { usePrivileges } from '@/hooks/usePrivileges';

const Services = () => {
  const { userRole } = useAuth();
  const { hasOperationAccess, loading: privilegesLoading } = usePrivileges();
  
  // Check specific permissions for services page
  const canCreate = hasOperationAccess('services', 'create');
  const canUpdate = hasOperationAccess('services', 'update');
  const canDelete = hasOperationAccess('services', 'delete');

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

  if (isLoading || privilegesLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading services...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-600 mt-2">Manage your service offerings</p>
          </div>
          
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
            </Dialog>
          )}

          {!canCreate && (
            <div className="text-sm text-gray-500">
              You don't have permission to add services
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Services List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {services.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No services found. Create your first service to get started.</p>
              </div>
            ) : (
              <div className="divide-y">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    userRole={userRole}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
  );
};

export default Services;
