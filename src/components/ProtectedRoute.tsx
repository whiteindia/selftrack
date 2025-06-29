
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';

interface ProtectedRouteProps {
  children: React.ReactNode;
  pageName?: string;
  requireSuperAdmin?: boolean;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  pageName, 
  requireSuperAdmin = false,
  requireAdmin = false
}) => {
  const { user, userRole, loading: authLoading } = useAuth();
  const { loading: privilegesLoading, hasPageAccess } = usePrivileges();

  console.log('ProtectedRoute check:', { 
    user: user?.email, 
    userRole, 
    pageName, 
    requireSuperAdmin,
    requireAdmin,
    authLoading, 
    privilegesLoading 
  });

  if (authLoading || privilegesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check for super admin access
  if (requireSuperAdmin) {
    const isSuperAdmin = user.email === 'yugandhar@whiteindia.in';
    console.log('Super admin check:', { email: user.email, isSuperAdmin });
    
    if (!isSuperAdmin) {
      console.log('Access denied: Super admin required');
      return <Navigate to="/" replace />;
    }
  }

  // Check for admin access
  if (requireAdmin) {
    const isAdmin = userRole === 'admin' || user.email === 'yugandhar@whiteindia.in';
    console.log('Admin check:', { userRole, email: user.email, isAdmin });
    
    if (!isAdmin) {
      console.log('Access denied: Admin required');
      return <Navigate to="/" replace />;
    }
  }

  // Check for page-specific access
  if (pageName && !hasPageAccess(pageName)) {
    console.log('Access denied for page:', pageName);
    return <Navigate to="/" replace />;
  }

  console.log('Access granted');
  return <>{children}</>;
};

export default ProtectedRoute;
