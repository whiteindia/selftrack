
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay } from 'date-fns';

interface Routine {
  id: string;
  title: string;
  frequency: string;
  preferred_days: string[] | null;
  start_date: string;
  client: { name: string; id: string };
  project: { name: string; id: string };
}

interface RoutineCompletion {
  routine_id: string;
  completion_date: string;
}

interface RoutineMatrixProps {
  routines: Routine[];
  last7Days: Date[];
  completions: RoutineCompletion[];
  onToggleCompletion: (routineId: string, date: Date) => void;
}

const RoutineMatrix: React.FC<RoutineMatrixProps> = ({
  routines,
  last7Days,
  completions,
  onToggleCompletion
}) => {
  // Check if a routine should show on a specific date
  const shouldShowRoutine = (routine: Routine, date: Date): boolean => {
    const startDate = new Date(routine.start_date);
    if (date < startDate) return false;

    const dayName = format(date, 'EEEE').toLowerCase();
    const preferredDays = routine.preferred_days || [];

    switch (routine.frequency) {
      case 'daily':
        return true;
      case 'weekly_once':
        return preferredDays.length > 0 ? preferredDays.includes(dayName) : dayName === 'monday';
      case 'weekly_twice':
        return preferredDays.includes(dayName);
      case 'monthly_once':
        // Show on first occurrence of preferred day in the month
        return preferredDays.includes(dayName) && date.getDate() <= 7;
      case 'monthly_twice':
        // Show on first and third occurrence of preferred day
        const dayOfMonth = date.getDate();
        return preferredDays.includes(dayName) && (dayOfMonth <= 7 || (dayOfMonth >= 15 && dayOfMonth <= 21));
      case 'yearly_once':
        // Show on the same date each year
        const startMonth = startDate.getMonth();
        const startDay = startDate.getDate();
        return date.getMonth() === startMonth && date.getDate() === startDay;
      default:
        return false;
    }
  };

  // Check if a routine is completed on a specific date
  const isCompleted = (routineId: string, date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return completions.some(c => c.routine_id === routineId && c.completion_date === dateStr);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 sticky left-0 bg-white border-r min-w-[200px] max-w-[200px]">
              Routine
            </th>
            {last7Days.map((date, index) => (
              <th key={index} className="text-center p-3 min-w-[80px]">
                <div className="text-xs text-gray-500">{format(date, 'EEE')}</div>
                <div className="text-sm font-medium">{format(date, 'MMM d')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {routines.map((routine) => (
            <tr key={routine.id} className="border-b hover:bg-gray-50">
              <td className="p-3 sticky left-0 bg-white border-r">
                <div className="space-y-1">
                  <div className="font-medium text-sm truncate" title={routine.title}>
                    {routine.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {routine.project.name}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {routine.frequency.replace('_', ' ')}
                  </Badge>
                </div>
              </td>
              {last7Days.map((date, index) => (
                <td key={index} className="p-3 text-center">
                  {shouldShowRoutine(routine, date) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 text-lg hover:scale-110 transition-transform ${
                        isCompleted(routine.id, date) 
                          ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={() => onToggleCompletion(routine.id, date)}
                    >
                      {isCompleted(routine.id, date) ? '✓' : '?'}
                    </Button>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RoutineMatrix;
