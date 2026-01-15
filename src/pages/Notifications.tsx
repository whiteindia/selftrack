import React from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CalendarClock, ListChecks } from 'lucide-react';
import { useReminderNotifications } from '@/hooks/useReminderNotifications';
import { formatToIST } from '@/utils/timezoneUtils';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const navigate = useNavigate();
  const {
    totalNotificationCount,
    allDueSoonTasks,
    allOverdueTasks,
    allUpcomingSprintDeadlines,
    allOverdueSprintDeadlines,
    allUpcomingTaskSlots,
    allOverdueTaskSlots,
    markAsRead,
    markAllAsRead,
  } = useReminderNotifications();

  return (
    <Navigation>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            <h1 className="text-2xl font-semibold">Notifications</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={totalNotificationCount === 0}
          >
            Mark all read
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Total notifications: <Badge variant="secondary" className="ml-1">{totalNotificationCount}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Due Soon
                <Badge variant="secondary" className="ml-1">{allDueSoonTasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allDueSoonTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground">No due-soon tasks</div>
              ) : (
                allDueSoonTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-md border bg-blue-50/60 cursor-pointer hover:bg-blue-100"
                    onClick={() => {
                      markAsRead('due_soon', task.id);
                      navigate('/alltasks');
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{task.name}</div>
                      <div className="text-xs text-blue-700">
                        {formatToIST(task.reminder_datetime, 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Overdue Tasks
                <Badge variant="secondary" className="ml-1">{allOverdueTasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allOverdueTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground">No overdue tasks</div>
              ) : (
                allOverdueTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-md border bg-red-50/60 cursor-pointer hover:bg-red-100"
                    onClick={() => {
                      markAsRead('overdue', task.id);
                      navigate('/alltasks');
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{task.name}</div>
                      <div className="text-xs text-red-700">
                        {formatToIST(task.reminder_datetime, 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-600" />
                Sprint Deadlines
                <Badge variant="secondary" className="ml-1">{allUpcomingSprintDeadlines.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allUpcomingSprintDeadlines.length === 0 ? (
                <div className="text-sm text-muted-foreground">No upcoming sprint deadlines</div>
              ) : (
                allUpcomingSprintDeadlines.map(sprint => (
                  <div
                    key={sprint.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-md border bg-amber-50/60 cursor-pointer hover:bg-amber-100"
                    onClick={() => {
                      markAsRead('sprint_deadline', sprint.id);
                      navigate('/sprints');
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{sprint.title}</div>
                      <div className="text-xs text-amber-700">
                        {new Date(sprint.deadline).toLocaleString()}
                      </div>
                    </div>
                    <CalendarClock className="h-4 w-4 text-amber-600" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Overdue Sprint Deadlines
                <Badge variant="secondary" className="ml-1">{allOverdueSprintDeadlines.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allOverdueSprintDeadlines.length === 0 ? (
                <div className="text-sm text-muted-foreground">No overdue sprint deadlines</div>
              ) : (
                allOverdueSprintDeadlines.map(sprint => (
                  <div
                    key={sprint.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-md border bg-red-50/60 cursor-pointer hover:bg-red-100"
                    onClick={() => {
                      markAsRead('overdue', sprint.id);
                      navigate('/sprints');
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{sprint.title}</div>
                      <div className="text-xs text-red-700">
                        {new Date(sprint.deadline).toLocaleString()}
                      </div>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                Task Time Slots
                <Badge variant="secondary" className="ml-1">{allUpcomingTaskSlots.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allUpcomingTaskSlots.length === 0 ? (
                <div className="text-sm text-muted-foreground">No upcoming task slots</div>
              ) : (
                allUpcomingTaskSlots.map(slot => (
                  <div
                    key={slot.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-md border bg-green-50/60 cursor-pointer hover:bg-green-100"
                    onClick={() => {
                      markAsRead('task_slot', slot.id);
                      navigate('/alltasks');
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{slot.name}</div>
                      <div className="text-xs text-green-700">
                        {formatToIST(slot.slot_start_datetime, 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <Clock className="h-4 w-4 text-green-600" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Overdue Task Slots
                <Badge variant="secondary" className="ml-1">{allOverdueTaskSlots.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allOverdueTaskSlots.length === 0 ? (
                <div className="text-sm text-muted-foreground">No overdue task slots</div>
              ) : (
                allOverdueTaskSlots.map(slot => (
                  <div
                    key={slot.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-md border bg-red-50/60 cursor-pointer hover:bg-red-100"
                    onClick={() => {
                      markAsRead('overdue', slot.id);
                      navigate('/alltasks');
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{slot.name}</div>
                      <div className="text-xs text-red-700">
                        {formatToIST(slot.slot_start_datetime, 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Navigation>
  );
};

export default Notifications;
