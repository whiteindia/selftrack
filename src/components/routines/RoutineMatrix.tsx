
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

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
  onEditRoutine?: (routine: Routine) => void;
  onDeleteRoutine?: (routineId: string) => void;
}

const RoutineMatrix = ({ 
  routines, 
  last7Days, 
  completions, 
  onToggleCompletion,
  onEditRoutine,
  onDeleteRoutine
}: RoutineMatrixProps) => {
  const isCompleted = (routineId: string, date: Date) => {
    return completions.some(c => 
      c.routine_id === routineId && 
      c.completion_date === date.toISOString().split('T')[0]
    );
  };

  const shouldHighlightDay = (routine: Routine, date: Date) => {
    if (!routine.preferred_days || routine.preferred_days.length === 0) {
      return false;
    }
    
    const dayName = format(date, 'EEEE').toLowerCase();
    return routine.preferred_days.includes(dayName);
  };

  return (
    <div className="space-y-4">
      {/* Header with dates */}
      <div className="grid grid-cols-7 gap-1">
        {last7Days.map((date, index) => (
          <div key={index} className="text-center">
            <div className="text-xs font-medium text-gray-700">
              {format(date, 'EEE')}
            </div>
            <div className="text-xs text-gray-500">
              {format(date, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Routine rows */}
      {routines.map((routine) => (
        <div key={routine.id} className="space-y-3 py-3 border-b border-gray-100">
          {/* Title and badges row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight mb-1">
                {routine.title}
              </h3>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {routine.frequency}
                </Badge>
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  {routine.project.name}
                </Badge>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {onEditRoutine && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onEditRoutine(routine)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {onDeleteRoutine && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  onClick={() => onDeleteRoutine(routine.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Completion checkboxes row */}
          <div className="grid grid-cols-7 gap-1">
            {last7Days.map((date, index) => {
              const completed = isCompleted(routine.id, date);
              const isHighlighted = shouldHighlightDay(routine, date);
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
              
              return (
                <div key={index} className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 rounded-full border-2 transition-all",
                      completed 
                        ? "bg-green-500 border-green-500 text-white hover:bg-green-600" 
                        : isHighlighted
                          ? "border-blue-500 bg-blue-50 hover:bg-blue-100"
                          : isPast 
                            ? "border-gray-300 text-gray-400 hover:bg-gray-50"
                            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    )}
                    onClick={() => onToggleCompletion(routine.id, date)}
                  >
                    {completed && <span>✓</span>}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoutineMatrix;
