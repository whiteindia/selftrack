import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthProviderProps {
  children: React.ReactNode;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  needsPasswordReset: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  getDefaultLandingPage: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        return null;
      }
      
      // If user has multiple roles, prioritize admin role
      if (data && data.length > 0) {
        const adminRole = data.find(r => r.role === 'admin');
        const role = adminRole ? adminRole.role : data[0].role;
        setUserRole(role);
        return role;
      }
      
      setUserRole(null);
      return null;
    } catch (error) {
      setUserRole(null);
      return null;
    }
  };

  const getDefaultLandingPage = async (): Promise<string> => {
    try {
      // Superadmin always gets dashboard
      if (user?.email === 'yugandhar@whiteindia.in') {
        return '/';
      }

      if (!userRole) {
        
        // Get all user privileges to find first accessible page
        const { data: userPrivileges, error: privilegesError } = await supabase
          .from('role_privileges')
          .select('page_name, operation, allowed')
          .eq('role', 'guest') // fallback role or could be determined differently
          .eq('operation', 'read')
          .eq('allowed', true)
          .order('page_name');

        if (privilegesError) {
          return '/login'; // Redirect to login if no access
        }

        if (userPrivileges && userPrivileges.length > 0) {
          const firstPage = userPrivileges[0].page_name;
          return getRouteFromPageName(firstPage);
        }

        return '/login'; // No accessible pages
      }

      // Check if role has a custom landing page set
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_role_landing_page', { role_name: userRole });

      if (roleError) {
      } else if (roleData) {
        
        // Verify user has access to this landing page
        const hasAccess = await checkPageAccess(roleData);
        if (hasAccess) {
          return `/${roleData}`;
        } else {
        }
      }

      // Fallback: get first accessible page from privileges
      const { data: pagesData, error: pagesError } = await supabase
        .rpc('get_role_available_pages', { role_name: userRole });

      if (pagesError) {
        return '/login';
      }

      if (pagesData && pagesData.length > 0) {
        const firstPage = pagesData[0].page_name;
        return getRouteFromPageName(firstPage);
      }

      return '/login';
    } catch (error) {
      return '/login';
    }
  };

  // Helper function to check if user has read access to a specific page
  const checkPageAccess = async (pageName: string): Promise<boolean> => {
    if (!userRole) return false;

    try {
      const { data, error } = await supabase
        .from('role_privileges')
        .select('allowed')
        .eq('role', userRole)
        .eq('page_name', pageName)
        .eq('operation', 'read')
        .single();

      if (error) {
        return false;
      }

      return data?.allowed || false;
    } catch (error) {
      return false;
    }
  };

  // Helper function to convert page names to routes
  const getRouteFromPageName = (pageName: string): string => {
    const pageRoutes: Record<string, string> = {
      'dashboard': '/',
      'clients': '/clients',
      'employees': '/employees',
      'projects': '/projects',
      'tasks': '/tasks',
      'sprints': '/sprints',
      'invoices': '/invoices',
      'payments': '/payments',
      'services': '/services',
      'wages': '/wages',
      'gantt-view': '/gantt-view',
      'agenda-cal': '/agenda-cal',
      'log-cal': '/log-cal'
    };

    return pageRoutes[pageName] || '/login';
  };

  const checkPasswordResetNeeded = (user: User) => {
    // Check if user metadata indicates they need a password reset
    const needsReset = user.user_metadata?.needs_password_reset === true;
    setNeedsPasswordReset(needsReset);
    
    if (needsReset) {
      toast.warning('Please set a new password for security purposes.');
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        checkPasswordResetNeeded(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserRole(session.user.id);
          checkPasswordResetNeeded(session.user);
        } else {
          setUserRole(null);
          setNeedsPasswordReset(false);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
    } else {
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setNeedsPasswordReset(false);
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: {
        needs_password_reset: false // Clear the flag once password is updated
      }
    });
    
    if (!error) {
      setNeedsPasswordReset(false);
      toast.success('Password updated successfully!');
    }
    
    return { error };
  };

  const value = {
    user,
    session,
    userRole,
    loading,
    needsPasswordReset,
    signIn,
    signOut,
    signUp,
    updatePassword,
    getDefaultLandingPage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
