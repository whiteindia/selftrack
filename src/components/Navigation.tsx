import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Users, 
  UserCheck,
  FolderOpen, 
  CheckSquare, 
  FileText, 
  DollarSign,
  Settings,
  LogOut,
  Wallet,
  Menu,
  ChevronDown,
  User,
  Calendar,
  ChartGantt,
  CalendarClock,
  CalendarRange,
  Clock,
  CalendarDays,
  Target,
  ClipboardList,
  CalendarCheck,
  Bell,
  StickyNote,
  Users2,
  UserCog,
  Users as UsersIcon,
  UserPlus,
  UserX,
  PersonStanding,
  AlertTriangle,
  CheckCircle,
  Check,
  Plus,
  Shield,
  X,
  Code,
  TrendingUp,
  MessageCircle
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import { useIsMobile } from '@/hooks/use-mobile';
import { useReminderNotifications } from '@/hooks/useReminderNotifications';
import NotificationBadge from '@/components/NotificationBadge';
import TaskCreateDialog from '@/components/TaskCreateDialog';
import { useNavigate } from 'react-router-dom';
import { formatToIST } from '@/utils/timezoneUtils';

const Navigation = ({ children }: { children?: React.ReactNode }) => {
  const { signOut, user, userRole, loading: authLoading } = useAuth();
  const { hasPageAccess, loading: privilegesLoading } = usePrivileges();
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [isQuickTaskDialogOpen, setIsQuickTaskDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  // Get notifications for both mobile and desktop
  const { 
    totalNotificationCount, 
    dueSoonTasks, 
    overdueTasks,
    allDueSoonTasks,
    allOverdueTasks,
    upcomingSprintDeadlines,
    allUpcomingSprintDeadlines,
    overdueSprintDeadlines,
    allOverdueSprintDeadlines,
    upcomingTaskSlots,
    allUpcomingTaskSlots,
    overdueTaskSlots,
    allOverdueTaskSlots,
    markAllAsRead,
    markAsRead,
    setNotifiedItems
  } = useReminderNotifications();

  const handleMarkAllAsRead = async () => {
    setIsMarkingAsRead(true);
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const mainNavItems = [
    { path: '/', label: 'Home', icon: Home, pageName: 'dashboard' },
    { path: '/projects', label: 'Projects', icon: FolderOpen, pageName: 'projects' },
  ];
  const sprintsNavItem = { path: '/sprints', label: 'Sprints', icon: Calendar, pageName: 'sprints' };

  const notesItems = [
    { path: '/sticky-notes', label: 'Sticky Notes', icon: StickyNote, pageName: 'tasks' },
    { path: '/codi-notes', label: 'CodiNotes', icon: Code, pageName: 'tasks' },
    { path: '/trada-notes', label: 'TradaNotes', icon: TrendingUp, pageName: 'tasks' },
  ];

  const taskforceItems = [
    { path: '/alltasks', label: 'All Tasks', icon: CheckSquare, pageName: 'tasks' },
    { path: '/buzman', label: 'Buzman', icon: UserCog, pageName: 'buzman' },
    { path: '/skillman', label: 'Skillman', icon: UsersIcon, pageName: 'skillman' },
    { path: '/cman', label: 'Cman', icon: UserPlus, pageName: 'cman' },
    { path: '/citman', label: 'Citman', icon: UserX, pageName: 'citman' },
    { path: '/myself', label: 'Myself', icon: PersonStanding, pageName: 'myself' },
  ];

  const goalTrackItems = [
    { path: '/time-until', label: 'Time Until', icon: Clock, pageName: 'time-until' },
    { path: '/routines-tracker', label: 'Routines Tracker', icon: Target, pageName: 'routines-tracker', requireAdmin: true },
  ];

  const plannerItems = [
    { path: '/followupcal', label: 'FollowupCal', icon: CalendarCheck, pageName: 'followupcal' },
    { path: '/fixed-slots', label: 'Fixed Slots', icon: CalendarCheck, pageName: 'fixed-slots' },
    { path: '/reminders', label: 'Reminders-DLs', icon: Bell, pageName: 'reminders' },
  ];

  const trakTeamItems = [
    { path: '/gantt-view', label: 'Gantt View', icon: ChartGantt, pageName: 'gantt-view' },
    { path: '/agenda-cal', label: 'Agenda Cal', icon: CalendarRange, pageName: 'agenda-cal' },
    { path: '/log-cal', label: 'Log Cal', icon: CalendarClock, pageName: 'log-cal' },
    { path: '/team-slots', label: 'Team Slots', icon: CalendarCheck, pageName: 'team-slots', requireAdmin: true },
  ];

  const accItems = [
    { path: '/invoices', label: 'Invoices', icon: FileText, pageName: 'invoices' },
    { path: '/payments', label: 'Payments', icon: DollarSign, pageName: 'payments' },
    { path: '/wages', label: 'Wages', icon: Wallet, pageName: 'wages' },
  ];

  const configItems = [
    { path: '/clients', label: 'Clients', icon: Users, pageName: 'clients' },
    { path: '/employees', label: 'Employees', icon: UserCheck, pageName: 'employees' },
    { path: '/services', label: 'Services', icon: Settings, pageName: 'services' },
    { path: '/roles', label: 'Roles', icon: User, pageName: 'roles', requireSuperAdmin: true },
  ];

  // Filter items based on actual database privileges
  const visibleMainNavItems = mainNavItems.filter(item => {
    const access = hasPageAccess(item.pageName);
    console.log(`Navigation filtering ${item.label} (${item.pageName}):`, access);
    return access;
  });

  const visibleTaskforceItems = taskforceItems.filter(item => {
    // For the new pages, we'll use the same access logic as tasks
    if (['buzman', 'skillman', 'cman', 'citman', 'myself'].includes(item.pageName)) {
      return userRole === 'admin' || 
             user?.email === 'yugandhar@whiteindia.in' || 
             hasPageAccess('tasks');
    }
    const access = hasPageAccess(item.pageName);
    console.log(`Taskforce filtering ${item.label} (${item.pageName}):`, access);
    return access;
  });

  const visibleGoalTrackItems = goalTrackItems.filter(item => {
    if (item.requireAdmin) {
      // For admin-only pages, we need to check user role
      return true; // Let the ProtectedRoute handle the actual admin check
    }
    const access = hasPageAccess(item.pageName);
    console.log(`GoalTrack filtering ${item.label} (${item.pageName}):`, access);
    return access;
  });

  const visiblePlannerItems = plannerItems.filter(item => {
    const access = hasPageAccess(item.pageName);
    console.log(`Planner filtering ${item.label} (${item.pageName}):`, access);
    return access;
  });

  const visibleTrakTeamItems = trakTeamItems.filter(item => {
    const access = hasPageAccess(item.pageName);
    console.log(`TrakTeam filtering ${item.label} (${item.pageName}):`, access);
    return access;
  });

  const visibleAccItems = accItems.filter(item => {
    const access = hasPageAccess(item.pageName);
    console.log(`ACC filtering ${item.label} (${item.pageName}):`, access);
    return access;
  });

  const visibleConfigItems = configItems.filter(item => {
    if (item.requireSuperAdmin) {
      // For super admin-only pages, we need to check user role
      return true; // Let the ProtectedRoute handle the actual super admin check
    }
    const access = hasPageAccess(item.pageName);
    console.log(`Config filtering ${item.label} (${item.pageName}):`, access);
    return access;
  });

  // Check if dropdowns should be shown
  const shouldShowTaskforceMenu = visibleTaskforceItems.length > 0;
  const shouldShowGoalTrackMenu = visibleGoalTrackItems.length > 0;
  const shouldShowPlannerMenu = visiblePlannerItems.length > 0;
  const shouldShowTrakTeamMenu = visibleTrakTeamItems.length > 0;
  const shouldShowAdminMenu = visibleAccItems.length > 0 || visibleConfigItems.length > 0;

  const isActive = (path: string) => location.pathname === path;

  // Show loading state while auth or privileges are being fetched
  if (authLoading || privilegesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Use actual notification count for mobile
  const mobileNotificationCount = totalNotificationCount;

  const handleMobileNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const MobileMenuContent = () => {
    
    return (
    <div className="flex flex-col h-full">
      {/* Mobile Menu Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMobileMenuOpen(false)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-6">
          {/* Notes - before Main navigation */}
          {hasPageAccess('tasks') && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
              <div className="space-y-1">
                {notesItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleMobileNavigation(item.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                        isActive(item.path)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                 <Button
                   className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-green-600 hover:bg-green-700 text-white"
                   onClick={() => setIsQuickTaskDialogOpen(true)}
                 >
                   <Plus className="h-4 w-4" />
                   <span>QuickTask</span>
                 </Button>
                 
                 {/* WorkloadCal - added to mobile navigation */}
                 {hasPageAccess('workload-cal') && (
                   <button
                     onClick={() => handleMobileNavigation('/workload-cal')}
                     className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                       isActive('/workload-cal')
                         ? 'bg-blue-100 text-blue-700'
                         : 'text-gray-700 hover:bg-gray-100'
                     }`}
                   >
                     <CalendarDays className="h-4 w-4" />
                     <span>WorkloadCal</span>
                   </button>
                 )}
               </div>
             </div>
           )}

          {/* Main navigation items (Dashboard, Projects only) */}
          {visibleMainNavItems.slice(0, 2).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Main</h3>
              <div className="space-y-1">
                {visibleMainNavItems.slice(0, 2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleMobileNavigation(item.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                        isActive(item.path)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {shouldShowTaskforceMenu && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Taskforce</h3>
              <div className="space-y-1">
                {visibleTaskforceItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleMobileNavigation(item.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                        isActive(item.path)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sprints - moved next to Taskforce */}
          {hasPageAccess('sprints') && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Planning</h3>
              <div className="space-y-1">
                <Link
                  key={sprintsNavItem.path}
                  to={sprintsNavItem.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                    isActive(sprintsNavItem.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>{sprintsNavItem.label}</span>
                </Link>
              </div>
            </div>
          )}

          {shouldShowGoalTrackMenu && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">GoalTrack</h3>
              <div className="space-y-1">
                {visibleGoalTrackItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleMobileNavigation(item.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                        isActive(item.path)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {shouldShowPlannerMenu && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Planner</h3>
              <div className="space-y-1">
                {visiblePlannerItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleMobileNavigation(item.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                        isActive(item.path)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {shouldShowTrakTeamMenu && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">TrakTeam</h3>
              <div className="space-y-1">
                {visibleTrakTeamItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleMobileNavigation(item.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                        isActive(item.path)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {shouldShowAdminMenu && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Admin</h3>
              <div className="space-y-1">
                {visibleAccItems.length > 0 && (
                  <>
                    <div className="text-xs font-medium text-gray-400 px-3 py-1">Accounting</div>
                    {visibleAccItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => handleMobileNavigation(item.path)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                            isActive(item.path)
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </>
                )}
                {visibleConfigItems.length > 0 && (
                  <>
                    <div className="text-xs font-medium text-gray-400 px-3 py-1 mt-2">Configuration</div>
                    {visibleConfigItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => handleMobileNavigation(item.path)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                            isActive(item.path)
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4 space-y-2 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {user?.email ? getInitials(user.email) : 'U'}
              </AvatarFallback>
            </Avatar>
            <NotificationBadge count={mobileNotificationCount} />
          </div>
          <div className="text-sm text-gray-600 truncate">
            {user?.email}
          </div>
        </div>
        <Button variant="outline" onClick={signOut} className="w-full">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
    );
  };

  const DesktopNavigation = () => {
    const { 
      totalNotificationCount, 
      dueSoonTasks, 
      overdueTasks,
      allDueSoonTasks,
      allOverdueTasks,
      upcomingSprintDeadlines,
      allUpcomingSprintDeadlines,
      upcomingTaskSlots,
      allUpcomingTaskSlots,
      markAllAsRead,
      markAsRead,
      setNotifiedItems
    } = useReminderNotifications();

    const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

    const handleMarkAllAsRead = async () => {
      setIsMarkingAsRead(true);
      try {
        await markAllAsRead();
      } catch (error) {
        console.error('Failed to mark all as read:', error);
      } finally {
        setIsMarkingAsRead(false);
      }
    };

    return (
    <header className="bg-white shadow-sm border-b sticky top-0 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
        <div className="flex justify-between items-center h-16 min-w-0">
          <div className="hidden md:flex items-center space-x-2 flex-1 justify-center min-w-0 overflow-hidden">
            {/* Main navigation items (Home, Projects only) */}
            {visibleMainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${
                    isActive(item.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Notes - dropdown menu, after Projects */}
            {hasPageAccess('tasks') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0">
                    <StickyNote className="h-4 w-4" />
                    <span>Notes</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border shadow-lg" style={{ zIndex: 9999 }}>
                  {notesItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                            isActive(item.path)
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* QuickTask - icon only, next to Sticky Notes */}
            {hasPageAccess('tasks') && (
              <Button
                className="flex items-center justify-center w-8 h-8 rounded-md text-sm font-medium transition-colors flex-shrink-0 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setIsQuickTaskDialogOpen(true)}
                title="QuickTask"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}

            {/* WorkloadCal - icon only, after Sticky Notes */}
            {hasPageAccess('workload-cal') && (
              <Link
                to="/workload-cal"
                className={`flex items-center justify-center w-8 h-8 rounded-md text-sm font-medium transition-colors flex-shrink-0 border ${
                  isActive('/workload-cal')
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 border-gray-200'
                }`}
                title="Workload Calendar"
              >
                <CalendarDays className="h-4 w-4" />
              </Link>
            )}
            
            {shouldShowTaskforceMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0">
                    <Users2 className="h-4 w-4" />
                    <span>Taskforce</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border shadow-lg" style={{ zIndex: 9999 }}>
                  {visibleTaskforceItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                            isActive(item.path)
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Sprints - as a main tab after Taskforce */}
            {hasPageAccess('sprints') && (
              <Link
                key={sprintsNavItem.path}
                to={sprintsNavItem.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${
                  isActive(sprintsNavItem.path)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>{sprintsNavItem.label}</span>
              </Link>
            )}

            {/* GoalTrack, Planner, TrakTeam, Admin, etc. */}
            {shouldShowGoalTrackMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0">
                    <Target className="h-4 w-4" />
                    <span>GoalTrack</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border shadow-lg" style={{ zIndex: 9998 }}>
                  {visibleGoalTrackItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                            isActive(item.path)
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {shouldShowPlannerMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0">
                    <ClipboardList className="h-4 w-4" />
                    <span>Planner</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border shadow-lg" style={{ zIndex: 9997 }}>
                  {visiblePlannerItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                            isActive(item.path)
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {shouldShowTrakTeamMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0">
                    <Calendar className="h-4 w-4" />
                    <span>TrakTeam</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border shadow-lg" style={{ zIndex: 9996 }}>
                  {visibleTrakTeamItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                            isActive(item.path)
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {shouldShowAdminMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0">
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border shadow-lg" style={{ zIndex: 9995 }}>
                  {visibleAccItems.length > 0 && (
                    <>
                      <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">Accounting</div>
                      {visibleAccItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <DropdownMenuItem key={item.path} asChild>
                            <Link
                              to={item.path}
                              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                                isActive(item.path)
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                      {visibleConfigItems.length > 0 && <DropdownMenuSeparator />}
                    </>
                  )}
                  {visibleConfigItems.length > 0 && (
                    <>
                      <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">Configuration</div>
                      {visibleConfigItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <DropdownMenuItem key={item.path} asChild>
                            <Link
                              to={item.path}
                              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                                isActive(item.path)
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {user?.email ? getInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <NotificationBadge count={totalNotificationCount} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border shadow-lg w-80" style={{ zIndex: 9993 }}>
                {/* User Info */}
                <div className="px-3 py-2 border-b">
                  <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                </div>

                {/* Notifications Section */}
                {totalNotificationCount > 0 && (
                  <>
                    <div className="px-3 py-2 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {totalNotificationCount}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={handleMarkAllAsRead}
                            disabled={isMarkingAsRead}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {isMarkingAsRead ? 'Marking...' : 'Mark all read'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      <ScrollArea className="h-full">
                        {/* Due Soon Tasks */}
                        {allDueSoonTasks.length > 0 && (
                          <div className="px-3 py-2">
                            <h4 className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due Soon ({allDueSoonTasks.length})
                            </h4>
                            <div className="space-y-2">
                              {allDueSoonTasks.slice(0, 5).map((task) => {
                                const isRead = !dueSoonTasks.find(t => t.id === task.id);
                                return (
                                  <div 
                                    key={task.id} 
                                    className={`flex items-start gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                                      isRead 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                    }`}
                                    onClick={() => {
                                      markAsRead('task_reminder', task.id);
                                      navigate('/alltasks');
                                    }}
                                  >
                                    <AlertTriangle className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      isRead ? 'text-gray-500' : 'text-blue-600'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${
                                        isRead ? 'text-gray-500' : 'text-gray-900'
                                      }`}>{task.name}</p>
                                      <p className={`text-xs ${
                                        isRead ? 'text-gray-400' : 'text-blue-600'
                                      }`}>
                                        {formatToIST(task.reminder_datetime, 'h:mm a')}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {allDueSoonTasks.length > 5 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                  +{allDueSoonTasks.length - 5} more due soon
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Overdue Tasks */}
                        {allOverdueTasks.length > 0 && (
                          <div className="px-3 py-2">
                            <h4 className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue ({allOverdueTasks.length})
                            </h4>
                            <div className="space-y-2">
                              {allOverdueTasks.slice(0, 5).map((task) => {
                                const isRead = !overdueTasks.find(t => t.id === task.id);
                                return (
                                  <div 
                                    key={task.id} 
                                    className={`flex items-start gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                                      isRead 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                                    }`}
                                    onClick={() => {
                                      markAsRead('task_reminder', task.id);
                                      navigate('/alltasks');
                                    }}
                                  >
                                    <AlertTriangle className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      isRead ? 'text-gray-500' : 'text-red-600'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${
                                        isRead ? 'text-gray-500' : 'text-gray-900'
                                      }`}>{task.name}</p>
                                      <p className={`text-xs ${
                                        isRead ? 'text-gray-400' : 'text-red-600'
                                      }`}>
                                        Overdue since {formatToIST(task.reminder_datetime, 'h:mm a')}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {allOverdueTasks.length > 5 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                  +{allOverdueTasks.length - 5} more overdue
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Overdue Task Slots */}
                        {allOverdueTaskSlots.length > 0 && (
                          <div className="px-3 py-2">
                            <h4 className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Overdue Slots ({allOverdueTaskSlots.length})
                            </h4>
                            <div className="space-y-2">
                              {allOverdueTaskSlots.slice(0, 5).map((slot) => {
                                const isRead = !overdueTaskSlots.find(s => s.id === slot.id);
                                return (
                                  <div 
                                    key={slot.id} 
                                    className={`flex items-start gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                                      isRead 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                                    }`}
                                    onClick={() => {
                                      markAsRead('task_slot', slot.id);
                                      navigate('/alltasks');
                                    }}
                                  >
                                    <Clock className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      isRead ? 'text-gray-500' : 'text-red-600'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${
                                        isRead ? 'text-gray-500' : 'text-gray-900'
                                      }`}>{slot.name}</p>
                                      <p className={`text-xs ${
                                        isRead ? 'text-gray-400' : 'text-red-600'
                                      }`}>
                                        Overdue since {formatToIST(slot.slot_start_datetime, 'h:mm a')}
                                        {slot.project && (
                                          <span className="text-gray-500"> • {slot.project.name}</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {allOverdueTaskSlots.length > 5 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                  +{allOverdueTaskSlots.length - 5} more overdue slots
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Sprint Deadlines */}
                        {allUpcomingSprintDeadlines.length > 0 && (
                          <div className="px-3 py-2">
                            <h4 className="text-xs font-medium text-orange-600 mb-2 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Sprint Deadlines ({allUpcomingSprintDeadlines.length})
                            </h4>
                            <div className="space-y-2">
                              {allUpcomingSprintDeadlines.slice(0, 5).map((sprint) => {
                                const isRead = !upcomingSprintDeadlines.find(s => s.id === sprint.id);
                                return (
                                  <div 
                                    key={sprint.id} 
                                    className={`flex items-start gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                                      isRead 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                                    }`}
                                    onClick={() => {
                                      markAsRead('sprint_deadline', sprint.id);
                                      navigate('/sprints');
                                    }}
                                  >
                                    <Calendar className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      isRead ? 'text-gray-500' : 'text-orange-600'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${
                                        isRead ? 'text-gray-500' : 'text-gray-900'
                                      }`}>{sprint.title}</p>
                                      <p className={`text-xs ${
                                        isRead ? 'text-gray-400' : 'text-orange-600'
                                      }`}>
                                        Due {formatToIST(sprint.deadline, 'MMM d, h:mm a')}
                                        {sprint.project && (
                                          <span className="text-gray-500"> • {sprint.project.name}</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {allUpcomingSprintDeadlines.length > 5 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                  +{allUpcomingSprintDeadlines.length - 5} more deadlines
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Overdue Sprint Deadlines */}
                        {allOverdueSprintDeadlines.length > 0 && (
                          <div className="px-3 py-2">
                            <h4 className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Overdue Sprint Deadlines ({allOverdueSprintDeadlines.length})
                            </h4>
                            <div className="space-y-2">
                              {allOverdueSprintDeadlines.slice(0, 5).map((sprint) => {
                                const isRead = !overdueSprintDeadlines.find(s => s.id === sprint.id);
                                return (
                                  <div 
                                    key={sprint.id} 
                                    className={`flex items-start gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                                      isRead 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                                    }`}
                                    onClick={() => {
                                      markAsRead('sprint_deadline', sprint.id);
                                      navigate('/sprints');
                                    }}
                                  >
                                    <Calendar className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      isRead ? 'text-gray-500' : 'text-red-600'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${
                                        isRead ? 'text-gray-500' : 'text-gray-900'
                                      }`}>{sprint.title}</p>
                                      <p className={`text-xs ${
                                        isRead ? 'text-gray-400' : 'text-red-600'
                                      }`}>
                                        Overdue since {formatToIST(sprint.deadline, 'MMM d, h:mm a')}
                                        {sprint.project && (
                                          <span className="text-gray-500"> • {sprint.project.name}</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {allOverdueSprintDeadlines.length > 5 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                  +{allOverdueSprintDeadlines.length - 5} more overdue deadlines
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Task Slots */}
                        {allUpcomingTaskSlots.length > 0 && (
                          <div className="px-3 py-2">
                            <h4 className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Task Slots ({allUpcomingTaskSlots.length})
                            </h4>
                            <div className="space-y-2">
                              {allUpcomingTaskSlots.slice(0, 5).map((slot) => {
                                const isRead = !upcomingTaskSlots.find(s => s.id === slot.id);
                                return (
                                  <div 
                                    key={slot.id} 
                                    className={`flex items-start gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                                      isRead 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                                    }`}
                                    onClick={() => {
                                      markAsRead('task_slot', slot.id);
                                      navigate('/alltasks');
                                    }}
                                  >
                                    <Clock className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      isRead ? 'text-gray-500' : 'text-purple-600'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${
                                        isRead ? 'text-gray-500' : 'text-gray-900'
                                      }`}>{slot.name}</p>
                                      <p className={`text-xs ${
                                        isRead ? 'text-gray-400' : 'text-purple-600'
                                      }`}>
                                        Starts {formatToIST(slot.slot_start_datetime, 'h:mm a')}
                                        {slot.project && (
                                          <span className="text-gray-500"> • {slot.project.name}</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {allUpcomingTaskSlots.length > 5 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                  +{allUpcomingTaskSlots.length - 5} more slots
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </ScrollArea>
                    </div>

                    <DropdownMenuSeparator />
                  </>
                )}

                {/* No Notifications */}
                {totalNotificationCount === 0 && (
                  <div className="px-3 py-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No notifications</p>
                    <p className="text-xs text-gray-400">You're all caught up!</p>
                  </div>
                )}

                {/* Sign Out */}
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings/telegram-notifications" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    <span>Telegram Notifications</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings/telegram-bot-admin" className="flex items-center gap-2">
                    <Settings className="h-4 w-4 mr-2" />
                    <span>Telegram Bot Admin</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
    );
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="flex justify-between items-center h-16 px-4">
            <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="h-[85vh]">
                <MobileMenuContent />
              </DrawerContent>
            </Drawer>
            
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {user?.email ? getInitials(user.email) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <NotificationBadge count={mobileNotificationCount} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border shadow-lg w-80" style={{ zIndex: 9993 }}>
                  {/* User Info */}
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                  </div>

                  {/* Notifications Section */}
                  {totalNotificationCount > 0 && (
                    <>
                      <div className="px-3 py-2 border-b bg-gray-50">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              {totalNotificationCount}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={handleMarkAllAsRead}
                              disabled={isMarkingAsRead}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              {isMarkingAsRead ? 'Marking...' : 'Mark all read'}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <ScrollArea className="max-h-64">
                        {/* Due Soon Tasks */}
                        {allDueSoonTasks.length > 0 && (
                          <div className="px-3 py-2">
                            <h4 className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due Soon ({allDueSoonTasks.length})
                            </h4>
                            <div className="space-y-2">
                              {allDueSoonTasks.slice(0, 5).map((task) => {
                                const isRead = !dueSoonTasks.find(t => t.id === task.id);
                                return (
                                  <div 
                                    key={task.id} 
                                    className={`flex items-start gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                                      isRead 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                    }`}
                                    onClick={() => {
                                      // Mark this specific task as read
                                      markAsRead('task_reminder', task.id);
                                      // Navigate to tasks page
                                      navigate('/alltasks');
                                    }}
                                  >
                                    <AlertTriangle className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      isRead ? 'text-gray-500' : 'text-blue-600'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${
                                        isRead ? 'text-gray-500' : 'text-gray-900'
                                      }`}>{task.name}</p>
                                      <p className={`text-xs ${
                                        isRead ? 'text-gray-400' : 'text-blue-600'
                                      }`}>
                                        {formatToIST(task.reminder_datetime, 'h:mm a')}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {allDueSoonTasks.length > 5 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                  +{allDueSoonTasks.length - 5} more due soon
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Overdue Tasks */}
                        {allOverdueTasks.length > 0 && (
                          <div className="px-3 py-2">
                            <h4 className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue ({allOverdueTasks.length})
                            </h4>
                            <div className="space-y-2">
                              {allOverdueTasks.slice(0, 5).map((task) => {
                                const isRead = !overdueTasks.find(t => t.id === task.id);
                                return (
                                  <div 
                                    key={task.id} 
                                    className={`flex items-start gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                                      isRead 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                                    }`}
                                    onClick={() => {
                                      // Mark this specific task as read
                                      markAsRead('task_reminder', task.id);
                                      // Navigate to tasks page
                                      navigate('/alltasks');
                                    }}
                                  >
                                    <AlertTriangle className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      isRead ? 'text-gray-500' : 'text-red-600'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${
                                        isRead ? 'text-gray-500' : 'text-gray-900'
                                      }`}>{task.name}</p>
                                      <p className={`text-xs ${
                                        isRead ? 'text-gray-400' : 'text-red-600'
                                      }`}>
                                        Overdue since {formatToIST(task.reminder_datetime, 'h:mm a')}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {allOverdueTasks.length > 5 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                  +{allOverdueTasks.length - 5} more overdue
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Sprint Deadlines */}
                        {allUpcomingSprintDeadlines.length > 0 && (
                          <div className="px-3 py-2">
                            <h4 className="text-xs font-medium text-orange-600 mb-2 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Sprint Deadlines ({allUpcomingSprintDeadlines.length})
                            </h4>
                            <div className="space-y-2">
                              {allUpcomingSprintDeadlines.slice(0, 5).map((sprint) => {
                                const isRead = !upcomingSprintDeadlines.find(s => s.id === sprint.id);
                                return (
                                  <div 
                                    key={sprint.id} 
                                    className={`flex items-start gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                                      isRead 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                                    }`}
                                    onClick={() => {
                                      // Mark this specific sprint as read
                                      markAsRead('sprint_deadline', sprint.id);
                                      // Navigate to sprints page
                                      navigate('/sprints');
                                    }}
                                  >
                                    <Calendar className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      isRead ? 'text-gray-500' : 'text-orange-600'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${
                                        isRead ? 'text-gray-500' : 'text-gray-900'
                                      }`}>{sprint.title}</p>
                                      <p className={`text-xs ${
                                        isRead ? 'text-gray-400' : 'text-orange-600'
                                      }`}>
                                        Due {formatToIST(sprint.deadline, 'MMM d, h:mm a')}
                                        {sprint.project && (
                                          <span className="text-gray-500"> • {sprint.project.name}</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {allUpcomingSprintDeadlines.length > 5 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                  +{allUpcomingSprintDeadlines.length - 5} more deadlines
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Task Slots */}
                        {allUpcomingTaskSlots.length > 0 && (
                          <div className="px-3 py-2">
                            <h4 className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Task Slots ({allUpcomingTaskSlots.length})
                            </h4>
                            <div className="space-y-2">
                              {allUpcomingTaskSlots.slice(0, 5).map((slot) => {
                                const isRead = !upcomingTaskSlots.find(s => s.id === slot.id);
                                return (
                                  <div 
                                    key={slot.id} 
                                    className={`flex items-start gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                                      isRead 
                                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                                        : 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                                    }`}
                                    onClick={() => {
                                      // Mark this specific slot as read
                                      markAsRead('task_slot', slot.id);
                                      // Navigate to tasks page
                                      navigate('/alltasks');
                                    }}
                                  >
                                    <Clock className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      isRead ? 'text-gray-500' : 'text-purple-600'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium truncate ${
                                        isRead ? 'text-gray-500' : 'text-gray-900'
                                      }`}>{slot.name}</p>
                                      <p className={`text-xs ${
                                        isRead ? 'text-gray-400' : 'text-purple-600'
                                      }`}>
                                        Starts {formatToIST(slot.slot_start_datetime, 'h:mm a')}
                                        {slot.project && (
                                          <span className="text-gray-500"> • {slot.project.name}</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                              {allUpcomingTaskSlots.length > 5 && (
                                <p className="text-xs text-gray-500 text-center py-1">
                                  +{allUpcomingTaskSlots.length - 5} more slots
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </ScrollArea>

                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* No Notifications */}
                  {totalNotificationCount === 0 && (
                    <div className="px-3 py-4 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications</p>
                      <p className="text-xs text-gray-400">You're all caught up!</p>
                    </div>
                  )}

                  {/* Sign Out */}
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings/telegram-notifications" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      <span>Telegram Notifications</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings/telegram-bot-admin" className="flex items-center gap-2">
                      <Settings className="h-4 w-4 mr-2" />
                      <span>Telegram Bot Admin</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        
        <main className="w-full">
          {children}
        </main>
        
        {/* QuickTask Dialog for Mobile */}
        <TaskCreateDialog
          isOpen={isQuickTaskDialogOpen}
          onClose={() => setIsQuickTaskDialogOpen(false)}
          onSuccess={() => {
            setIsQuickTaskDialogOpen(false);
            navigate('/workload-cal');
          }}
          defaultProjectName="Miscellanious-Quick-Temp-Orglater"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DesktopNavigation />
      <main className="w-full">
        {children}
      </main>
      
      {/* QuickTask Dialog */}
      <TaskCreateDialog
        isOpen={isQuickTaskDialogOpen}
        onClose={() => setIsQuickTaskDialogOpen(false)}
        onSuccess={() => {
          setIsQuickTaskDialogOpen(false);
          navigate('/workload-cal');
        }}
        defaultProjectName="Miscellanious-Quick-Temp-Orglater"
      />
    </div>
  );
};

export default Navigation;
