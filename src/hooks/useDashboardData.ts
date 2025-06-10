
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useDashboardData = () => {
  // Get running tasks (tasks with active time entries)
  const runningTasksQuery = useQuery({
    queryKey: ['running-tasks'],
    queryFn: async () => {
      console.log('Fetching running tasks...');
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          start_time,
          tasks (
            id,
            name,
            projects (
              name,
              clients (name)
            )
          )
        `)
        .is('end_time', null)
        .order('start_time', { ascending: false });
      
      if (error) {
        console.error('Running tasks error:', error);
        throw error;
      }
      console.log('Running tasks data:', data);
      return data || [];
    }
  });

  // Get summary statistics
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      console.log('Fetching dashboard stats...');
      const [clientsRes, projectsRes, tasksRes, paymentsRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('projects').select('id', { count: 'exact' }),
        supabase.from('tasks').select('id', { count: 'exact' }),
        supabase.from('payments').select('amount')
      ]);

      console.log('Stats responses:', {
        clients: clientsRes,
        projects: projectsRes,
        tasks: tasksRes,
        payments: paymentsRes
      });

      if (clientsRes.error) console.error('Clients error:', clientsRes.error);
      if (projectsRes.error) console.error('Projects error:', projectsRes.error);
      if (tasksRes.error) console.error('Tasks error:', tasksRes.error);
      if (paymentsRes.error) console.error('Payments error:', paymentsRes.error);

      const totalRevenue = paymentsRes.data?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

      const result = {
        clients: clientsRes.count || 0,
        projects: projectsRes.count || 0,
        tasks: tasksRes.count || 0,
        revenue: totalRevenue
      };

      console.log('Dashboard stats result:', result);
      return result;
    }
  });

  // Get projects with upcoming deadlines (this week and next week)
  const upcomingProjectsQuery = useQuery({
    queryKey: ['upcoming-projects'],
    queryFn: async () => {
      console.log('Fetching upcoming projects...');
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 14); // Next 2 weeks

      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          type,
          hourly_rate,
          project_amount,
          total_hours,
          status,
          deadline,
          brd_file_url,
          clients (name)
        `)
        .eq('status', 'Active')
        .not('deadline', 'is', null)
        .gte('deadline', today.toISOString().split('T')[0])
        .lte('deadline', nextWeek.toISOString().split('T')[0])
        .order('deadline', { ascending: true })
        .limit(5);
      
      if (error) {
        console.error('Upcoming projects error:', error);
        throw error;
      }
      console.log('Upcoming projects data:', data);
      return data || [];
    }
  });

  return {
    runningTasksQuery,
    statsQuery,
    upcomingProjectsQuery
  };
};
