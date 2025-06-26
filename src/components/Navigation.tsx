
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
  CalendarRange
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
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import { useIsMobile } from '@/hooks/use-mobile';

const Navigation = ({ children }: { children?: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const { hasPageAccess, loading: privilegesLoading } = usePrivileges();
  const location = useLocation();
  const isMobile = useIsMobile();

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: Home, pageName: 'dashboard' },
    { path: '/projects', label: 'Projects', icon: FolderOpen, pageName: 'projects' },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare, pageName: 'tasks' },
    { path: '/sprints', label: 'Sprints', icon: Calendar, pageName: 'sprints' },
  ];

  const trakEzyItems = [
    { path: '/gantt-view', label: 'Gantt View', icon: ChartGantt, pageName: 'gantt-view' },
    { path: '/agenda-cal', label: 'Agenda Cal', icon: CalendarRange, pageName: 'agenda-cal' },
    { path: '/log-cal', label: 'Log Cal', icon: CalendarClock, pageName: 'log-cal' },
  ];

  const configItems = [
    { path: '/clients', label: 'Clients', icon: Users, pageName: 'clients' },
    { path: '/services', label: 'Services', icon: Settings, pageName: 'services' },
  ];

  // Filter items based on actual database privileges
  const visibleMainNavItems = mainNavItems.filter(item => {
    const access = hasPageAccess(item.pageName);
    console.log(`Navigation filtering ${item.label} (${item.pageName}):`, access);
    return access;
  });

  const visibleTrakEzyItems = trakEzyItems.filter(item => {
    const access = hasPageAccess(item.pageName);
    console.log(`TrakEzy filtering ${item.label} (${item.pageName}):`, access);
    return access;
  });

  const visibleConfigItems = configItems.filter(item => {
    const access = hasPageAccess(item.pageName);
    console.log(`Config filtering ${item.label} (${item.pageName}):`, access);
    return access;
  });

  // Check if TrakEzy menu should be shown (only if at least one sub-item is visible)
  const shouldShowTrakEzyMenu = visibleTrakEzyItems.length > 0;

  const isActive = (path: string) => location.pathname === path;

  console.log('Navigation - visibleMainNavItems:', visibleMainNavItems.map(item => item.label));
  console.log('Navigation - visibleTrakEzyItems:', visibleTrakEzyItems.map(item => item.label));
  console.log('Navigation - shouldShowTrakEzyMenu:', shouldShowTrakEzyMenu);
  console.log('Navigation - visibleConfigItems:', visibleConfigItems.map(item => item.label));

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
    <div className="p-4 space-y-6">
    
      
      <div className="space-y-4">
        {visibleMainNavItems.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Main</h3>
            <div className="space-y-1">
              {visibleMainNavItems.map((item) => {
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

        {shouldShowTrakEzyMenu && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">TrakEzy</h3>
            <div className="space-y-1">
              {visibleTrakEzyItems.map((item) => {
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

      <div className="border-t pt-4 space-y-2">
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
    <header className="bg-white shadow-sm border-b sticky top-0 z-50 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
        <div className="flex justify-between items-center h-16 min-w-0">
                
          <div className="hidden md:flex items-center space-x-6 flex-1 justify-center min-w-0 overflow-hidden">
            {visibleMainNavItems.map((item) => {
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
            
            {shouldShowTrakEzyMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
                    <Calendar className="h-4 w-4" />
                    <span>TrakEzy</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border shadow-lg z-50">
                  {visibleTrakEzyItems.map((item) => {
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
                <DropdownMenuContent className="bg-white border shadow-lg z-50">
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
              <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50 w-48">
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
      <div className="min-h-screen w-full">
        <header className="bg-white shadow-sm border-b sticky top-0 z-50 w-full overflow-hidden">
          <div className="flex justify-between items-center h-16 px-1 min-w-0">
        
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Menu className="h-6 w-6" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="h-[80vh] overflow-y-auto">
                  <MobileMenuContent />
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </header>
        <main className="p-1 min-w-0">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <DesktopNavigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 min-w-0">
        {children}
      </main>
    </div>
  );
};

export default Navigation;
