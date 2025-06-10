
import React from 'react';
import Navigation from '@/components/Navigation';
import InvitationDialog from '@/components/InvitationDialog';
import InvitationsTable from '@/components/InvitationsTable';

const Invitations = () => {
  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invitations</h1>
            <p className="text-gray-600 mt-2">Manage user invitations and access</p>
          </div>
          
          <InvitationDialog />
        </div>

        <InvitationsTable />
      </div>
    </Navigation>
  );
};

export default Invitations;
