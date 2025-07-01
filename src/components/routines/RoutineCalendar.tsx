
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit, Trash2, CalendarIcon } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface Routine {
  id: string;
  title: string;
  frequency: string;
  preferred_days: string[] | null;
  start_date: string;
  preferred_slot_start?: string | null;
  preferred_slot_end?: string | null;
  client: { name: string; id: string };
  project: { name: string; id: string };
}

interface RoutineCompletion {
  routine_id: string;
  completion_date: string;
}

interface RoutineCalendarProps {
  routines: Routine[];
  completions: RoutineCompletion[];
  onToggleCompletion: (routineId: string, date: Date) => void;
  onEditRoutine?: (routine: Routine) => void;
  onDeleteRoutine?: (routineId: string) => void;
}

const RoutineCalendar = ({ 
  routines, 
  completions, 
  onToggleCompletion,
  onEditRoutine,
  onDeleteRoutine
}: RoutineCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const isCompleted = (routineId: string, date: Date) => {
    return completions.some(c => 
      c.routine_id === routineId && 
      c.completion_date === date.toISOString().split('T')[0]
    );
  };

  const shouldShowRoutine = (routine: Routine, date: Date) => {
    if (!routine.preferred_days || routine.preferred_days.length === 0) {
      return true;
    }
    
    const dayName = format(date, 'EEEE').toLowerCase();
    return routine.preferred_days.includes(dayName);
  };

  const getRoutinesForDate = (date: Date) => {
    return routines.filter(routine => shouldShowRoutine(routine, date));
  };

  const getCompletionStats = (date: Date) => {
    const dayRoutines = getRoutinesForDate(date);
    const completedCount = dayRoutines.filter(routine => isCompleted(routine.id, date)).length;
    return { total: dayRoutines.length, completed: completedCount };
  };

  const selectedDateRoutines = getRoutinesForDate(selectedDate);

  // Generate hourly slots (6 AM to 11 PM)
  const generateHourlySlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      slots.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        displayTime: format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')
      });
    }
    return slots;
  };

  // Group routines by time slots
  const groupRoutinesByTimeSlot = (routines: Routine[]) => {
    const routinesWithSlots: Routine[] = [];
    const routinesWithoutSlots: Routine[] = [];
    const slottedRoutines: { [key: string]: Routine[] } = {};

    routines.forEach(routine => {
      if (routine.preferred_slot_start) {
        const startHour = parseInt(routine.preferred_slot_start.split(':')[0]);
        const slotKey = startHour.toString();
        if (!slottedRoutines[slotKey]) {
          slottedRoutines[slotKey] = [];
        }
        slottedRoutines[slotKey].push(routine);
        routinesWithSlots.push(routine);
      } else {
        routinesWithoutSlots.push(routine);
      }
    });

    return { routinesWithSlots, routinesWithoutSlots, slottedRoutines };
  };

  const { routinesWithoutSlots, slottedRoutines } = groupRoutinesByTimeSlot(selectedDateRoutines);
  const hourlySlots = generateHourlySlots();

  const formatTimeSlot = (routine: Routine) => {
    if (routine.preferred_slot_start && routine.preferred_slot_end) {
      return `${routine.preferred_slot_start} - ${routine.preferred_slot_end}`;
    }
    return null;
  };

  const renderRoutineCard = (routine: Routine, showTime: boolean = false) => {
    const completed = isCompleted(routine.id, selectedDate);
    const timeSlot = formatTimeSlot(routine);
    
    return (
      <div key={routine.id} className="border rounded-lg p-3 space-y-2 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-1 leading-tight">
              {routine.title}
            </h4>
            {showTime && timeSlot && (
              <p className="text-xs text-gray-600">
                {timeSlot}
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className="text-xs px-1 py-0">
                {routine.frequency}
              </Badge>
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {routine.client.name}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {onEditRoutine && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => onEditRoutine(routine)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {onDeleteRoutine && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                onClick={() => onDeleteRoutine(routine.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Completed:</span>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0 rounded-full border-2 transition-all",
              completed 
                ? "bg-green-500 border-green-500 text-white hover:bg-green-600" 
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            )}
            onClick={() => onToggleCompletion(routine.id, selectedDate)}
          >
            {completed && <span className="text-xs">✓</span>}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className={cn("p-3 pointer-events-auto")}
                components={{
                  DayContent: ({ date }) => {
                    const stats = getCompletionStats(date);
                    const hasRoutines = stats.total > 0;
                    const allCompleted = hasRoutines && stats.completed === stats.total;
                    const someCompleted = stats.completed > 0;
                    
                    return (
                      <div className="relative w-full h-full flex flex-col items-center justify-center">
                        <span className={cn(
                          "text-sm",
                          isSameDay(date, selectedDate) && "font-bold"
                        )}>
                          {format(date, 'd')}
                        </span>
                        {hasRoutines && (
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1",
                            allCompleted ? "bg-green-500" :
                            someCompleted ? "bg-yellow-500" :
                            "bg-gray-300"
                          )} />
                        )}
                      </div>
                    );
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Selected Date Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>
            Schedule for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateRoutines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No routines scheduled for this day.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Routines without time slots - shown at top */}
              {routinesWithoutSlots.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 border-b pb-1">
                    No Specific Time
                  </h3>
                  <div className="grid gap-3">
                    {routinesWithoutSlots.map(routine => renderRoutineCard(routine, true))}
                  </div>
                </div>
              )}

              {/* Hourly time slots */}
              <div className="space-y-2">
                {hourlySlots.map(slot => {
                  const routinesInSlot = slottedRoutines[slot.hour.toString()] || [];
                  
                  return (
                    <div key={slot.hour} className="flex gap-3">
                      <div className="w-16 flex-shrink-0 text-sm text-gray-500 pt-2">
                        {slot.displayTime}
                      </div>
                      <div className="flex-1">
                        {routinesInSlot.length > 0 ? (
                          <div className="grid gap-2">
                            {routinesInSlot.map(routine => renderRoutineCard(routine))}
                          </div>
                        ) : (
                          <div className="h-8 border-l-2 border-gray-100"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoutineCalendar;
