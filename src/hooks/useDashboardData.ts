
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
          task_id,
          entry_type,
          employee_id,
          comment,
          timer_metadata,
          employees!inner(
            id,
            name,
            email
          )
        `)
        .is('end_time', null)
        .order('start_time', { ascending: false });
      
      if (error) {
        console.error('Running tasks error:', error);
        throw error;
      }

      console.log('Running time entries data:', data);

      // Now fetch the details for each entry based on entry_type
      const enrichedEntries = await Promise.all(
        (data || []).map(async (entry) => {
          if (entry.entry_type === 'subtask') {
            // Fetch subtask details
            const { data: subtaskData, error: subtaskError } = await supabase
              .from('subtasks')
              .select(`
                id,
                name,
                assignee_id,
                assigner_id,
                tasks!inner(
                  id,
                  name,
                  assignee_id,
                  assigner_id,
                  projects!inner(
                    id,
                    name,
                    service,
                    clients!inner(id, name)
                  )
                )
              `)
              .eq('id', entry.task_id)
              .single();

            if (subtaskError) {
              console.error('Subtask fetch error:', subtaskError);
              return null;
            }

            return {
              ...entry,
              tasks: {
                id: subtaskData.tasks.id,
                name: `${subtaskData.tasks.name} > ${subtaskData.name}`, // Show parent task > subtask
                assignee_id: subtaskData.assignee_id || subtaskData.tasks.assignee_id,
                assigner_id: subtaskData.assigner_id || subtaskData.tasks.assigner_id,
                projects: subtaskData.tasks.projects
              },
              employee: entry.employees
            };
          } else {
            // Fetch task details
            const { data: taskData, error: taskError } = await supabase
              .from('tasks')
              .select(`
                id,
                name,
                assignee_id,
                assigner_id,
                projects!inner(
                  id,
                  name,
                  service,
                  clients!inner(id, name)
                )
              `)
              .eq('id', entry.task_id)
              .single();

            if (taskError || !taskData) {
              console.warn(`Task not found for entry ${entry.id} with task_id ${entry.task_id}:`, taskError);
              return null;
            }

            return {
              ...entry,
              tasks: taskData,
              employee: entry.employees
            };
          }
        })
      );

      // Filter out any null entries (failed fetches)
      const validEntries = enrichedEntries.filter(entry => entry !== null);
      
      // Sort: Running tasks (no pause info) first, then paused tasks
      const sortedEntries = validEntries.sort((a, b) => {
        const aPaused = a.timer_metadata?.includes('Timer paused');
        const bPaused = b.timer_metadata?.includes('Timer paused');
        
        // Running tasks (no pause) come first
        if (!aPaused && bPaused) return -1;
        if (aPaused && !bPaused) return 1;
        
        // If both have same pause status, sort by start_time (most recent first)
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      });
      
      console.log('Enriched running tasks:', sortedEntries);
      return sortedEntries;
    },
    refetchInterval: 2000 // More frequent updates
  });

  // Set up real-time subscription for time entries
  useEffect(() => {
    const channel = supabase
      .channel('time_entries_dashboard_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'time_entries'
        },
        (payload) => {
          console.log('Real-time time entry update:', payload);
          // Force immediate refetch when time entries are updated (stopped)
          runningTasksQuery.refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'time_entries'
        },
        (payload) => {
          console.log('Real-time time entry insert:', payload);
          // Force immediate refetch when new time entries are created (started)
          runningTasksQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runningTasksQuery]);

  // Get summary statistics - updated to include On-Head stats
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      console.log('Fetching dashboard stats...');
      const [clientsRes, projectsRes, onHeadProjectsRes, onHeadTasksRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('projects').select('id', { count: 'exact' }),
        supabase.from('projects').select('id', { count: 'exact' }).eq('status', 'On-Head'),
        supabase.from('tasks').select('id', { count: 'exact' }).eq('status', 'On-Head')
      ]);

      console.log('Stats responses:', {
        clients: clientsRes,
        projects: projectsRes,
        onHeadProjects: onHeadProjectsRes,
        onHeadTasks: onHeadTasksRes
      });

      if (clientsRes.error) console.error('Clients error:', clientsRes.error);
      if (projectsRes.error) console.error('Projects error:', projectsRes.error);
      if (onHeadProjectsRes.error) console.error('On-Head projects error:', onHeadProjectsRes.error);
      if (onHeadTasksRes.error) console.error('On-Head tasks error:', onHeadTasksRes.error);

      const result = {
        clients: clientsRes.count || 0,
        projects: projectsRes.count || 0,
        onHeadProjects: onHeadProjectsRes.count || 0,
        onHeadTasks: onHeadTasksRes.count || 0
      };

      console.log('Dashboard stats result:', result);
      return result;
    }
  });

  // Get tasks, projects and sprints with upcoming deadlines (this week and next week)
  const upcomingDeadlinesQuery = useQuery({
    queryKey: ['upcoming-deadlines'],
    queryFn: async () => {
      console.log('Fetching upcoming deadlines...');
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7); // Next 7 days

      // Fetch upcoming tasks with deadlines
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          deadline,
          projects (
            id,
            name,
            clients (name)
          )
        `)
        .not('status', 'eq', 'Completed')
        .not('deadline', 'is', null)
        .gte('deadline', today.toISOString().split('T')[0])
        .lte('deadline', nextWeek.toISOString().split('T')[0])
        .order('deadline', { ascending: true })
        .limit(10);

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
      
      if (taskError) {
        console.error('Upcoming tasks error:', taskError);
        throw taskError;
      }

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
        ...(tasks || []).map(task => ({ ...task, type: 'task' })),
        ...(projects || []).map(project => ({ ...project, type: 'project' })),
        ...(sprints || []).map(sprint => ({ ...sprint, type: 'sprint' }))
      ].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
       .slice(0, 10); // Limit to 10 items

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
