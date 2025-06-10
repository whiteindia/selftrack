
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
  const { hasPageAccess, loading: privilegesLoading } = usePrivileges();
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  console.log('ProtectedRoute - user:', user?.email, 'userRole:', userRole, 'loading:', loading, 'needsPasswordReset:', needsPasswordReset);

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

  // Special handling for yugandhar@whiteindia.in - always grant access unless explicitly checking privileges
  if (user.email === 'yugandhar@whiteindia.in' && !pageName) {
    console.log('Granting full access to admin user');
    return <>{children}</>;
  }

  // Check page-specific privileges if pageName is provided
  if (pageName) {
    const hasAccess = hasPageAccess(pageName);
    
    // If no privileges are found and user has admin role, grant access
    if (!hasAccess && userRole === 'admin') {
      console.log('Granting access to admin user via role check');
      return <>{children}</>;
    }
    
    // If no privileges are found and user is yugandhar@whiteindia.in, grant access
    if (!hasAccess && user.email === 'yugandhar@whiteindia.in') {
      console.log('Granting access to yugandhar@whiteindia.in');
      return <>{children}</>;
    }
    
    if (!hasAccess) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
            <p className="text-xs text-gray-400 mt-2">User: {user.email}, Role: {userRole}</p>
            <p className="text-xs text-gray-400">Page: {pageName}</p>
          </div>
        </div>
      );
    }
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
