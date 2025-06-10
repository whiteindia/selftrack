
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRoles = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('role_privileges')
          .select('role')
          .order('role');

        if (error) {
          console.error('Error fetching roles:', error);
          throw error;
        }

        // Get unique roles
        const uniqueRoles = [...new Set(data?.map(r => r.role) || [])];
        setRoles(uniqueRoles);
      } catch (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  return { roles, loading };
};
