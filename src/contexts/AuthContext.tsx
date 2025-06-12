import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logUserLogin } from '@/utils/activityLogger';
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
  getFirstAccessiblePage: () => Promise<string>;
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

  const getFirstAccessiblePage = async (): Promise<string> => {
    console.log('=== Getting first accessible page ===');
    console.log('Current user role:', userRole);
    console.log('Current user email:', user?.email);

    // If admin or yugandhar@whiteindia.in, redirect to dashboard
    if (userRole === 'admin' || user?.email === 'yugandhar@whiteindia.in') {
      console.log('Admin user - redirecting to dashboard');
      return '/';
    }

    if (!userRole) {
      console.log('No role found - redirecting to dashboard as fallback');
      return '/';
    }

    try {
      // Define page priority order
      const pageOrder = [
        'dashboard',
        'sprints', 
        'tasks',
        'projects',
        'invoices',
        'clients',
        'employees',
        'payments',
        'services',
        'wages'
      ];

      // Fetch user privileges
      const { data: privileges, error } = await supabase
        .from('role_privileges')
        .select('page_name, operation, allowed')
        .eq('role', userRole)
        .eq('operation', 'read')
        .eq('allowed', true);

      if (error) {
        console.error('Error fetching privileges:', error);
        return '/';
      }

      console.log('User privileges:', privileges);

      if (!privileges || privileges.length === 0) {
        console.log('No privileges found - redirecting to dashboard as fallback');
        return '/';
      }

      // Find first accessible page in priority order
      const allowedPages = privileges.map(p => p.page_name);
      console.log('Allowed pages:', allowedPages);

      for (const page of pageOrder) {
        if (allowedPages.includes(page)) {
          const route = page === 'dashboard' ? '/' : `/${page}`;
          console.log(`First accessible page found: ${route}`);
          return route;
        }
      }

      // If no match found, return first allowed page
      const firstAllowed = `/${allowedPages[0]}`;
      console.log(`Using first allowed page: ${firstAllowed}`);
      return firstAllowed;

    } catch (error) {
      console.error('Error determining accessible page:', error);
      return '/';
    }
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
    console.log('AuthProvider: Initializing auth state...');
    
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        console.log('Initial session check:', session?.user?.email || 'No session');
        if (error) {
          console.error('Error getting initial session:', error);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id);
          checkPasswordResetNeeded(session.user);
          // Log user login activity
          logUserLogin(session.user.email || 'Unknown user');
        }
        
        // Always set loading to false after initial check
        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth state
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('=== AUTH STATE CHANGE ===');
        console.log('Event:', event);
        console.log('Session user:', session?.user?.email || 'No user');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          checkPasswordResetNeeded(session.user);
          
          // Log user login activity for sign in events
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              logUserLogin(session.user.email || 'Unknown user');
            }, 0);

            // Handle redirect after login - only if on login page
            if (window.location.pathname === '/login') {
              setTimeout(async () => {
                try {
                  console.log('Redirecting using getFirstAccessiblePage...');
                  const redirectTo = await getFirstAccessiblePage();
                  console.log('Redirecting to:', redirectTo);
                  window.location.href = redirectTo;
                } catch (err) {
                  console.error('Redirect error:', err);
                  window.location.href = '/'; // fallback
                }
              }, 1500); // Wait for role to be fully loaded
            }
          }
        } else {
          setUserRole(null);
          setNeedsPasswordReset(false);
        }
      }
    );

    return () => {
      isMounted = false;
      console.log('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
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
    getFirstAccessiblePage,
  };

  console.log('AuthProvider: Rendering with loading:', loading, 'user:', user?.email);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
