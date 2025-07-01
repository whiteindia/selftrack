
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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

interface RoutineTableProps {
  routines: Routine[];
  last7Days: Date[];
  completions: RoutineCompletion[];
  onToggleCompletion: (routineId: string, date: Date) => void;
  onEditRoutine?: (routine: Routine) => void;
  onDeleteRoutine?: (routineId: string) => void;
}

const RoutineTable = ({ 
  routines, 
  last7Days, 
  completions, 
  onToggleCompletion,
  onEditRoutine,
  onDeleteRoutine
}: RoutineTableProps) => {
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

  if (routines.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No routines found. Click "Add Routine" to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Routine</TableHead>
            <TableHead className="w-[150px]">Client</TableHead>
            <TableHead className="w-[150px]">Project</TableHead>
            <TableHead className="w-[120px]">Frequency</TableHead>
            {last7Days.map((date, index) => (
              <TableHead key={index} className="text-center w-[80px]">
                <div className="text-xs">
                  {format(date, 'EEE')}
                </div>
                <div className="text-xs text-gray-500">
                  {format(date, 'd')}
                </div>
              </TableHead>
            ))}
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routines.map((routine) => (
            <TableRow key={routine.id}>
              <TableCell>
                <div className="font-medium text-sm">{routine.title}</div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {routine.client.name}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {routine.project.name}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {routine.frequency}
                </Badge>
              </TableCell>
              {last7Days.map((date, index) => {
                const completed = isCompleted(routine.id, date);
                const isHighlighted = shouldHighlightDay(routine, date);
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                
                return (
                  <TableCell key={index} className="text-center">
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
                  </TableCell>
                );
              })}
              <TableCell>
                <div className="flex gap-1">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RoutineTable;
