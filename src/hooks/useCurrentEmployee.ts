
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const useCurrentEmployee = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentEmployee = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching employee record for user:', user.email);
        
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, email, role')
          .eq('email', user.email)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('No employee record found for user:', user.email);
            setEmployee(null);
          } else {
            console.error('Error fetching employee:', error);
          }
        } else {
          console.log('Employee record found:', data);
          setEmployee(data);
        }
      } catch (error) {
        console.error('Error fetching employee:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEmployee();
  }, [user?.email]);

  return {
    employee,
    loading,
    employeeId: employee?.id
  };
};
