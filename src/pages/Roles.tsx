
import React from 'react';
import Navigation from '@/components/Navigation';
import RolesManagement from '@/components/RolesManagement';

const Roles = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Roles Management</h1>
          <p className="text-gray-600 mt-2">Manage system roles and their permissions</p>
        </div>
        <RolesManagement />
      </Navigation>
    </div>
  );
};

export default Roles;
