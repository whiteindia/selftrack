
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RLSPolicy {
  id?: string;
  role: string;
  page_name: string;
  rls_enabled: boolean;
}

export const useRlsPolicies = (role?: string) => {
  const [rlsPolicies, setRlsPolicies] = useState<RLSPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRlsPolicies = async () => {
      if (!role) {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching RLS policies for role:', role);
        
        const { data, error } = await supabase
          .from('role_rls_policies')
          .select('*')
          .eq('role', role)
          .order('page_name');

        if (error) {
          console.error('Error fetching RLS policies:', error);
          setRlsPolicies([]);
        } else {
          console.log('RLS policies fetched for role', role, ':', data);
          setRlsPolicies(data || []);
        }
      } catch (error) {
        console.error('Error fetching RLS policies:', error);
        setRlsPolicies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRlsPolicies();
  }, [role]);

  const updateRlsPolicy = async (pageName: string, enabled: boolean) => {
    if (!role) return;

    try {
      console.log(`Updating RLS policy for ${role}-${pageName}:`, enabled);
      
      // First check if policy exists
      const existingPolicy = rlsPolicies.find(p => p.page_name === pageName);
      
      if (existingPolicy) {
        // Update existing policy
        const { error } = await supabase
          .from('role_rls_policies')
          .update({ 
            rls_enabled: enabled,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingPolicy.id);

        if (error) throw error;
      } else {
        // Insert new policy
        const { error } = await supabase
          .from('role_rls_policies')
          .insert({
            role: role,
            page_name: pageName,
            rls_enabled: enabled
          });

        if (error) throw error;
      }

      // For sprints and tasks, we have dedicated RLS policies that don't need the global function
      // Only call apply_rls_policies for other tables that use the dynamic policy creation
      const tablesWithDirectPolicies = ['sprints', 'tasks'];
      if (!tablesWithDirectPolicies.includes(pageName)) {
        // Apply the RLS policies to the database for other tables
        const { error: applyError } = await supabase.rpc('apply_rls_policies');
        if (applyError) {
          console.error('Error applying RLS policies:', applyError);
          throw applyError;
        }
      } else {
        console.log(`Skipping apply_rls_policies for ${pageName} - using direct policy`);
      }

      // Update local state
      setRlsPolicies(prev => {
        const updated = prev.filter(p => p.page_name !== pageName);
        updated.push({
          role,
          page_name: pageName,
          rls_enabled: enabled
        });
        return updated;
      });

      console.log('RLS policy updated successfully');
    } catch (error) {
      console.error('Error updating RLS policy:', error);
      throw error;
    }
  };

  const isRlsEnabled = (pageName: string) => {
    const policy = rlsPolicies.find(p => p.page_name === pageName);
    return policy?.rls_enabled || false;
  };

  return {
    rlsPolicies,
    loading,
    updateRlsPolicy,
    isRlsEnabled
  };
};
