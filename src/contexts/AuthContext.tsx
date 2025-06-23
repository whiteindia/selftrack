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
      console.log('Fetching user role for:', userId);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      console.log('User roles data:', data);
      
      // If user has multiple roles, prioritize admin role
      if (data && data.length > 0) {
        const adminRole = data.find(r => r.role === 'admin');
        const role = adminRole ? adminRole.role : data[0].role;
        console.log('Selected role:', role);
        setUserRole(role);
        return role;
      }
      
      console.log('No roles found for user');
      setUserRole(null);
      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      return null;
    }
  };

  const getDefaultLandingPage = async (): Promise<string> => {
    try {
      console.log('Getting landing page for user:', user?.email, 'role:', userRole);

      // Superadmin always gets dashboard
      if (user?.email === 'yugandhar@whiteindia.in') {
        console.log('Superadmin user, defaulting to dashboard');
        return '/';
      }

      if (!userRole) {
        console.log('No user role, checking for first accessible page');
        
        // Get all user privileges to find first accessible page
        const { data: userPrivileges, error: privilegesError } = await supabase
          .from('role_privileges')
          .select('page_name, operation, allowed')
          .eq('role', 'guest') // fallback role or could be determined differently
          .eq('operation', 'read')
          .eq('allowed', true)
          .order('page_name');

        if (privilegesError) {
          console.error('Error fetching privileges:', privilegesError);
          return '/login'; // Redirect to login if no access
        }

        if (userPrivileges && userPrivileges.length > 0) {
          const firstPage = userPrivileges[0].page_name;
          console.log('First accessible page for user without role:', firstPage);
          return getRouteFromPageName(firstPage);
        }

        return '/login'; // No accessible pages
      }

      console.log('Getting landing page for role:', userRole);

      // Check if role has a custom landing page set
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_role_landing_page', { role_name: userRole });

      if (roleError) {
        console.error('Error fetching role landing page:', roleError);
      } else if (roleData) {
        console.log('Custom landing page found:', roleData);
        
        // Verify user has access to this landing page
        const hasAccess = await checkPageAccess(roleData);
        if (hasAccess) {
          return `/${roleData}`;
        } else {
          console.log('User does not have access to custom landing page, finding alternative');
        }
      }

      // Fallback: get first accessible page from privileges
      console.log('No custom landing page or no access, finding first accessible page');
      const { data: pagesData, error: pagesError } = await supabase
        .rpc('get_role_available_pages', { role_name: userRole });

      if (pagesError) {
        console.error('Error fetching available pages:', pagesError);
        return '/login';
      }

      if (pagesData && pagesData.length > 0) {
        const firstPage = pagesData[0].page_name;
        console.log('First accessible page:', firstPage);
        return getRouteFromPageName(firstPage);
      }

      console.log('No accessible pages found, redirecting to login');
      return '/login';
    } catch (error) {
      console.error('Error determining landing page:', error);
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
        console.error('Error checking page access:', error);
        return false;
      }

      return data?.allowed || false;
    } catch (error) {
      console.error('Error checking page access:', error);
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
    console.log('User needs password reset:', needsReset, user.user_metadata);
    setNeedsPasswordReset(needsReset);
    
    if (needsReset) {
      toast.warning('Please set a new password for security purposes.');
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email || 'No session');
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
        console.log('=== AUTH STATE CHANGE ===');
        console.log('Event:', event);
        console.log('Session user:', session?.user?.email || 'No user');
        console.log('Session object:', session);
        
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
    console.log('=== AuthContext signIn called ===');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('=== AuthContext signIn error ===');
      console.error('Error:', error);
    } else {
      console.log('=== AuthContext signIn success ===');
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
    console.log('Updating password for user');
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
