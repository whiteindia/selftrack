
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import PasswordResetDialog from '@/components/PasswordResetDialog';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  allowedRoles?: string[];
  requireSuperAdmin?: boolean;
  pageName?: string; // New prop to check page-specific privileges
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  allowedRoles, 
  requireSuperAdmin,
  pageName
}) => {
  const { user, userRole, loading, needsPasswordReset } = useAuth();
  const { hasPageAccess, loading: privilegesLoading, privileges } = usePrivileges();
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  console.log('=== ProtectedRoute ===');
  console.log('User:', user?.email);
  console.log('UserRole:', userRole);
  console.log('Loading:', loading);
  console.log('PrivilegesLoading:', privilegesLoading);
  console.log('NeedsPasswordReset:', needsPasswordReset);
  console.log('PageName:', pageName);
  console.log('Privileges:', privileges);

  if (loading || privilegesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show password reset dialog if user needs to reset password
  if (needsPasswordReset) {
    return (
      <>
        <PasswordResetDialog 
          open={true} 
          onClose={() => setShowPasswordReset(false)} 
        />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Required</h1>
            <p className="text-gray-600">Please set a new password to continue.</p>
          </div>
        </div>
      </>
    );
  }

  // Check for superadmin access - yugandhar@whiteindia.in should always have access
  if (requireSuperAdmin) {
    const isSuperAdmin = user.email === 'yugandhar@whiteindia.in' || user.email === 'wiadmin' || userRole === 'admin';
    if (!isSuperAdmin) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">Only superadmin can access this page.</p>
          </div>
        </div>
      );
    }
  }

  // Check page-specific privileges if pageName is provided
  if (pageName) {
    console.log(`=== ProtectedRoute: Checking page access for ${pageName} ===`);
    console.log('User role:', userRole);
    console.log('User email:', user.email);
    
    // Special handling for yugandhar@whiteindia.in - always grant access
    const isSuperAdmin = user.email === 'yugandhar@whiteindia.in';
    if (isSuperAdmin) {
      console.log('✅ Granting full access to superadmin user');
      return <>{children}</>;
    }
    
    // Admin users always have access (but not the special superadmin case)
    if (userRole === 'admin') {
      console.log('✅ Granting access to admin user via role check');
      return <>{children}</>;
    }
    
    // Check if user has a role at all
    if (!userRole) {
      console.log('❌ User has no role assigned, denying access');
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">No role assigned to your account.</p>
            <p className="text-xs text-gray-400 mt-2">User: {user.email}</p>
            <p className="text-xs text-gray-400">Role: Not assigned</p>
            <p className="text-xs text-gray-400">Page: {pageName}</p>
            <div className="mt-4 text-xs text-gray-400">
              <p>🔍 Debug info:</p>
              <p>User has no role in user_roles table</p>
              <p>Contact admin to assign a role</p>
            </div>
          </div>
        </div>
      );
    }
    
    // For all other users, check privileges from the database
    const hasAccess = hasPageAccess(pageName);
    console.log(`Page access result for ${pageName}:`, hasAccess);
    console.log('Available privileges:', privileges.filter(p => p.page_name === pageName));
    
    if (!hasAccess) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
            <p className="text-xs text-gray-400 mt-2">User: {user.email}, Role: {userRole}</p>
            <p className="text-xs text-gray-400">Page: {pageName}</p>
            <div className="mt-4 text-xs text-gray-400">
              <p>🔍 Debug info:</p>
              <p>Privileges loaded: {privileges.length}</p>
              <p>Page privileges: {JSON.stringify(privileges.filter(p => p.page_name === pageName))}</p>
              <p>Has page access result: {String(hasAccess)}</p>
              <p>Role has privileges but no 'read' permission for this page</p>
            </div>
          </div>
        </div>
      );
    }
    console.log('✅ Access granted via privilege check');
    return <>{children}</>;
  }

  // Check role permissions for other users (legacy support)
  const hasAccess = () => {
    // If user is admin, grant access to everything
    if (userRole === 'admin') {
      return true;
    }
    
    if (requiredRole && userRole !== requiredRole) {
      return false;
    }
    
    if (allowedRoles && !allowedRoles.includes(userRole as string)) {
      return false;
    }
    
    return true;
  };

  if (!hasAccess()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <p className="text-xs text-gray-400 mt-2">User: {user.email}, Role: {userRole}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
