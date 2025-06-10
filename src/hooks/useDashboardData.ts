
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

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
    },
    refetchInterval: 5000 // Reduced frequency to 5 seconds to avoid conflicts
  });

  // Set up real-time subscription for time entries
  useEffect(() => {
    const channel = supabase
      .channel('time_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries'
        },
        (payload) => {
          console.log('Real-time time entry change:', payload);
          // Force immediate refetch when time entries change
          runningTasksQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runningTasksQuery]);

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

  // Get projects and sprints with upcoming deadlines (this week and next week)
  const upcomingDeadlinesQuery = useQuery({
    queryKey: ['upcoming-deadlines'],
    queryFn: async () => {
      console.log('Fetching upcoming deadlines...');
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7); // Next 7 days

      // Fetch upcoming projects
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          service,
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
        .order('deadline', { ascending: true });

      // Fetch upcoming sprints
      const { data: sprints, error: sprintError } = await supabase
        .from('sprints')
        .select(`
          id,
          title,
          status,
          deadline
        `)
        .not('status', 'eq', 'Completed')
        .not('deadline', 'is', null)
        .gte('deadline', today.toISOString().split('T')[0])
        .lte('deadline', nextWeek.toISOString().split('T')[0])
        .order('deadline', { ascending: true });
      
      if (projectError) {
        console.error('Upcoming projects error:', projectError);
        throw projectError;
      }

      if (sprintError) {
        console.error('Upcoming sprints error:', sprintError);
        throw sprintError;
      }

      // Combine and sort by deadline
      const combinedDeadlines = [
        ...(projects || []).map(project => ({ ...project, type: 'project' })),
        ...(sprints || []).map(sprint => ({ ...sprint, type: 'sprint' }))
      ].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
       .slice(0, 5); // Limit to 5 items

      console.log('Combined upcoming deadlines data:', combinedDeadlines);
      return combinedDeadlines;
    }
  });

  return {
    runningTasksQuery,
    statsQuery,
    upcomingDeadlinesQuery
  };
};
