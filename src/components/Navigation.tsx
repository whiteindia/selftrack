
import React from 'react';
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
  Users2,
  UserCog,
  Users as UsersIcon,
  UserPlus,
  UserX,
  PersonStanding
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
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import { useIsMobile } from '@/hooks/use-mobile';

const Navigation = ({ children }: { children?: React.ReactNode }) => {
  const { signOut, user, userRole } = useAuth();
  const { hasPageAccess, loading: privilegesLoading } = usePrivileges();
  const location = useLocation();
  const isMobile = useIsMobile();

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: Home, pageName: 'dashboard' },
    { path: '/projects', label: 'Projects', icon: FolderOpen, pageName: 'projects' },
    { path: '/sprints', label: 'Sprints', icon: Calendar, pageName: 'sprints' },
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
    { path: '/workload-cal', label: 'Workload Cal', icon: CalendarDays, pageName: 'workload-cal' },
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

  const isActive = (path: string) => location.pathname === path;

  // Show loading state while privileges are being fetched
  if (privilegesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const MobileMenuContent = () => (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-6">
          {/* Main navigation items (Dashboard, Projects only) */}
          {visibleMainNavItems.slice(0, 2).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Main</h3>
              <div className="space-y-1">
                {visibleMainNavItems.slice(0, 2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
              </div>
            </div>
          )}

          {/* Sprints - moved next to Taskforce */}
          {visibleMainNavItems.slice(2).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Planning</h3>
              <div className="space-y-1">
                {visibleMainNavItems.slice(2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
              </div>
            </div>
          )}

          {visibleConfigItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Configuration</h3>
              <div className="space-y-1">
                {visibleConfigItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4 space-y-2 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" />
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {user?.email ? getInitials(user.email) : 'U'}
            </AvatarFallback>
          </Avatar>
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

  const DesktopNavigation = () => (
    <header className="bg-white shadow-sm border-b sticky top-0 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
        <div className="flex justify-between items-center h-16 min-w-0">
          <div className="hidden md:flex items-center space-x-6 flex-1 justify-center min-w-0 overflow-hidden">
            {/* Main navigation items (Dashboard, Projects only) */}
            {visibleMainNavItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${
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
            
            {shouldShowTaskforceMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
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

            {/* Sprints - moved next to Taskforce */}
            {visibleMainNavItems.slice(2).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${
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

            {shouldShowGoalTrackMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
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
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
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
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
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
            
            {visibleConfigItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
                    <Settings className="h-4 w-4" />
                    <span>Config</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border shadow-lg" style={{ zIndex: 9995 }}>
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {user?.email ? getInitials(user.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border shadow-lg w-48" style={{ zIndex: 9994 }}>
                <div className="px-3 py-2 border-b">
                  <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                </div>
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="flex justify-between items-center h-16 px-4">
            <Drawer>
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
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {user?.email ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
        
        <main className="w-full">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DesktopNavigation />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
};

export default Navigation;
